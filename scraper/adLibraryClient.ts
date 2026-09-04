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
  // "start_date" da Biblioteca (timestamp Unix, segundos) — quando o
  // anúncio começou a rodar de verdade ("Veiculação iniciada em"). Null
  // quando o campo não vem na página.
  startDateUnix: number | null;
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
  // Visita a própria página de venda (fora do facebook.com) e retorna
  // título + texto visível. Serve pra três coisas: confirmar que é mesmo
  // uma página de venda (não quiz/blog/loja física/busca vazia), tirar o
  // nome real do produto do <title>, e ler o preço praticado. Null se a
  // página não carregar.
  fetchLandingPage(url: string): Promise<{ title: string; text: string } | null>;
  // Quantos anúncios ativos o anunciante tem no total — lê o "~N
  // resultados" que a própria Biblioteca mostra no topo da página dele.
  // É a medida de "quantos criativos estão rodando" usada tanto pra
  // ofertas novas quanto na revalidação.
  countAdvertiserCreatives(pageId: string): Promise<number | null>;
  // Quantas vezes a Biblioteca de Anúncios respondeu exigindo captcha ou
  // com o payload vazio. Rodando de um IP de datacenter (ex: runner do
  // GitHub Actions) o Facebook trata a requisição diferente de um IP
  // residencial — sem isso não dá pra distinguir "não achou nada" de
  // "fomos bloqueados", já que os dois terminam em zero ofertas.
  getBlockStats(): { captcha: number; emptyPayload: number; navFailures: number };
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
// anúncio X" — a aproximação aqui é procurar o campo de texto do criativo
// (normalmente aninhado como "body":{"text":"..."}, às vezes só "text":"...")
// depois da ocorrência do id, dentro de uma janela de caracteres. É
// heurístico por natureza: o Facebook muda esse payload sem aviso, então
// valide o resultado na prática (spec, seção 6.1) antes de confiar 100% nele.
function extractBodyTextNear(html: string, anchorIdx: number, windowChars = 4000): string {
  const window = html.slice(anchorIdx, anchorIdx + windowChars);
  const match =
    window.match(/"body":\{"text":"((?:[^"\\]|\\.)*)"/) || window.match(/"(?:body|text)":"((?:[^"\\]|\\.)*)"/);
  return match ? unescapeJsonString(match[1]) : "";
}

function extractNearbyText(html: string, id: string): string {
  const idx = html.indexOf(`"ad_archive_id":"${id}"`);
  if (idx === -1) return "";
  return extractBodyTextNear(html, idx);
}

function normalizeCreativeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .slice(0, 100);
}

// "collation_count" só vem preenchido quando o próprio Facebook decide
// "colar" um grupo de anúncios como uma coisa só — pra MUITOS anúncios
// (confirmado ao vivo) esse campo vem null mesmo quando o anunciante está
// rodando várias cópias praticamente idênticas do mesmo criativo, cada uma
// com seu próprio ad_archive_id separado. Quando o campo oficial vem null,
// calculamos um substituto: conta quantos ad_archive_id distintos na mesma
// página têm o texto do criativo praticamente idêntico ao do anúncio alvo.
function countMatchingCreativeCopies(html: string, anchorIdx: number): number | null {
  const targetNorm = normalizeCreativeText(extractBodyTextNear(html, anchorIdx));
  if (!targetNorm) return null;

  const idRe = /"ad_archive_id":"(\d+)"/g;
  const seen = new Set<string>();
  let count = 0;
  let m: RegExpExecArray | null;
  while ((m = idRe.exec(html))) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    if (normalizeCreativeText(extractBodyTextNear(html, m.index)) === targetNorm) count++;
  }
  return count > 0 ? count : null;
}

// O HTML da Biblioteca de Anúncios traz essa flag no payload embutido —
// quando vem `true`, o Facebook está exigindo captcha e nenhum resultado
// real é retornado.
function isCaptchaRequired(html: string): boolean {
  return /"xfb_ad_library_is_captcha_required":true/.test(html);
}

// A Biblioteca mostra "~1.234 resultados" (ou "results") no topo de
// qualquer página de busca — seja busca por palavra-chave (concorrência do
// nicho) ou por anunciante (quantos anúncios ativos ele tem).
function parseResultCount(bodyText: string): number | null {
  const match = bodyText.match(/[~]?\s?([\d.,]+)\s*(resultados|results)/i);
  if (!match) return null;
  const numeric = parseInt(match[1].replace(/[.,]/g, ""), 10);
  return Number.isNaN(numeric) ? null : numeric;
}

class PlaywrightAdLibraryClient implements AdLibraryClient {
  private browserPromise: Promise<Browser>;
  private contextPromise: Promise<BrowserContext>;
  private blockStats = { captcha: 0, emptyPayload: 0, navFailures: 0 };

  getBlockStats() {
    return { ...this.blockStats };
  }

