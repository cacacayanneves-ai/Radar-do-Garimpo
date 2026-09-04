import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeStatus } from "@/lib/serialize";

export const dynamic = "force-dynamic";

// Rota pública de leitura — resumo da última rodada de mineração.
export async function GET() {
  const status = await prisma.metaStatus.findUnique({ where: { id: "singleton" } });

  if (!status) {
    return NextResponse.json({
      id: "singleton",
      lastRun: null,
      lastRunNota: "Nenhuma mineração rodou ainda.",
      offersTracked: 0,
      novasHoje: 0,
      podadasHoje: 0,
      escalations: [],
      diagnostico: "",
    });
  }

  return NextResponse.json(serializeStatus(status));
}
