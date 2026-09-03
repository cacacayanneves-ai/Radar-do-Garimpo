import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeOffer } from "@/lib/serialize";

export const dynamic = "force-dynamic";

// Rota pública de leitura — lista todas as ofertas ativas do catálogo.
export async function GET() {
  const offers = await prisma.offer.findMany({
    orderBy: { primeiraDeteccao: "desc" },
  });

  return NextResponse.json(offers.map(serializeOffer));
}