  constructor() {
    // Rodando de um IP de datacenter (runner do GitHub Actions), o Facebook
    // é bem mais propenso a responder com captcha/payload vazio do que de um
    // IP residencial. Não dá pra mudar o IP, mas dá pra não parecer um bot
    // óbvio: desliga a flag de automação do Chromium, manda os headers que
    // um navegador de verdade manda, e usa fuso/idioma do Brasil (a busca é
    // country=BR).
    this.browserPromise = chromium.launch({
      headless: true,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
        "--no-sandbox",
      ],
    });
    this.contextPromise = this.browserPromise.then(async (browser) => {
      const context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        locale: "pt-BR",
        timezoneId: "America/Sao_Paulo",
        viewport: { width: 1366, height: 900 },
        extraHTTPHeaders: {
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        },
      });
      // navigator.webdriver = true entrega que é automação; remove.
      await context.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      });
      return context;
    });
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
      if (isCaptchaRequired(html)) this.blockStats.captcha++;

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

      // "collation_count" vem null pra muitos anúncios mesmo quando o
      // anunciante roda várias cópias do mesmo criativo (validado ao vivo) —
      // nesse caso, calcula o substituto contando cópias com texto idêntico.
      const collation = nearestNumberField(html, idIdx, "collation_count") ?? countMatchingCreativeCopies(html, idIdx);

      return {
        link: nearestField(html, idIdx, "link_url"),
        collation,
        pageId: nearestField(html, idIdx, "page_id"),
        pageName: nearestField(html, idIdx, "page_name"),
        adText: bodyText,
        startDateUnix: nearestNumberField(html, idIdx, "start_date"),
      };
    } catch {
      this.blockStats.navFailures++;
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
      if (isCaptchaRequired(html)) this.blockStats.captcha++;

      // O id de cada anúncio aparece embutido no HTML como "ad_archive_id":"<id>".
      const idMatches = Array.from(html.matchAll(/"ad_archive_id":"(\d+)"/g)).map((m) => m[1]);
      const uniqueIds = Array.from(new Set(idMatches)).slice(0, limit);

      if (uniqueIds.length === 0) this.blockStats.emptyPayload++;

      // Quantos anúncios DESTA página de busca compartilham exatamente o
      // mesmo texto de criativo — é o mesmo cálculo de collation feito na
      // página de detalhe, mas a partir de uma página que sabidamente traz
      // muitos anúncios de uma vez. A página de detalhe nem sempre lista os
      // anúncios relacionados (varia por ambiente/IP), então esse é o sinal
      // mais confiável dos dois.
      const textsById = new Map<string, string>();
      const copiesByText = new Map<string, number>();
      for (const id of uniqueIds) {
        const text = extractNearbyText(html, id);
        textsById.set(id, text);
        const norm = normalizeCreativeText(text);
        if (!norm) continue;
        copiesByText.set(norm, (copiesByText.get(norm) ?? 0) + 1);
      }

      const results: SearchResultCard[] = uniqueIds.map((libraryId) => {
        const adText = textsById.get(libraryId) ?? "";
        const norm = normalizeCreativeText(adText);
        return {
          libraryId,
          adText,
          pageName: null,
          collationHint: norm ? copiesByText.get(norm) ?? null : null,
        };
      });

      return results;
    } catch {
      this.blockStats.navFailures++;
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

      const html = await page.content();
      if (isCaptchaRequired(html)) this.blockStats.captcha++;

      const bodyText = await page.innerText("body").catch(() => "");
      return parseResultCount(bodyText);
    } catch {
      this.blockStats.navFailures++;
      return null;
    } finally {
      await page.close();
    }
  }

  async countAdvertiserCreatives(pageId: string): Promise<number | null> {
    const context = await this.contextPromise;
    const page = await context.newPage();
    try {
      const url = `${BASE_URL}?active_status=active&ad_type=all&country=BR&view_all_page_id=${encodeURIComponent(
        pageId
      )}&search_type=page&media_type=all`;

      await page.goto(url, { waitUntil: "networkidle", timeout: NAV_TIMEOUT_MS });
      await randomDelay(800, 1600);

      const html = await page.content();
      if (isCaptchaRequired(html)) this.blockStats.captcha++;

      // A própria Biblioteca já mostra "~N resultados" no topo da página do
      // anunciante — é o número de anúncios ativos dele. Ler esse número é
      // mais confiável (e mais barato) do que contar os cards carregados,
      // que são paginados e ficam sempre subestimados.
      const bodyText = await page.innerText("body").catch(() => "");
      return parseResultCount(bodyText);
    } catch {
      this.blockStats.navFailures++;
      return null;
    } finally {
      await page.close();
    }
  }

  async fetchLandingPage(url: string): Promise<{ title: string; text: string } | null> {
    const context = await this.contextPromise;
    const page = await context.newPage();
    try {
      // "networkidle" (e não domcontentloaded): muita página de venda
      // renderiza preço e conteúdo por JS depois do DOM inicial. Lendo cedo
      // demais, o preço saía diferente a cada leitura da MESMA página.
      await page.goto(url, { waitUntil: "networkidle", timeout: NAV_TIMEOUT_MS });
      await randomDelay(1200, 2000);
      const [title, text] = await Promise.all([
        page.title().catch(() => ""),
        page.innerText("body").catch(() => ""),
      ]);
      if (!title && !text) return null;
      return { title: title ?? "", text: text ?? "" };
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
