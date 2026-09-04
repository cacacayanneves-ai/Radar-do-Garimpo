import { chromium, type Browser, type BrowserContext } from "playwright";

// Camada de extração isolada da Biblioteca de Anúncios da Meta.
//
// A Biblioteca de Anúncios (https://www.facebook.com/ads/library/) é pública —
// não precisa de login nem de sessão autenticada. Esta implementação (Opção A
// da spec) navega como um visitante anônimo, com Playwright, e lê o
// HTML/JSON embutido na página.
//
// Se no futuro for necessário migrar para a Ad Library API oficial da Meta
// (Opção B — https://www.facebook.com/ads/library/api/), basta implementar a
// mesma interface `AdLibraryClient` em outro arquivo e trocar o `export` de
// `getAdLibraryClient()` no fim deste arquivo — nada no resto do pipeline
// (scraper/mine.ts) precisa mudar.

export interface AdDetails {
  link: string | null;
  collation: number | null;
  pageId: string | null;
  pageName: string | null;
  adText: string;
}

export interface SearchResultCard {
  libraryId: string;
  adText: string;
  pageName: string | null;
  collationHint: number | null;
}

export interface AdLibraryClient {
  fetchAdDetails(libraryId: string): Promise<AdDetails | null>;
  searchAds(keyword: string, limit?: number): Promise<SearchResultCard[]>;
  searchCompetitionCount(keyword: string): Promise<number | null>;
  close(): Promise<void>;
}

const BASE_URL = "https://www.facebook.com/ads/library/";
const NAV_TIMEOUT_MS = 25_000;

// Espaça as requisições — a Biblioteca de Anúncios pública não é uma API de
// alto throughput, tratamos como alguém navegando manualmente.
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(minMs: number, maxMs: number) {
  return sleep(minMs + Math.random() * (maxMs - minMs));
}

function unescapeJsonString(s: string): string {
  try {
    return JSON.parse(`"${s}"`);
  } catch {
    return s;
  }
}

function g(text: string, key: string): string | null {
  const m = text.match(new RegExp(`"${key}":"(.*?)"`));
  return m ? unescapeJsonString(m[1]) : null;
}

// A página de detalhe de um anúncio (`?id=...`) sempre retorna HTTP 200 com
// o shell completo do app — inclusive quando o id não existe, caso em que a
// página mostra sugestões/anúncios de exemplo que não têm nada a ver com o
// id pedido, mas cujos campos ("page_name", "collation_count" etc.) ainda
// aparecem em algum lugar do HTML. Por isso não dá pra simplesmente pegar o
// primeiro campo "X" da página inteira: é preciso ancorar a busca na
// ocorrência de "ad_archive_id":"<id>" e pegar, para cada campo, a
// ocorrência MAIS PRÓXIMA dessa âncora (testado contra a Biblioteca de
// Anúncios real — o campo relevante pode ficar a milhares de caracteres de
// distância, então uma janela de tamanho fixo não é confiável).
function nearestField(html: string, anchorIdx: number, key: string): string | null {
  const re = new RegExp(`"${key}":"(.*?)"`, "g");
  let best: string | null = null;
  let bestDist = Infinity;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const dist = Math.abs(m.index - anchorIdx);
    if (dist < bestDist) {
      bestDist = dist;
      best = m[1];
    }
  }
  return best !== null ? unescapeJsonString(best) : null;
}

function nearestNumberField(html: string, anchorIdx: number, key: string): number | null {
  const re = new RegExp(`"${key}":(\\d+)`, "g");
  let best: number | null = null;
  let bestDist = Infinity;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const dist = Math.abs(m.index - anchorIdx);
    if (dist < bestDist) {
      bestDist = dist;
      best = parseInt(m[1], 10);
    }
  }
  return best;
}

// A Biblioteca de Anúncios embute o payload de cada card como JSON para
// hidratação client-side. Não há uma estrutura DOM estável para "o texto do
// anúncio X" — a aproximação aqui é procurar o primeiro campo "body"/"text"
// depois da ocorrência do id, dentro de uma janela de caracteres. É
// heurístico por natureza: o Facebook muda esse payload sem aviso, então
// valide o resultado na prática (spec, seção 6.1) antes de confiar 100% nele.
function extractNearbyText(html: string, id: string): string {
  const idx = html.indexOf(`"ad_archive_id":"${id}"`);
  if (idx === -1) return "";
  const window = html.slice(idx, idx + 4000);
  const match = window.match(/"(?:body|text)":"((?:[^"\\]|\\.)*)"/);
  return match ? unescapeJsonString(match[1]) : "";
}

