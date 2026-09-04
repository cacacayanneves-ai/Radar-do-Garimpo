import "dotenv/config";
import { getAdLibraryClient, randomDelay, type AdDetails } from "./adLibraryClient";
import { KEYWORDS, keywordsFromCursor, normalizarCursor } from "./keywords";
import {
  extractPriceFromPage,
  extractTicket,
  formatPreco,
  generateOfferId,
  guessInternacional,
  guessRiscoPolitica,
  hasDigitalProductSignal,
  hasNonDigitalSignal,
  isAppStoreLink,
  isFacebookOwnedLink,
  isGenericInstagramProfile,
  isWhatsappLink,
  precoNaFaixa,
  produtoFromTitle,
  ticketInRange,
  verifyLandingPage,
} from "./heuristics";
import {
  deleteOffers,
  fetchCurrentOffers,
  fetchStatus,
  updateStatus,
  upsertOffers,
  type UpsertOfferInput,
} from "./apiClient";
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
    veiculacaoIniciada: offer.veiculacaoIniciada,
    history: offer.history,
    strikes: offer.strikes,
    strikeMotivo: offer.strikeMotivo,
  };
}

const MAX_HISTORY_POINTS = 45;
const REVALIDATE_BATCH_SIZE = 12;
const REVALIDATE_BATCH_PAUSE_MS = 4000;
const TARGET_NEW_OFFERS = 30;
// Medido ao vivo em 04/09/2026 (ver buscaVaziaPorTerco no diagnóstico): rodada
// sem teto varreu a lista de 182 keywords inteira numa sessão só, e a taxa de
// busca vazia disparou de 60% no primeiro terço pra quase 100% no segundo e
// terceiro — o Facebook passa a bloquear/limitar a sessão depois de umas 60
// buscas seguidas do mesmo runner do GitHub Actions. Por isso a rodada volta
// a ter teto de keywords: fica bem abaixo desse ponto de virada, e o cursor
// garante que o resto da lista é coberto pelas próximas rodadas (agora mais
// frequentes — ver .github/workflows/mine.yml) em vez de tudo de uma vez.
const KEYWORDS_PER_ROUND = 30;
const EFFORT_DEADLINE_MS = 70 * 60 * 1000; // teto de esforço: 70 min
// Pedido do Cayan em 04/09/2026: dar pelo menos 30 dias pra oferta provar
// que escala antes de podar por "esfriada" — 21 dias estava podando cedo
// demais. Só vale pra esse critério (esfriada); saiu do ar / virou WhatsApp
// / página degradou / preço fora da faixa continuam podando na hora, porque
// aí a oferta já não é mais válida, não é questão de tempo.
const PRUNE_MIN_AGE_DAYS = 30;
const PRUNE_MIN_CONCORRENCIA = 1200;
const PRUNE_LOOKBACK_POINTS = 10;

// Quantas rodadas SEGUIDAS precisam encontrar o mesmo problema antes de a
// oferta sair do catálogo. Antes era 1 (removia na primeira leitura ruim) e
// isso apagou oferta viva mais de uma vez: o Facebook bloqueia o robô de vez
// em quando — a leitura do anúncio falha e parece "saiu do ar" — e site que
// carrega por JavaScript às vezes devolve só o código, o que fazia a página
// de venda parecer degradada. Com 8 rodadas ao dia, 3 strikes = problema
// confirmado ao longo de ~9h, com leituras independentes.
const PRUNE_STRIKES = 3;

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
  const hoje = todayIso();

  // No máximo um ponto por dia civil, não um por RODADA. Com o robô rodando
  // várias vezes ao dia (ver KEYWORDS_PER_ROUND), uma rodada extra no mesmo
  // dia deve só ATUALIZAR o ponto de hoje com o número mais fresco — se
  // empilhasse um ponto por rodada, o "escalou de X para Y" e o gráfico de
  // tendência comparariam horas entre si, não dias, e virariam ruído.
  if (history.length > 0 && history[history.length - 1].d === hoje) {
    const semHoje = history.slice(0, -1);
    return [...semHoje, { d: hoje, c: collation }].slice(-MAX_HISTORY_POINTS);
  }

  return [...history, { d: hoje, c: collation }].slice(-MAX_HISTORY_POINTS);
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

