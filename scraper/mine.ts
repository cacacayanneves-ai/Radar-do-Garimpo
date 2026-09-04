import "dotenv/config";
import { getAdLibraryClient, randomDelay, type AdDetails } from "./adLibraryClient";
import { keywordsForToday } from "./keywords";
import {
  extractTicket,
  generateOfferId,
  guessInternacional,
  guessRiscoPolitica,
  hasDigitalProductSignal,
  hasNonDigitalSignal,
  isFacebookOwnedLink,
  isGenericInstagramProfile,
  isWhatsappLink,
  ticketInRange,
  verifyLandingPage,
} from "./heuristics";
import { deleteOffers, fetchCurrentOffers, updateStatus, upsertOffers, type UpsertOfferInput } from "./apiClient";
import type { HistoryPoint } from "@/lib/types";

function toUpsertInput(offer: Awaited<ReturnType<typeof fetchCurrentOffers>>[number]): UpsertOfferInput {
  return {
    id: offer.id,
    niche: offer.niche,
    produto: offer.produto,
    anunciante: offer.anunciante,
    ticket: offer.ticket,
    vendaUrl: offer.vendaUrl,
    libraryId: offer.libraryId,
    pageId: offer.pageId,
    collation: offer.collation,
    concorrencia: offer.concorrencia,
    concorrenciaEm: offer.concorrenciaEm,
    internacional: offer.internacional,
    riscoPolitica: offer.riscoPolitica,
    primeiraDeteccao: offer.primeiraDeteccao,
    descoberta: false,
    history: offer.history,
  };
}

const MAX_HISTORY_POINTS = 45;
const REVALIDATE_BATCH_SIZE = 12;
const REVALIDATE_BATCH_PAUSE_MS = 4000;
const TARGET_NEW_OFFERS = 30;
const EFFORT_DEADLINE_MS = 40 * 60 * 1000; // teto de esforço: 40 min
const PRUNE_MIN_AGE_DAYS = 21;
const PRUNE_MIN_CONCORRENCIA = 1200;
const PRUNE_LOOKBACK_POINTS = 10;

// Critério de entrada (só pra ofertas NOVAS — não reavalia quem já está no
// catálogo, senão uma queda temporária no collation ia podar oferta que só
// oscilou). Pedido original era 5, mas medido na prática (20 anúncios reais,
// 5 nichos diferentes) nenhum passou de 3 — nesse segmento (anunciantes
// pequenos) collation 5+ simultâneo é raro. Ajustado pra 2: ainda exige mais
// de um criativo rodando (não é só um teste solto isolado), mas realista
// pro tamanho desse mercado.
const MIN_COLLATION_FOR_NEW_OFFER = 2;

// Nicho com concorrência acima disso é tratado como mercado grande/saturado
// (dominado por players grandes) e nenhuma oferta NOVA é minerada dele.
// Ajustado de 900 pra 1500 depois de medir na prática: 900 + o mínimo de 5
// criativos (MIN_COLLATION_FOR_NEW_OFFER) juntos praticamente zeravam os
// resultados — nicho de baixa concorrência raramente tem anúncio já testado
// 5x. 1500 dá mais margem pra achar oferta que já escalou sem ainda estar
// saturada.
const MAX_ACCEPTABLE_COMPETITION = 1500;

