import type { HistoryPoint, Internacional, Offer } from "@/lib/types";

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";
const SECRET = process.env.SCRAPER_API_SECRET;

if (!SECRET) {
  throw new Error("SCRAPER_API_SECRET não definido no ambiente do scraper.");
}

function headers() {
  return {
    "Content-Type": "application/json",
    "x-api-key": SECRET as string,
  };
}

export interface UpsertOfferInput {
  id: string;
  niche: string;
  produto: string;
  anunciante: string;
  ticket?: string | null;
  vendaUrl: string;
  libraryId: string;
  pageId: string;
  collation?: number | null;
  concorrencia?: number | null;
  concorrenciaEm?: string | null;
  internacional: Internacional;
  riscoPolitica?: boolean;
  primeiraDeteccao: string;
  descoberta?: boolean;
  history?: HistoryPoint[];
}

export async function upsertOffers(offers: UpsertOfferInput[]) {
  const payload = offers.map((o) => ({ ...o, destino: "sales_page" as const }));
  const res = await fetch(`${SITE_URL}/api/offers/upsert`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ offers: payload }),
  });
  if (!res.ok) {
    throw new Error(`Falha ao gravar ofertas (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export async function deleteOffers(ids: string[]) {
  if (ids.length === 0) return { deleted: 0 };
  const res = await fetch(`${SITE_URL}/api/offers/delete`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) {
    throw new Error(`Falha ao remover ofertas (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export async function updateStatus(status: {
  lastRunNota: string;
  offersTracked: number;
  novasHoje: number;
  podadasHoje: number;
  escalations: string[];
  diagnostico?: string;
}) {
  const res = await fetch(`${SITE_URL}/api/status/update`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ ...status, lastRun: new Date().toISOString() }),
  });
  if (!res.ok) {
    throw new Error(`Falha ao atualizar status (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export async function fetchCurrentOffers(): Promise<Offer[]> {
  const res = await fetch(`${SITE_URL}/api/offers`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Falha ao ler catálogo atual (${res.status}): ${await res.text()}`);
  }
  return res.json();
}