// Contadores do funil de mineração. São reportados junto com o status da
// rodada porque o log do GitHub Actions não é acessível de fora — sem isso,
// uma rodada que termina com zero ofertas é indistinguível de uma rodada
// bloqueada pelo Facebook.
interface FunnelStats {
  nichosPulados: number;
  candidatos: number;
  semLink: number;
  poucosCriativos: number;
  whatsapp: number;
  linkMeta: number;
  appStore: number;
  instagram: number;
  semPageInfo: number;
  naoDigital: number;
  ticketFora: number;
  semSinalDigital: number;
  duplicada: number;
  landingRuim: number;
  aceitas: number;
  // Busca por keyword que voltou 0 anúncios, dividida em 3 terços da rodada.
  // Todas as keywords da lista são medidas e passam de 20 anúncios fora do
  // GitHub Actions — se o terço final tiver muito mais vazias que o
  // primeiro, é sinal de bloqueio/limitação progressiva do Facebook contra o
  // IP do runner (não é problema de keyword).
  buscaVaziaPorTerco: [number, number, number];
}

function novoFunnel(): FunnelStats {
  return {
    nichosPulados: 0, candidatos: 0, semLink: 0, poucosCriativos: 0, whatsapp: 0,
    linkMeta: 0, appStore: 0, instagram: 0, semPageInfo: 0, naoDigital: 0, ticketFora: 0,
    semSinalDigital: 0, duplicada: 0, landingRuim: 0, aceitas: 0,
    buscaVaziaPorTerco: [0, 0, 0],
  };
}

// Compacta o funil num texto curto, só com o que não é zero — vai no
// lastRunNota, que é o que aparece no rodapé do painel.
function resumirFunnel(f: FunnelStats, block: { captcha: number; emptyPayload: number; navFailures: number }): string {
  const partes: string[] = [`${f.candidatos} candidatos`];
  const rejeicoes: [string, number][] = [
    ["nichos pulados", f.nichosPulados], ["sem link", f.semLink],
    ["poucos criativos", f.poucosCriativos], ["whatsapp", f.whatsapp],
    ["link Meta", f.linkMeta], ["app store", f.appStore], ["instagram", f.instagram],
    ["sem page info", f.semPageInfo], ["não-digital", f.naoDigital],
    ["ticket fora", f.ticketFora], ["sem sinal digital", f.semSinalDigital],
    ["duplicada", f.duplicada], ["landing ruim", f.landingRuim],
  ];
  for (const [label, n] of rejeicoes) if (n > 0) partes.push(`${n} ${label}`);
  if (block.captcha > 0) partes.push(`⚠️ ${block.captcha} captcha`);
  if (block.emptyPayload > 0) {
    const [t1, t2, t3] = f.buscaVaziaPorTerco;
    partes.push(`⚠️ ${block.emptyPayload} busca vazia (${t1}/${t2}/${t3} por terço da rodada)`);
  }
  if (block.navFailures > 0) partes.push(`⚠️ ${block.navFailures} falhas de navegação`);
  return partes.join(", ");
}

