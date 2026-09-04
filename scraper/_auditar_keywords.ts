// Script temporário (não faz parte do pipeline): roda a MESMA busca que o
// searchAds faz — frase exata entre aspas — em todas as keywords, pra saber
// quais voltam vazias e devem sair da lista.
import { chromium } from "playwright";
import { writeFileSync } from "fs";
import { KEYWORDS } from "./keywords";

const BASE = "https://www.facebook.com/ads/library/";
const CONCORRENCIA = 3;
const SAIDA = process.argv[2] || "auditoria-keywords.json";

async function contarAnuncios(ctx: any, keyword: string): Promise<number | null> {
  const page = await ctx.newPage();
  try {
    const url = `${BASE}?active_status=active&ad_type=all&country=BR&q=${encodeURIComponent(
      `"${keyword}"`
    )}&search_type=keyword_unordered&media_type=all`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));
    const html = await page.content();
    const ids = new Set([...html.matchAll(/"ad_archive_id":"(\d+)"/g)].map((m) => m[1]));
    return ids.size;
  } catch {
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  });
  const ctx = await browser.newContext({
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    extraHTTPHeaders: { "Accept-Language": "pt-BR,pt;q=0.9" },
  });

  const resultados: { keyword: string; anuncios: number | null }[] = [];
  const fila = [...KEYWORDS];

  async function worker() {
    while (fila.length) {
      const kw = fila.shift();
      if (!kw) return;
      const n = await contarAnuncios(ctx, kw);
      resultados.push({ keyword: kw, anuncios: n });
      console.log(`${String(n ?? "erro").padStart(4)}  ${kw}   [${resultados.length}/${KEYWORDS.length}]`);
    }
  }

  await Promise.all(Array.from({ length: CONCORRENCIA }, worker));
  await browser.close();

  resultados.sort((a, b) => (a.anuncios ?? -1) - (b.anuncios ?? -1));
  writeFileSync(SAIDA, JSON.stringify(resultados, null, 2), "utf8");

  const vazias = resultados.filter((r) => r.anuncios === 0);
  console.log(`\n=== ${vazias.length} keywords sem nenhum anúncio ===`);
  for (const v of vazias) console.log(`  ${v.keyword}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
