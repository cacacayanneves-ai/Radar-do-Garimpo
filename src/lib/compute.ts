import type { Offer } from "./types";

// Espelha exatamente a lógica de negócio validada no protótipo original.
// Mantida isolada (sem dependências de UI) para poder ser usada tanto no
// cliente (ordenação/filtro em tempo real) quanto em testes futuros.

export function computeDelta(o: Offer): number | null {
  const h = o.history || [];
  if (h.length < 2) return null;
  return h[h.length - 1].c - h[h.length - 2].c;
}

export function isNewThisWeek(o: Offer): boolean {
  if (!o.primeiraDeteccao) return false;
  const days = (Date.now() - new Date(o.primeiraDeteccao).getTime()) / 86400000;
  return o.descoberta && days <= 7;
}

export function opportunity(o: Offer): number {
  const comp = o.concorrencia || 2000;
  return ((o.collation || 1) / comp) * 1000; // sinal alto + concorrência baixa = oportunidade alta
}

export function isEscalatingStrong(collationHoje: number, collationOntem: number): boolean {
  const delta = collationHoje - collationOntem;
  if (delta >= 2) return true;
  if (collationOntem >= 1 && collationHoje >= collationOntem * 2) return true;
  return false;
}

export function competitionBand(concorrencia: number | null): "moss" | "brass" | "clay" {
  const n = concorrencia ?? 0;
  if (n <= 350) return "moss";
  if (n <= 900) return "brass";
  return "clay";
}