async function revalidateExisting(client: ReturnType<typeof getAdLibraryClient>) {
  const current = await fetchCurrentOffers();
  const trackedLibraryIds = new Set(current.map((o) => o.libraryId));
  const trackedProductKeys = new Set<string>();

  const report: RoundReport = { novas: [], podadas: [], escalations: [] };
  const toDelete: { id: string; motivo: string }[] = [];
  const toUpsert: UpsertOfferInput[] = [];

  // Problemas encontrados nesta rodada. Não viram strike na hora: primeiro a
  // rodada inteira termina, pra dar pra saber se o problema é da oferta ou
  // do ambiente (ver ABORT_STRIKES_SE_ACIMA_DE lá embaixo).
  const problemas: { offer: (typeof current)[number]; motivo: string }[] = [];

  function registrarProblema(offer: (typeof current)[number], motivo: string) {
    problemas.push({ offer, motivo });
  }

  for (let i = 0; i < current.length; i += REVALIDATE_BATCH_SIZE) {
    const batch = current.slice(i, i + REVALIDATE_BATCH_SIZE);

    for (const offer of batch) {
      const details: AdDetails | null = await client.fetchAdDetails(offer.libraryId);
      await randomDelay(700, 1500);

      if (!details || !details.link) {
        registrarProblema(offer, "anúncio saiu do ar");
        continue;
      }

      if (isWhatsappLink(details.link)) {
        registrarProblema(offer, "destino mudou para WhatsApp");
        continue;
      }

      if (isFacebookOwnedLink(details.link)) {
        registrarProblema(offer, "link passou a apontar pro próprio Facebook (não é página de venda)");
        continue;
      }

      // O número de criativos é o dado que alimenta o histórico e, por
      // consequência, todo o "está escalando ou não" do painel. A página de
      // detalhe nem sempre informa (nem sempre lista os anúncios
      // relacionados do anunciante, varia por ambiente) — quando não
      // informa, conta pela página que lista todos os anúncios daquele
      // anunciante.
      let collationHoje = await client.countOfferCreatives(
        details.pageId ?? offer.pageId,
        details.creativeText
      );
      await randomDelay(700, 1400);
      if (collationHoje == null) collationHoje = details.collation;

      const history = appendHistory(offer.history, collationHoje);

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
        registrarProblema(offer, `esfriada — mais de ${PRUNE_MIN_AGE_DAYS} dias, alta concorrência, nunca escalou`);
        continue;
      }

      // Corrige retroativamente nome/preço/data de ofertas já rastreadas, e
      // detecta degradação — a página pode ter virado formulário de lead,
      // loja física, quiz ou saído da faixa de preço DEPOIS de ter sido
      // aceita. Só roda pra quem sobreviveu até aqui (não desperdiça
      // requisição em quem já ia ser podado por outro motivo).
      let produtoAtualizado = offer.produto;
      let ticketAtualizado = offer.ticket;
      let veiculacaoIniciadaAtualizada = offer.veiculacaoIniciada;

      if (details.startDateUnix != null) {
        veiculacaoIniciadaAtualizada = new Date(details.startDateUnix * 1000).toISOString();
      }

      const landing = await client.fetchLandingPage(details.link);
      await randomDelay(600, 1200);

      if (landing) {
        const verdict = verifyLandingPage(landing.text, details.link);
        if (!verdict.ok) {
          registrarProblema(offer, `página de venda degradou (${verdict.reason})`);
          continue;
        }

        const precoAtual = extractPriceFromPage(landing.text);
        if (precoAtual != null) {
          if (!precoNaFaixa(precoAtual)) {
            registrarProblema(offer, `preço saiu da faixa (agora R$ ${precoAtual})`);
            continue;
          }
          ticketAtualizado = formatPreco(precoAtual);
        }

        const nomeReal = produtoFromTitle(landing.title);
        if (nomeReal) produtoAtualizado = nomeReal;
      }

      // Passou em tudo: zera os strikes. Um problema passageiro numa rodada
      // não pode ficar acumulado com outro daqui a três dias.
      if (offer.strikes > 0) {
        console.log(`Strikes zerados em ${offer.id} (antes: ${offer.strikes} — ${offer.strikeMotivo}).`);
      }

      toUpsert.push({
        ...toUpsertInput(offer),
        vendaUrl: details.link,
        collation: collationHoje ?? offer.collation,
        produto: produtoAtualizado,
        ticket: ticketAtualizado,
        veiculacaoIniciada: veiculacaoIniciadaAtualizada,
        history,
        strikes: 0,
        strikeMotivo: null,
      });
      const revalidatedPageId = details.pageId ?? offer.pageId;
      trackedProductKeys.add(productUrlKey(revalidatedPageId, details.link));
      trackedProductKeys.add(productTextKey(revalidatedPageId, produtoAtualizado));
    }

    if (i + REVALIDATE_BATCH_SIZE < current.length) {
      await new Promise((r) => setTimeout(r, REVALIDATE_BATCH_PAUSE_MS));
    }
  }

  // Trava de segurança: se MAIS DA METADE do catálogo deu problema na mesma
  // rodada, o problema é do ambiente (Facebook bloqueando o robô, rede caindo),
  // não das ofertas. Sem isso, um bloqueio geral daria strike em todo mundo ao
  // mesmo tempo e em 3 rodadas o catálogo inteiro seria apagado.
  const limiteDeSanidade = Math.max(1, Math.floor(current.length / 2));
  if (problemas.length > limiteDeSanidade) {
    console.warn(
      `⚠️ ${problemas.length} de ${current.length} ofertas com problema nesta rodada — ` +
        `acima do limite de ${limiteDeSanidade}. Tratando como falha de ambiente: ` +
        `nenhum strike aplicado, nada removido.`
    );
    for (const { offer } of problemas) {
      toUpsert.push(toUpsertInput(offer));
    }
    return { trackedLibraryIds, trackedProductKeys, toDelete, toUpsert, report };
  }

  // Volume normal de problemas: acumula strike em cada uma, e só remove as
  // que bateram o limite com o MESMO motivo em rodadas seguidas. Motivo
  // diferente do anterior zera a contagem — senão dois problemas passageiros
  // sem relação somariam até apagar uma oferta saudável.
  for (const { offer, motivo } of problemas) {
    const strikes = offer.strikeMotivo === motivo ? offer.strikes + 1 : 1;

    if (strikes >= PRUNE_STRIKES) {
      toDelete.push({ id: offer.id, motivo: `${motivo} (confirmado em ${strikes} rodadas seguidas)` });
      continue;
    }

    console.log(`Strike ${strikes}/${PRUNE_STRIKES} em ${offer.id}: ${motivo}`);
    toUpsert.push({ ...toUpsertInput(offer), strikes, strikeMotivo: motivo });
  }

  return { trackedLibraryIds, trackedProductKeys, toDelete, toUpsert, report };
}

