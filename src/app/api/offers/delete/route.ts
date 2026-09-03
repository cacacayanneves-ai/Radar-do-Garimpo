import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireScraperAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Uso interno do job de mineração. Aceita { id } ou { ids: string[] }.
export async function POST(req: NextRequest) {
  const authError = requireScraperAuth(req);
  if (authError) return authError;

  const body = await req.json();
  const ids: string[] = Array.isArray(body?.ids) ? body.ids : body?.id ? [body.id] : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "informe { id } ou { ids: string[] }" }, { status: 400 });
  }

  const result = await prisma.offer.deleteMany({ where: { id: { in: ids } } });

  return NextResponse.json({ deleted: result.count });
}
