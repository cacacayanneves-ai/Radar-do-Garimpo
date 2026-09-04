export type Destino = "sales_page";

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
