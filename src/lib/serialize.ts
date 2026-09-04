import type { Offer as PrismaOffer, MetaStatus as PrismaMetaStatus } from "@prisma/client";
import type { HistoryPoint, Offer, MetaStatus } from "./types";

export function serializeOffer(o: PrismaOffer): Offer {
  return {
    id: o.id,
    niche: o.niche,
    produto: o.produto,
    anunciante: o.anunciante,
    ticket: o.ticket,
    destino: "sales_page",
    vendaUrl: o.vendaUrl,
    libraryId: o.libraryId,
    pageId: o.pageId,
    collation: o.collation,
    concorrencia: o.concorrencia,
    concorrenciaEm: o.concorrenciaEm ? o.concorrenciaEm.toISOString() : null,
    internacional: o.internacional as Offer["internacional"],
    riscoPolitica: o.riscoPolitica,
    primeiraDeteccao: o.primeiraDeteccao.toISOString(),
    descoberta: o.descoberta,
    veiculacaoIniciada: o.veiculacaoIniciada ? o.veiculacaoIniciada.toISOString() : null,
    history: (o.history as unknown as HistoryPoint[]) ?? [],
  };
}

export function serializeStatus(s: PrismaMetaStatus): MetaStatus {
  return {
    id: s.id,
    lastRun: s.lastRun.toISOString(),
    lastRunNota: s.lastRunNota,
    offersTracked: s.offersTracked,
    novasHoje: s.novasHoje,
    podadasHoje: s.podadasHoje,
    escalations: (s.escalations as unknown as string[]) ?? [],
    diagnostico: s.diagnostico,
    keywordCursor: s.keywordCursor,
  };
}