class PlaywrightAdLibraryClient implements AdLibraryClient {
  private browserPromise: Promise<Browser>;
  private contextPromise: Promise<BrowserContext>;

  constructor() {
    this.browserPromise = chromium.launch({ headless: true });
    this.contextPromise = this.browserPromise.then((browser) =>
      browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        locale: "pt-BR",
        viewport: { width: 1366, height: 900 },
      })
    );
  }

  async fetchAdDetails(libraryId: string): Promise<AdDetails | null> {
    const context = await this.contextPromise;
    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}?id=${encodeURIComponent(libraryId)}`, {
        waitUntil: "networkidle",
        timeout: NAV_TIMEOUT_MS,
      });
      await randomDelay(600, 1400);

      const html = await page.content();

      // A página da Biblioteca de Anúncios SEMPRE retorna HTTP 200 com o
      // shell completo do app, mesmo pra um `id` inexistente — inclusive com
      // "page_name"/"collation_count" de anúncios de sugestão que não têm
      // nada a ver com o id pedido. Por isso confirmamos que o `id` pedido
      // está presente como "ad_archive_id" no payload (só assim sabemos que
      // o anúncio existe) e então lemos cada campo pela ocorrência mais
      // próxima dessa âncora — ver `nearestField`/`nearestNumberField`.
      const idMarker = `"ad_archive_id":"${libraryId}"`;
      const idIdx = html.indexOf(idMarker);
      if (idIdx === -1) {
        // Anúncio saiu do ar / id inválido.
        return null;
      }

      const bodyText = await page.innerText("body").catch(() => "");

      return {
        link: nearestField(html, idIdx, "link_url"),
        collation: nearestNumberField(html, idIdx, "collation_count"),
        pageId: nearestField(html, idIdx, "page_id"),
        pageName: nearestField(html, idIdx, "page_name"),
        adText: bodyText,
      };
    } catch {
      return null;
    } finally {
      await page.close();
    }
  }

  async searchAds(keyword: string, limit = 30): Promise<SearchResultCard[]> {
    const context = await this.contextPromise;
    const page = await context.newPage();
    try {
      const url = `${BASE_URL}?active_status=active&ad_type=all&country=BR&q=${encodeURIComponent(
        `"${keyword}"`
      )}&search_type=keyword_unordered&media_type=all`;

      await page.goto(url, { waitUntil: "networkidle", timeout: NAV_TIMEOUT_MS });
      await randomDelay(1000, 2000);

      // Scroll para carregar mais cards (a lista é virtualizada/infinita).
      for (let i = 0; i < 4; i++) {
        await page.mouse.wheel(0, 2400);
        await randomDelay(500, 1000);
      }

      const html = await page.content();

      // O id de cada anúncio aparece embutido no HTML como "ad_archive_id":"<id>".
      const idMatches = Array.from(html.matchAll(/"ad_archive_id":"(\d+)"/g)).map((m) => m[1]);
      const uniqueIds = Array.from(new Set(idMatches)).slice(0, limit);

      const results: SearchResultCard[] = uniqueIds.map((libraryId) => ({
        libraryId,
        adText: extractNearbyText(html, libraryId),
        pageName: null,
        collationHint: null,
      }));

      return results;
    } catch {
      return [];
    } finally {
      await page.close();
    }
  }

  async searchCompetitionCount(keyword: string): Promise<number | null> {
    const context = await this.contextPromise;
    const page = await context.newPage();
    try {
      const url = `${BASE_URL}?active_status=active&ad_type=all&country=BR&q=${encodeURIComponent(
        keyword
      )}&search_type=keyword_unordered&media_type=all`;

      await page.goto(url, { waitUntil: "networkidle", timeout: NAV_TIMEOUT_MS });
      await randomDelay(800, 1600);

      const bodyText = await page.innerText("body").catch(() => "");
      // Padrão típico: "~1.234 resultados" ou "1.234 results".
      const match = bodyText.match(/[~]?\s?([\d.,]+)\s*(resultados|results)/i);
      if (!match) return null;

      const numeric = parseInt(match[1].replace(/[.,]/g, ""), 10);
      return Number.isNaN(numeric) ? null : numeric;
    } catch {
      return null;
    } finally {
      await page.close();
    }
  }

  async close(): Promise<void> {
    const browser = await this.browserPromise;
    await browser.close();
  }
}

export function getAdLibraryClient(): AdLibraryClient {
  return new PlaywrightAdLibraryClient();
}

export { sleep, randomDelay };
