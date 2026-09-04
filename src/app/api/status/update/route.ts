import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireScraperAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface StatusPayload {
  lastRun?: string;
  lastRunNota: string;
  offersTracked: number;
  novasHoje: number;
  podadasHoje: number;
  escalations?: string[];
  diagnostico?: string;
}

// Uso interno do job de mineração — grava o resumo da rodada.
export async function POST(req: NextRequest) {
  const authError = requireScraperAuth(req);
  if (authError) return authError;

  const body: StatusPayload = await req.json();

  if (typeof body.lastRunNota !== "string") {
    return NextResponse.json({ error: "lastRunNota é obrigatório" }, { status: 400 });
  }

  const data = {
    lastRun: body.lastRun ? new Date(body.lastRun) : new Date(),
    lastRunNota: body.lastRunNota,
    offersTracked: body.offersTracked ?? 0,
    novasHoje: body.novasHoje ?? 0,
    podadasHoje: body.podadasHoje ?? 0,
    escalations: (body.escalations ?? []) as unknown as Prisma.InputJsonValue,
    diagnostico: body.diagnostico ?? "",
  };

  const status = await prisma.metaStatus.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data,
  });

  return NextResponse.json(status);
}
