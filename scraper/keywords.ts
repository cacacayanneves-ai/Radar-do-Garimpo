// Lista de 22 keywords usadas na rotação circular de mineração de ofertas novas.
// Índice inicial = dia do ano % 22; cada rodada pega as 7 seguintes (circular).
export const KEYWORDS: string[] = [
  "PDF por apenas",
  "guia completo por apenas",
  "moldes por apenas",
  "material digital por apenas",
  "acesso vitalício por apenas",
  "apostila por apenas",
  "kit digital por apenas",
  "gráficos de crochê",
  "moldes de costura",
  "desenhos para colorir",
  "planilhas de treino",
  "projetos de serralheria",
  "curso de refrigeração",
  "arteterapia",
  "catequese",
  "caligrafia",
  "roupinhas pet",
  "mesa posta",
  "anatomia veterinária",
  "consciência fonológica",
  "moldes de letras",
  "kit de atividades por apenas",
];

export function dayOfYear(date: Date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

// Retorna as próximas `count` keywords, em rotação circular, a partir do
// índice determinado pelo dia do ano — garante cobertura de todas ao longo
// do tempo sem repetir sempre as mesmas primeiras da lista.
export function keywordsForToday(count = 7, date: Date = new Date()): string[] {
  const start = dayOfYear(date) % KEYWORDS.length;
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(KEYWORDS[(start + i) % KEYWORDS.length]);
  }
  return result;
}
