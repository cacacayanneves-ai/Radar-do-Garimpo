import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireScraperAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface DeleteItem {
  id: string;
  motivo: string;
}

// Uso interno do job de mineração. Aceita { items: { id, motivo }[] }.
// Antes de apagar, grava um registro permanente em PrunedOffer — a Offer
// some do catálogo (hard delete), mas o motivo da remoção fica pra sempre,
// consultável em GET /api/podadas.
export async function POST(req: NextRequest) {
  const authError = requireScraperAuth(req);
  if (authError) return authError;

  const body = await req.json();
  const items: DeleteItem[] = Array.isArray(body?.items) ? body.items : [];

  if (items.length === 0) {
    return NextResponse.json({ error: "informe { items: { id, motivo }[] }" }, { status: 400 });
  }

  const motivoPorId = new Map(items.map((i) => [i.id, i.motivo]));
  const ids = items.map((i) => i.id);

  const deleted = await prisma.$transaction(async (tx) => {
    const offers = await tx.offer.findMany({ where: { id: { in: ids } } });

    if (offers.length > 0) {
      await tx.prunedOffer.createMany({
        data: offers.map((o) => ({
          offerId: o.id,
          produto: o.produto,
          anunciante: o.anunciante,
          niche: o.niche,
          vendaUrl: o.vendaUrl,
          libraryId: o.libraryId,
          motivo: motivoPorId.get(o.id) ?? "motivo não informado",
        })),
      });
    }

    const result = await tx.offer.deleteMany({ where: { id: { in: ids } } });
    return result.count;
  });

  return NextResponse.json({ deleted });
}
