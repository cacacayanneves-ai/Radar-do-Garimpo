import type { Internacional } from "@/lib/types";

// Termos que indicam produto preso a instituição/idioma/currículo brasileiro
// (heurística "Baixa" potencial internacional).
const LOCAL_TERMS = [
  "concurso público",
  "concurso publico",
  "enem",
  "vestibular",
  "detran",
  "receita federal",
  "inss",
  "catequese",
  "primeira comunhão",
  "crisma",
  "devocional católico",
  "devocional catolico",
  "alfabetização",
  "alfabetizacao",
  "português",
  "portugues",
];

// Termos que indicam conceito exportável mas com forte componente textual em
// português (heurística "Media").
const MEDIA_TERMS = [
  "devocional",
  "harmonização facial",
  "harmonizacao facial",
  "papelaria",
  "planner",
  "oração",
  "oracao",
  "bíblia",
  "biblia",
];

// Termos majoritariamente visuais/universais (heurística "Alta").
const VISUAL_TERMS = [
  "molde",
  "gráfico",
  "grafico",
  "crochê",
  "croche",
  "desenho",
  "colorir",
  "diagrama",
  "treino",
  "exercício",
  "exercicio",
  "receita",
  "amigurumi",
];

export function guessInternacional(niche: string, produto: string): Internacional {
  const text = `${niche} ${produto}`.toLowerCase();

  if (LOCAL_TERMS.some((t) => text.includes(t))) return "Baixa";
  if (VISUAL_TERMS.some((t) => text.includes(t))) return "Alta";
  if (MEDIA_TERMS.some((t) => text.includes(t))) return "Media";

  return "Media";
}

// Termos que insinuam condição de saúde do usuário no criativo — mesmo que o
// produto em si seja inofensivo, a Meta pode sinalizar o texto do anúncio.
const HEALTH_RISK_TERMS = [
  "emagrec",
  "gordura",
  "barriga",
  "memória",
  "memoria",
  "cognição",
  "cognicao",
  "ansiedade",
  "depressão",
  "depressao",
  "diabetes",
  "colesterol",
  "pressão alta",
  "pressao alta",
  "dor crônica",
  "dor cronica",
  "insônia",
  "insonia",
  "transtorno",
  "doença",
  "doenca",
];

export function guessRiscoPolitica(adText: string): boolean {
  const text = adText.toLowerCase();
  return HEALTH_RISK_TERMS.some((t) => text.includes(t));
}

// Extrai um valor "R$ X" do texto do anúncio, se houver, e valida a faixa
// low-ticket (R$ 9 a R$ 50). Retorna null se não encontrar preço declarado.
export function extractTicket(adText: string): string | null {
  const match = adText.match(/R\$\s?(\d{1,3}(?:[.,]\d{2})?)/);
  if (!match) return null;
  return `R$ ${match[1].replace(".", ",")}`;
}

export function ticketInRange(ticket: string | null): boolean {
  if (!ticket) return true; // sem preço declarado — aceito se o formato indicar low-ticket.
  const value = parseFloat(ticket.replace("R$", "").replace(",", ".").trim());
  if (Number.isNaN(value)) return true;
  return value >= 9 && value <= 50;
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos (marcas diacríticas combinantes)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function generateOfferId(produto: string, anunciante: string, libraryId: string): string {
  const base = slugify(`${anunciante}-${produto}`) || slugify(anunciante) || "oferta";
  return `${base}-${libraryId.slice(-6)}`;
}

export function isWhatsappLink(url: string | null): boolean {
  if (!url) return false;
  return url.includes("api.whatsapp.com/send");
}

export function isGenericInstagramProfile(url: string | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (!u.hostname.includes("instagram.com")) return false;
    const path = u.pathname.replace(/^\/|\/$/g, "");
    // Domínio raiz (sem @usuário nenhum) ou só o @usuário, sem indicação de
    // produto/loja/link externo — em ambos os casos não é uma página de
    // venda de verdade.
    return !path.includes("/");
  } catch {
    return false;
  }
}
