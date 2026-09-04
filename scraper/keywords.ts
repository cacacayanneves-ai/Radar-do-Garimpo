// Lista de keywords usadas na rotação de mineração de ofertas novas. A rodada
// varre a partir do cursor guardado no banco (ver keywordsFromCursor) até
// bater o alvo de ofertas novas ou o teto de tempo.
//
// ESCOPO (definido pelo Cayan em 04/09/2026): APENAS três nichos —
//   1. SAÚDE E BEM-ESTAR (amplo: emagrecimento, treino, enfermagem, saúde
//      mental, terapias holísticas).
//   2. RELIGIÃO.
//   3. RENDA EXTRA — inclui artesanato e ofício: quem aprende pra produzir e
//      vender (crochê, costura, papelaria de festa, confeitaria, elétrica) e
//      quem quer vender online.
// Ficaram de fora, por não serem nenhum dos três: educação/pedagogia,
// idiomas, maternidade/gestação, casamento, finanças pessoais, agro e
// estética/beleza (cílios, sobrancelha, manicure, barbeiro, tatuagem) — esta
// última o Cayan cortou explicitamente, nem como saúde nem como ofício.
//
// REGRA AO ADICIONAR KEYWORD: mantenha a frase CURTA. A busca da Biblioteca é
// por frase exata, então "planner financeiro editável" volta ZERO enquanto
// "planner financeiro" volta 30 anúncios. Meça com scraper/auditarKeywords.ts
// antes de incluir; abaixo de ~10 anúncios a keyword quase não paga o tempo
// que consome na rodada. Todas as daqui foram medidas.
//
// Não entram keywords genéricas de formato ("PDF por apenas", "e-book por
// apenas"): rendem bem, mas trazem qualquer nicho — foi o que enchia o painel
// de oferta fora do escopo.
//
// Sazonais (natal, páscoa, halloween, junina) rendem pouco fora de época — é
// esperado, não remova por causa disso.
//
// As keywords em si moraram em src/lib/keywordCategorias.ts, agrupadas por
// nicho — é de lá que o site também lê pra filtrar o catálogo por nicho no
// painel. Editar keyword (adicionar/remover/encurtar) é lá, não aqui. A
// ORDEM dentro de cada grupo é a ordem de rotação do cursor — não reordene
// à toa.
import { KEYWORD_GROUPS } from "@/lib/keywordCategorias";

export const KEYWORDS: string[] = [
  ...KEYWORD_GROUPS.saude,
  ...KEYWORD_GROUPS.religiao,
  ...KEYWORD_GROUPS.renda_extra,
];

// Normaliza um cursor vindo do banco (pode estar fora da faixa se a lista
// encolher) para um índice válido da lista.
export function normalizarCursor(cursor: number): number {
  if (!Number.isFinite(cursor)) return 0;
  const n = Math.trunc(cursor) % KEYWORDS.length;
  return n < 0 ? n + KEYWORDS.length : n;
}

// Lista inteira reordenada pra começar em `cursor`, em rotação circular. A
// rodada varre a partir daí e para quando bate o alvo de ofertas novas ou o
// teto de tempo — o índice onde parou vira o cursor da próxima rodada, então
// nenhuma keyword é varrida duas vezes seguidas e, ao longo dos dias, a lista
// toda é coberta. (Antes o ponto de partida era o dia do ano: as duas rodadas
// do mesmo dia usavam as MESMAS keywords e dois dias seguidos repetiam quase
// todas — daí o volume de duplicadas e o catálogo parado.)
export function keywordsFromCursor(cursor: number): string[] {
  const start = normalizarCursor(cursor);
  return KEYWORDS.map((_, i) => KEYWORDS[(start + i) % KEYWORDS.length]);
}
