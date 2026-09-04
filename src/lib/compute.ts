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

// Nota do "Top 10": parte da oportunidade (muitos criativos rodando +
// pouca concorrência no nicho) e ajusta pelo momento da oferta — quem está
// escalando agora sobe, quem está esfriando desce, e quem acabou de ser
// descoberta ganha um empurrãozinho (é onde ainda dá pra entrar cedo).
export function topScore(o: Offer): number {
  const base = opportunity(o);
  const delta = computeDelta(o);

  let momento = 1;
  if (delta !== null && delta > 0) momento = 1.5;
  else if (delta !== null && delta < 0) momento = 0.7;

  const novidade = isNewThisWeek(o) ? 1.2 : 1;

  return base * momento * novidade;
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

// Extrai o valor numérico de um ticket tipo "R$ 27,90" — usado pro tile de
// ticket médio. Retorna null pra "n/d"/vazio/formato não reconhecido.
export function parseTicketValue(ticket: string | null): number | null {
  if (!ticket) return null;
  const m = ticket.match(/(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/);
  if (!m) return null;
  const valor = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
  return Number.isNaN(valor) ? null : valor;
}

// Dias desde que o ANUNCIANTE começou a veicular o anúncio ("Veiculação
// iniciada em", campo start_date da Biblioteca). De propósito NÃO cai pra
// primeiraDeteccao quando a data real falta: "há quanto tempo o robô achou"
// é outro número e mostrá-lo aqui seria enganoso — nesse caso a coluna
// mostra "n/d" até a próxima revalidação preencher a data de verdade.
export function diasNoAr(o: Offer): number | null {
  if (!o.veiculacaoIniciada) return null;
  const dias = (Date.now() - new Date(o.veiculacaoIniciada).getTime()) / 86400000;
  return Math.max(0, Math.floor(dias));
}
