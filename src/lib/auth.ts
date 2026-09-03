import { NextRequest, NextResponse } from "next/server";

// Protege as rotas internas de escrita usadas apenas pelo job de mineração.
// Aceita a chave tanto em `x-api-key` quanto em `Authorization: Bearer <chave>`.
export function requireScraperAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.SCRAPER_API_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "SCRAPER_API_SECRET não configurado no servidor." },
      { status: 500 }
    );
  }

  const headerKey = req.headers.get("x-api-key");
  const authHeader = req.headers.get("authorization");
  const bearerKey = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  const provided = headerKey || bearerKey;

  if (!provided || provided !== secret) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  return null;
}