const startedAt = Date.now();
function deadlineReached(): boolean {
  return Date.now() - startedAt > EFFORT_DEADLINE_MS;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function appendHistory(history: HistoryPoint[], collation: number | null): HistoryPoint[] {
  if (collation == null) return history;
  const next = [...history, { d: todayIso(), c: collation }];
  return next.slice(-MAX_HISTORY_POINTS);
}

function neverEscalated(history: HistoryPoint[]): boolean {
  const recent = history.slice(-PRUNE_LOOKBACK_POINTS);
  for (let i = 1; i < recent.length; i++) {
    if (recent[i].c > recent[i - 1].c) return false;
  }
  return true;
}

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

// Chaves de "mesmo produto": múltiplos anúncios (libraryId diferentes) podem
// estar testando a mesma oferta — isso já é o que o campo `collation` mede
// por criativo, mas diferentes criativos testando a mesma oferta não devem
// virar linhas duplicadas no catálogo. Duas formas de bater "é o mesmo
// produto": mesma página + mesma URL exata de venda, OU mesma página + texto
// do anúncio praticamente idêntico (cobre o caso comum de variantes de UTM/
// versão na URL, ex: "apostilas-f3-v3-gratuito" vs "apostilas-f4-v3-gratuito"
// do mesmo anunciante com o mesmo texto "Garanta já sua apostila").
function productUrlKey(pageId: string, vendaUrl: string): string {
  return `url::${pageId}::${vendaUrl}`;
}

function productTextKey(pageId: string, produto: string): string {
  const normalized = produto.toLowerCase().trim().replace(/\s+/g, " ").slice(0, 80);
  return `text::${pageId}::${normalized}`;
}

function detectStrongEscalation(history: HistoryPoint[]): boolean {
  if (history.length < 2) return false;
  const hoje = history[history.length - 1].c;
  const ontem = history[history.length - 2].c;
  const delta = hoje - ontem;
  if (delta >= 2) return true;
  if (ontem >= 1 && hoje >= ontem * 2) return true;
  return false;
}

interface RoundReport {
  novas: { id: string; produto: string; anunciante: string; libraryId: string; niche: string }[];
  podadas: { id: string; motivo: string }[];
  escalations: { id: string; produto: string; de: number; para: number }[];
}

async function revalidateExisting(client: ReturnType<typeof getAdLibraryClient>) {
  const current = await fetchCurrentOffers();
  const trackedLibraryIds = new Set(current.map((o) => o.libraryId));
  const trackedProductKeys = new Set<string>();

  const report: RoundReport = { novas: [], podadas: [], escalations: [] };
  const toDelete: { id: string; motivo: string }[] = [];
  const toUpsert: UpsertOfferInput[] = [];

  for (let i = 0; i < current.length; i += REVALIDATE_BATCH_SIZE) {
    const batch = current.slice(i, i + REVALIDATE_BATCH_SIZE);

    for (const offer of batch) {
      const details: AdDetails | null = await client.fetchAdDetails(offer.libraryId);
      await randomDelay(700, 1500);

      if (!details || !details.link) {
        toDelete.push({ id: offer.id, motivo: "anúncio saiu do ar" });
        continue;
      }

      if (isWhatsappLink(details.link)) {
        toDelete.push({ id: offer.id, motivo: "destino mudou para WhatsApp" });
        continue;
      }

      if (isFacebookOwnedLink(details.link)) {
        toDelete.push({ id: offer.id, motivo: "link passou a apontar pro próprio Facebook (não é página de venda)" });
        continue;
      }

      const history = appendHistory(offer.history, details.collation);

      if (detectStrongEscalation(history)) {
        const hoje = history[history.length - 1].c;
        const ontem = history[history.length - 2].c;
        report.escalations.push({ id: offer.id, produto: offer.produto, de: ontem, para: hoje });
      }

      const isOldAndCold =
        daysSince(offer.primeiraDeteccao) > PRUNE_MIN_AGE_DAYS &&
        (offer.concorrencia ?? 0) > PRUNE_MIN_CONCORRENCIA &&
        neverEscalated(history);

      if (isOldAndCold) {
        toDelete.push({ id: offer.id, motivo: "esfriada — mais de 21 dias, alta concorrência, nunca escalou" });
        continue;
      }

      toUpsert.push({
        ...toUpsertInput(offer),
        vendaUrl: details.link,
        collation: details.collation,
        history,
      });
      const revalidatedPageId = details.pageId ?? offer.pageId;
      trackedProductKeys.add(productUrlKey(revalidatedPageId, details.link));
      trackedProductKeys.add(productTextKey(revalidatedPageId, offer.produto));
    }

    if (i + REVALIDATE_BATCH_SIZE < current.length) {
      await new Promise((r) => setTimeout(r, REVALIDATE_BATCH_PAUSE_MS));
    }
  }

  return { trackedLibraryIds, trackedProductKeys, toDelete, toUpsert, report };
}

async function mineNewOffers(
  client: ReturnType<typeof getAdLibraryClient>,
  trackedLibraryIds: Set<string>,
  trackedProductKeys: Set<string>,
  report: RoundReport
) {
  const keywords = keywordsForToday(7);
  const nicheCompetitionCache = new Map<string, number | null>();
  const newOffers: UpsertOfferInput[] = [];

  for (const keyword of keywords) {
    if (newOffers.length >= TARGET_NEW_OFFERS || deadlineReached()) break;

    // Mede a concorrência do nicho ANTES de gastar tempo avaliando
    // candidatos — nicho saturado (mercado grande/dominado por players
    // grandes) não interessa, mesmo que os anúncios individuais pareçam ok.
    let concorrencia = nicheCompetitionCache.get(keyword);
    if (concorrencia === undefined) {
      concorrencia = await client.searchCompetitionCount(keyword);
      await randomDelay(800, 1500);
      nicheCompetitionCache.set(keyword, concorrencia);
    }
    if (concorrencia != null && concorrencia > MAX_ACCEPTABLE_COMPETITION) continue;

    const candidates = await client.searchAds(keyword, 20);
    await randomDelay(1200, 2200);

    for (const candidate of candidates) {
      if (newOffers.length >= TARGET_NEW_OFFERS || deadlineReached()) break;
      if (trackedLibraryIds.has(candidate.libraryId)) continue;

      const details = await client.fetchAdDetails(candidate.libraryId);
      await randomDelay(700, 1500);
      if (!details || !details.link) continue;

      if ((details.collation ?? 0) < MIN_COLLATION_FOR_NEW_OFFER) continue; // poucos criativos rodando — ainda não validado.

      if (isWhatsappLink(details.link)) continue; // regra de negócio: nunca WhatsApp.
      if (isFacebookOwnedLink(details.link)) continue; // não é uma página de venda de verdade.
      if (isGenericInstagramProfile(details.link)) continue;
      if (!details.pageName || !details.pageId) continue;

      const combinedText = `${candidate.adText} ${details.adText}`;
      if (hasNonDigitalSignal(combinedText)) continue; // sinal forte de produto físico/serviço/oferta financeira.

      const ticket = extractTicket(combinedText);
      if (!ticketInRange(ticket)) continue;

      // Sem nenhuma evidência de que é infoproduto digital (nem palavra tipo
      // "PDF"/"apostila", nem preço declarado low-ticket) — descarta, não dá
      // pra confirmar que é o tipo de oferta que estamos garimpando.
      if (!hasDigitalProductSignal(combinedText) && !ticket) continue;

      // Aproximação do nome do produto: primeira linha relevante do texto do
      // criativo capturado na busca (heurístico — ver adLibraryClient.ts),
      // caindo para o nome da página quando não há texto disponível.
      const creativeLine = candidate.adText.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 6);
      const produto = (creativeLine || details.pageName).slice(0, 120);

      const urlKey = productUrlKey(details.pageId, details.link);
      const textKey = productTextKey(details.pageId, produto);
      if (trackedProductKeys.has(urlKey) || trackedProductKeys.has(textKey)) continue; // já rastreamos esse produto (outro criativo testando a mesma oferta).

      // Última checagem, e a mais cara (visita a página de fora do
      // facebook.com): confirma que a página de venda é mesmo uma página de
      // venda — não um blog, formulário de lead/quiz, ou site em outro
      // idioma. Fica por último de propósito, só roda pra quem já passou em
      // tudo o resto.
      const landingText = await client.fetchLandingPageText(details.link);
      await randomDelay(600, 1200);
      if (landingText) {
        const verdict = verifyLandingPage(landingText);
        if (!verdict.ok) continue;
      }

      const id = generateOfferId(produto, details.pageName, candidate.libraryId);

      const offer: UpsertOfferInput = {
        id,
        niche: keyword,
        produto,
        anunciante: details.pageName,
        ticket,
        vendaUrl: details.link,
        libraryId: candidate.libraryId,
        pageId: details.pageId,
        collation: details.collation,
        concorrencia: concorrencia ?? null,
        concorrenciaEm: concorrencia != null ? new Date().toISOString() : null,
        internacional: guessInternacional(keyword, produto),
        riscoPolitica: guessRiscoPolitica(combinedText),
        primeiraDeteccao: new Date().toISOString(),
        descoberta: true,
        history: details.collation != null ? [{ d: todayIso(), c: details.collation }] : [],
      };

      newOffers.push(offer);
      trackedLibraryIds.add(candidate.libraryId);
      trackedProductKeys.add(urlKey);
      trackedProductKeys.add(textKey);
      report.novas.push({
        id,
        produto,
        anunciante: details.pageName,
        libraryId: candidate.libraryId,
        niche: keyword,
      });
    }
  }

  return newOffers;
}

