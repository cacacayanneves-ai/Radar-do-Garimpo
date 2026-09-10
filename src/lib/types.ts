// Pedido do Cayan em 09/09/2026: parar de minerar oferta nova tipo PV e
// minerar só tipo Quiz por enquanto — o catálogo PV existente fica
// congelado (só revalidado, sem oferta nova), e o painel ganha uma aba pra
// escolher qual tipo ver.
export type Destino = "sales_page" | "quiz";

export type Internacional = "Alta" | "Media" | "Baixa";

export interface HistoryPoint {
  d: string; // AAAA-MM-DD
  c: number;
}

export interface Offer {
  id: string;
  niche: string;
  produto: string;
  anunciante: string;
  ticket: string | null;
  destino: Destino;
  vendaUrl: string;
  libraryId: string;
  pageId: string;
  collation: number | null;
  concorrencia: number | null;
  concorrenciaEm: string | null; // ISO date
  internacional: Internacional;
  riscoPolitica: boolean;
  primeiraDeteccao: string; // ISO date
  descoberta: boolean;
  veiculacaoIniciada: string | null; // ISO date — quando o anúncio começou a rodar no Facebook
  history: HistoryPoint[];
  // Rodadas seguidas com o mesmo problema. Só é removida ao bater o limite —
  // uma leitura ruim isolada (bloqueio do Facebook, site que carrega por JS)
  // não apaga mais nada.
  strikes: number;
  strikeMotivo: string | null;
}

export interface MetaStatus {
  id: string;
  lastRun: string; // ISO timestamp
  lastRunNota: string;
  offersTracked: number;
  novasHoje: number;
  podadasHoje: number;
  escalations: string[];
  // Diagnóstico técnico do funil da rodada — não é pra exibir no painel,
  // só pra debug via GET /api/status.
  diagnostico: string;
  // Onde a próxima rodada começa a varrer a lista de keywords de PV. O
  // minerador lê este campo daqui, então ele PRECISA sair no JSON — sem ele
  // a rodada recomeça sempre do início da lista.
  keywordCursor: number;
  // O que a mineração de oferta NOVA busca na próxima rodada — trocado pelo
  // botão no painel (POST /api/mining-target).
  miningTarget: Destino;
  // Cursor de rotação da lista de keywords de QUIZ, separado do de PV.
  keywordCursorQuiz: number;
}

export type FilterKey =
  | "top10"
  | "todas"
  | "escalando"
  | "esfriando"
  | "novas"
  | "favoritas"
  | "descartadas";

export type SortKey = "opportunity" | "collation" | "delta" | "concorrencia" | "diasNoAr";

export type SortDir = "asc" | "desc";

export interface SortState {
  key: SortKey;
  dir: SortDir;
}
