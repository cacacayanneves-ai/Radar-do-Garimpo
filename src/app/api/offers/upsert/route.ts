import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireScraperAuth } from "@/lib/auth";
import type { HistoryPoint } from "@/lib/types";

export const dynamic = "force-dynamic";

interface UpsertPayload {
  id: string;
  niche: string;
  produto: string;
  anunciante: string;
  ticket?: string | null;
  destino: string;
  vendaUrl: string;
  libraryId: string;
  pageId: string;
  collation?: number | null;
  concorrencia?: number | null;
  concorrenciaEm?: string | null;
  internacional: "Alta" | "Media" | "Baixa";
  riscoPolitica?: boolean;
  primeiraDeteccao: string;
  descoberta?: boolean;
  veiculacaoIniciada?: string | null;
  history?: HistoryPoint[];
}

const MAX_HISTORY_POINTS = 45;

function validate(o: UpsertPayload): string | null {
  if (!o.id) return "id é obrigatório";
  if (!o.niche) return "niche é obrigatório";
  if (!o.produto) return "produto é obrigatório";
  if (!o.anunciante) return "anunciante é obrigatório";
  if (!o.vendaUrl) return "vendaUrl é obrigatório";
  if (!o.libraryId) return "libraryId é obrigatório";
  if (!o.pageId) return "pageId é obrigatório";
  if (!o.primeiraDeteccao) return "primeiraDeteccao é obrigatório";
  if (o.destino !== "sales_page") {
    return `destino inválido ("${o.destino}") — apenas "sales_page" é aceito (regra de negócio: nunca WhatsApp).`;
  }
  if (o.vendaUrl.includes("api.whatsapp.com/send")) {
    return "vendaUrl aponta para WhatsApp — rejeitado por regra de negócio.";
  }
  return null;
}

async function upsertOne(o: UpsertPayload) {
  const history = (o.history ?? []).slice(-MAX_HISTORY_POINTS);

  await prisma.offer.upsert({
    where: { id: o.id },
    create: {
      id: o.id,
      niche: o.niche,
      produto: o.produto,
      anunciante: o.anunciante,
      ticket: o.ticket ?? null,
      destino: "sales_page",
      vendaUrl: o.vendaUrl,
      libraryId: o.libraryId,
      pageId: o.pageId,
      collation: o.collation ?? null,
      concorrencia: o.concorrencia ?? null,
      concorrenciaEm: o.concorrenciaEm ? new Date(o.concorrenciaEm) : null,
      internacional: o.internacional,
      riscoPolitica: o.riscoPolitica ?? false,
      primeiraDeteccao: new Date(o.primeiraDeteccao),
      descoberta: o.descoberta ?? true,
      veiculacaoIniciada: o.veiculacaoIniciada ? new Date(o.veiculacaoIniciada) : null,
      history: history as unknown as Prisma.InputJsonValue,
    },
    update: {
      niche: o.niche,
      produto: o.produto,
      anunciante: o.anunciante,
      ticket: o.ticket ?? null,
      destino: "sales_page",
      vendaUrl: o.vendaUrl,
      libraryId: o.libraryId,
      pageId: o.pageId,
      collation: o.collation ?? null,
      concorrencia: o.concorrencia ?? null,
      concorrenciaEm: o.concorrenciaEm ? new Date(o.concorrenciaEm) : undefined,
      internacional: o.internacional,
      riscoPolitica: o.riscoPolitica ?? false,
      descoberta: o.descoberta ?? false,
      // Só sobrescreve se veio um valor — evita apagar uma data já
      // gravada quando uma rodada não conseguiu reler a página.
      veiculacaoIniciada: o.veiculacaoIniciada ? new Date(o.veiculacaoIniciada) : undefined,
      history: history as unknown as Prisma.InputJsonValue,
    },
  });
}

// Uso interno do job de mineração. Aceita um único objeto de oferta ou
// { offers: Offer[] } para upsert em lote.
export async function POST(req: NextRequest) {
  const authError = requireScraperAuth(req);
  if (authError) return authError;

  const body = await req.json();
  const list: UpsertPayload[] = Array.isArray(body?.offers) ? body.offers : [body];

  const errors: { id?: string; error: string }[] = [];
  let ok = 0;

  for (const o of list) {
    const err = validate(o);
    if (err) {
      errors.push({ id: o?.id, error: err });
      continue;
    }
    try {
      await upsertOne(o);
      ok++;
    } catch (e) {
      errors.push({ id: o.id, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json({ ok, failed: errors.length, errors });
}