function printReport(report: RoundReport, offersTracked: number) {
  console.log("\n================ Radar do Garimpo — resumo da rodada ================\n");

  if (report.escalations.length > 0) {
    console.log("🔥 Escaladas fortes:");
    for (const e of report.escalations) {
      console.log(`  - ${e.id}: ${e.de} → ${e.para}`);
    }
  } else {
    console.log("Sem escaladas fortes nesta rodada.");
  }

  console.log(`\n✨ Novas ofertas (${report.novas.length}):`);
  for (const n of report.novas) {
    const link = `https://www.facebook.com/ads/library/?id=${n.libraryId}`;
    console.log(`  - [${n.niche}] ${n.produto} — ${n.anunciante}`);
    console.log(`    conferir: ${link}`);
  }

  console.log(`\n🧹 Podadas (${report.podadas.length}):`);
  for (const p of report.podadas) {
    console.log(`  - ${p.id}: ${p.motivo}`);
  }

  console.log(`\nCatálogo total após a rodada: ${offersTracked}`);
  console.log("\n=======================================================================\n");
}

async function main() {
  console.log(`Radar do Garimpo — iniciando mineração em ${new Date().toISOString()}`);
  const client = getAdLibraryClient();

  try {
    const { trackedLibraryIds, trackedProductKeys, toDelete, toUpsert, report } = await revalidateExisting(client);

    if (toUpsert.length > 0) {
      await upsertOffers(toUpsert);
    }

    const newOffers = await mineNewOffers(client, trackedLibraryIds, trackedProductKeys, report);
    if (newOffers.length > 0) {
      await upsertOffers(newOffers);
    }

    const deleteIds = toDelete.map((d) => d.id);
    if (deleteIds.length > 0) {
      await deleteOffers(deleteIds);
    }
    report.podadas = toDelete;

    const offersTracked = toUpsert.length + newOffers.length; // aproximação: catálogo revalidado + novas

    const headline =
      report.escalations.length > 0
        ? `${report.escalations[0].id} escalou de ${report.escalations[0].de} para ${report.escalations[0].para}`
        : `${newOffers.length} novas ofertas minerada(s), ${toDelete.length} podada(s)`;

    await updateStatus({
      lastRunNota: headline,
      offersTracked,
      novasHoje: newOffers.length,
      podadasHoje: toDelete.length,
      escalations: report.escalations.map((e) => e.id),
    });

    printReport(report, offersTracked);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Mineração falhou:", err);
  process.exit(1);
});
