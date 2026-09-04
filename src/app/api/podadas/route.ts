import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Rota pública de leitura — histórico permanente de ofertas removidas do
// catálogo, com o motivo de cada uma. Existe porque a Offer some pra sempre
// quando é podada (hard delete) e o diagnóstico da mineração (MetaStatus) só
// guarda a última rodada. ?limit=N (padrão 100, máx 500) controla quantas
// vêm, mais recente primeiro.
export async function GET(req: NextRequest) {
  const limitParam = Number(req.nextUrl.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : 100;

  const podadas = await prisma.prunedOffer.findMany({
    orderBy: { podadoEm: "desc" },
    take: limit,
  });

  return NextResponse.json(
    podadas.map((p) => ({
      id: p.id,
      offerId: p.offerId,
      produto: p.produto,
      anunciante: p.anunciante,
      niche: p.niche,
      vendaUrl: p.vendaUrl,
      libraryId: p.libraryId,
      motivo: p.motivo,
      podadoEm: p.podadoEm.toISOString(),
    }))
  );
}