async function mineNewOffers(
  client: ReturnType<typeof getAdLibraryClient>,
  trackedLibraryIds: Set<string>,
  trackedProductKeys: Set<string>,
  report: RoundReport,
  funnel: FunnelStats,
  cursorInicial: number
) {
  const keywords = keywordsFromCursor(cursorInicial).slice(0, KEYWORDS_PER_ROUND);
  // Quantas keywords a rodada realmente consumiu — vira o cursor da próxima.
  let consumidas = 0;
  const nicheCompetitionCache = new Map<string, number | null>();
  const newOffers: UpsertOfferInput[] = [];
  // Dedup barato, antes de gastar requisição: vários anúncios da mesma
  // busca são o mesmo criativo repetido. Na rodada anterior isso foi 48 de
  // 139 candidatos — todos custando um fetch de detalhe antes de serem
  // descartados lá embaixo.
  const textosVistos = new Set<string>();

  for (const [indice, keyword] of keywords.entries()) {
    if (newOffers.length >= TARGET_NEW_OFFERS || deadlineReached()) break;
    consumidas++;
    const terco = indice < keywords.length / 3 ? 0 : indice < (2 * keywords.length) / 3 ? 1 : 2;

    // Mede a concorrência do nicho ANTES de gastar tempo avaliando
    // candidatos — nicho saturado (mercado grande/dominado por players
    // grandes) não interessa, mesmo que os anúncios individuais pareçam ok.
    let concorrencia = nicheCompetitionCache.get(keyword);
    if (concorrencia === undefined) {
      concorrencia = await client.searchCompetitionCount(keyword);
      await randomDelay(800, 1500);
      nicheCompetitionCache.set(keyword, concorrencia);
    }
    if (concorrencia != null && concorrencia > MAX_ACCEPTABLE_COMPETITION) {
      funnel.nichosPulados++;
      continue;
    }

    // 30, não 20: a página de busca carrega ~30 anúncios e o corte em 20
    // jogava fora um terço deles sem economizar requisição nenhuma (é a
    // mesma página já baixada, só muda quantos ids são lidos do HTML).
    const candidates = await client.searchAds(keyword, 30);
    await randomDelay(1200, 2200);
    if (candidates.length === 0) funnel.buscaVaziaPorTerco[terco]++;

    for (const candidate of candidates) {
      if (newOffers.length >= TARGET_NEW_OFFERS || deadlineReached()) break;
      if (trackedLibraryIds.has(candidate.libraryId)) continue;

      // Mesmo criativo já avaliado nesta rodada (em outra keyword ou outro
      // card da mesma busca) — descarta antes de gastar a requisição.
      const textoNormalizado = candidate.adText
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim()
        .slice(0, 100);
      if (textoNormalizado) {
        if (textosVistos.has(textoNormalizado)) {
          funnel.duplicada++;
          continue;
        }
        textosVistos.add(textoNormalizado);
      }

      funnel.candidatos++;

      const details = await client.fetchAdDetails(candidate.libraryId);
      await randomDelay(700, 1500);
      if (!details || !details.link) {
        funnel.semLink++;
        continue;
      }

      if (isWhatsappLink(details.link)) {
        funnel.whatsapp++;
        continue; // regra de negócio: nunca WhatsApp.
      }
      if (isFacebookOwnedLink(details.link)) {
        funnel.linkMeta++;
        continue; // não é uma página de venda de verdade.
      }
      if (isAppStoreLink(details.link)) {
        funnel.appStore++;
        continue; // instalação de app, não oferta com página de venda.
      }
      if (isGenericInstagramProfile(details.link)) {
        funnel.instagram++;
        continue;
      }
      if (!details.pageName || !details.pageId) {
        funnel.semPageInfo++;
        continue;
      }

      const combinedText = `${candidate.adText} ${details.adText}`;
      if (hasNonDigitalSignal(combinedText)) {
        funnel.naoDigital++;
        continue; // sinal forte de produto físico/serviço/oferta financeira.
      }

      const ticket = extractTicket(combinedText);
      if (!ticketInRange(ticket)) {
        funnel.ticketFora++;
        continue;
      }

      // Nome provisório do produto: primeira linha relevante do texto do
      // criativo. É só a isca do anúncio, não o nome real — logo abaixo,
      // se a página de venda tiver um <title> aproveitável, ele substitui.
      const creativeLine = candidate.adText.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 6);
      let produto = (creativeLine || details.pageName).slice(0, 120);

      const urlKey = productUrlKey(details.pageId, details.link);
      const textKey = productTextKey(details.pageId, produto);
      if (trackedProductKeys.has(urlKey) || trackedProductKeys.has(textKey)) {
        funnel.duplicada++;
        continue; // já rastreamos esse produto (outro criativo testando a mesma oferta).
      }

      // Número de criativos — o filtro mais importante, e o que decide se a
      // oferta já está validada pelo anunciante. Fica AQUI, depois de todos
      // os testes de graça, porque exige uma requisição a mais: pergunta à
      // Biblioteca quantos anúncios daquela página rodam com esse mesmo
      // texto.
      //
      // Antes o filtro rodava lá em cima com uma ESTIMATIVA (quantas cópias
      // do mesmo texto apareciam nos 20 resultados da busca) e barrava 74%
      // dos candidatos. Medido em 04/09/2026: a estimativa subestima sempre,
      // e feio — ofertas com 5, 6 e até 71 criativos reais apareciam como 1
      // e eram descartadas. Por isso duas rodadas seguidas terminaram com
      // zero ofertas novas.
      const collationExata = await client.countOfferCreatives(details.pageId, details.creativeText);
      await randomDelay(600, 1200);
      // Se a medição precisa falhar, cai pra estimativa (que é um piso: nunca
      // conta a mais) em vez de descartar por não ter conseguido medir.
      const collationFinal = collationExata ?? Math.max(details.collation ?? 0, candidate.collationHint ?? 0);

      if (collationFinal < MIN_COLLATION_FOR_NEW_OFFER) {
        funnel.poucosCriativos++;
        continue; // poucos criativos rodando — ainda não validado.
      }

      // Última checagem (visita a página de fora do facebook.com): confirma
      // que a página de venda é mesmo uma página de venda — não blog,
      // formulário de lead, quiz, loja de produto físico, página de busca
      // vazia ou site em outro idioma. De quebra, é dela que sai o nome real
      // do produto e o preço praticado.
      const landing = await client.fetchLandingPage(details.link);
      await randomDelay(600, 1200);

      let precoDaPagina: number | null = null;
      if (landing) {
        const verdict = verifyLandingPage(landing.text, details.link);
        if (!verdict.ok) {
          funnel.landingRuim++;
          continue;
        }

        // O anúncio quase nunca declara preço; a página de venda sempre
        // mostra. Com o preço real dá pra aplicar a faixa de R$9–50 de
        // verdade (antes ela só valia quando o anúncio citava o valor).
        precoDaPagina = extractPriceFromPage(landing.text);
        if (precoDaPagina != null && !precoNaFaixa(precoDaPagina)) {
          funnel.ticketFora++;
          continue;
        }

        const nomeReal = produtoFromTitle(landing.title);
        if (nomeReal) produto = nomeReal;
      }

      // Confirmação de que é infoproduto digital, e ela precisa vir DA PÁGINA
      // DE VENDA — não do anúncio. O anúncio é isca ("descubra o método...")
      // e mente por omissão: um artigo de blog sobre devoção mariana
      // (informativoedu.site) entrou no catálogo porque o ANÚNCIO tinha
      // sinal digital, enquanto a página não tinha nada — nem preço, nem
      // formato, só texto corrido.
      //
      // Basta uma das duas evidências, mas as duas saem da página: um sinal
      // de material digital no texto dela, OU um preço real já confirmado na
      // faixa R$9–50. Se a página não carregou, não dá pra confirmar nada e a
      // oferta não entra (diferente da revalidação, que é tolerante: pra
      // ENTRAR exige-se prova, pra SAIR exige-se confirmação repetida).
      const temSinalNaPagina = landing ? hasDigitalProductSignal(landing.text) : false;
      if (!temSinalNaPagina && precoDaPagina == null) {
        funnel.semSinalDigital++;
        continue;
      }

      const ticketFinal = precoDaPagina != null ? formatPreco(precoDaPagina) : ticket;

      funnel.aceitas++;

      const id = generateOfferId(produto, details.pageName, candidate.libraryId);

      const offer: UpsertOfferInput = {
        id,
        niche: keyword,
        produto,
        anunciante: details.pageName,
        ticket: ticketFinal,
        vendaUrl: details.link,
        libraryId: candidate.libraryId,
        pageId: details.pageId,
        collation: collationFinal,
        concorrencia: concorrencia ?? null,
        concorrenciaEm: concorrencia != null ? new Date().toISOString() : null,
        internacional: guessInternacional(keyword, produto),
        riscoPolitica: guessRiscoPolitica(combinedText),
        primeiraDeteccao: new Date().toISOString(),
        descoberta: true,
        veiculacaoIniciada: details.startDateUnix != null ? new Date(details.startDateUnix * 1000).toISOString() : null,
        history: [{ d: todayIso(), c: collationFinal }],
      };

      newOffers.push(offer);
      trackedLibraryIds.add(candidate.libraryId);
      trackedProductKeys.add(urlKey);
      trackedProductKeys.add(textKey);
      // O produto pode ter sido renomeado pelo <title> da página — guarda a
      // chave do nome final também, senão a próxima rodada não reconhece.
      trackedProductKeys.add(productTextKey(details.pageId, produto));
      report.novas.push({
        id,
        produto,
        anunciante: details.pageName,
        libraryId: candidate.libraryId,
        niche: keyword,
      });
    }
  }

  console.log(
    `Keywords varridas nesta rodada: ${consumidas} (de ${keywords[0]} em diante). Próxima rodada começa em "${
      KEYWORDS[normalizarCursor(cursorInicial + consumidas)]
    }".`
  );

  return { newOffers, cursorFinal: normalizarCursor(cursorInicial + consumidas) };
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

  const funnel = novoFunnel();

  // Onde a rodada anterior parou de varrer a lista de keywords. Se o status
  // ainda não existir (primeira rodada) ou a leitura falhar, começa do zero.
  const cursorInicial = normalizarCursor((await fetchStatus())?.keywordCursor ?? 0);
  console.log(`Cursor de keywords: começando em ${cursorInicial} ("${KEYWORDS[cursorInicial]}").`);

  try {
    const { trackedLibraryIds, trackedProductKeys, toDelete, toUpsert, report } = await revalidateExisting(client);

    if (toUpsert.length > 0) {
      await upsertOffers(toUpsert);
    }

    const { newOffers, cursorFinal } = await mineNewOffers(
      client,
      trackedLibraryIds,
      trackedProductKeys,
      report,
      funnel,
      cursorInicial
    );
    if (newOffers.length > 0) {
      await upsertOffers(newOffers);
    }

    if (toDelete.length > 0) {
      await deleteOffers(toDelete);
    }
    report.podadas = toDelete;

    const offersTracked = toUpsert.length + newOffers.length; // aproximação: catálogo revalidado + novas

    const headline =
      report.escalations.length > 0
        ? `${report.escalations[0].id} escalou de ${report.escalations[0].de} para ${report.escalations[0].para}`
        : `${newOffers.length} novas ofertas minerada(s), ${toDelete.length} podada(s)`;

    // O motivo de cada poda só existia no log do GitHub Actions (que exige
    // login) — sem isso, "por que caiu de 16 pra 13?" não tinha resposta
    // fora de reler o log manualmente. Agora vai no diagnóstico também.
    const podadasResumo =
      toDelete.length > 0 ? ` | Podadas: ${toDelete.map((d) => `${d.id} (${d.motivo})`).join("; ")}` : "";
    const diagnostico = resumirFunnel(funnel, client.getBlockStats()) + podadasResumo;
    console.log("\nFunil da rodada:", JSON.stringify(funnel), JSON.stringify(client.getBlockStats()));

    await updateStatus({
      lastRunNota: headline, // texto público, aparece no rodapé do painel.
      offersTracked,
      novasHoje: newOffers.length,
      podadasHoje: toDelete.length,
      escalations: report.escalations.map((e) => e.id),
      diagnostico, // só pra debug via GET /api/status, não aparece no painel.
      keywordCursor: cursorFinal, // próxima rodada continua daqui.
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
