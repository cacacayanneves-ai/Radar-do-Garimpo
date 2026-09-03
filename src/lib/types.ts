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
}

export type FilterKey = "todas" | "escalando" | "esfriando" | "novas";

export type SortKey = "opportunity" | "collation" | "delta" | "concorrencia";
