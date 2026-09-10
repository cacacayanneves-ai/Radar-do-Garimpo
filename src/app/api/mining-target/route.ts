import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Rota pública (o painel não tem login) que troca o que a mineração de
// oferta NOVA busca na próxima rodada — botão "PV"/"Quiz" no painel. O
// robô só LÊ este campo (via GET /api/status); quem escreve é sempre uma
// pessoa clicando no painel, nunca o próprio robô.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const miningTarget = body?.miningTarget;

  if (miningTarget !== "sales_page" && miningTarget !== "quiz") {
    return NextResponse.json(
      { error: `miningTarget inválido ("${miningTarget}") — apenas "sales_page" ou "quiz".` },
      { status: 400 }
    );
  }

  const status = await prisma.metaStatus.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", miningTarget },
    update: { miningTarget },
  });

  return NextResponse.json({ miningTarget: status.miningTarget });
}
