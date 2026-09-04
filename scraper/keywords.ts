// Lista de keywords usadas na rotação de mineração de ofertas novas. A rodada
// varre a partir do cursor guardado no banco (ver keywordsFromCursor) até
// bater o alvo de ofertas novas ou o teto de tempo.
//
// REGRA AO ADICIONAR KEYWORD: mantenha a frase CURTA. A busca da Biblioteca é
// por frase exata, então "planner financeiro editável" volta ZERO enquanto
// "planner financeiro" volta 30 anúncios. Auditada a lista inteira em
// 04/09/2026: as 16 keywords que voltavam vazias eram todas frases longas com
// "editável"/"digital" no fim — encurtá-las resolveu 20 delas. Antes de
// incluir uma keyword nova, meça com scraper/auditarKeywords.ts; abaixo de
// ~10 anúncios ela quase não paga o tempo que consome na rodada.
//
// Ficam fora de propósito as keywords de concurso público (apostila PRF/PMMA/
// Petrobras/ENEM etc.): regra de negócio já confirmada é não minerar nesse
// nicho (mercado grande/saturado, dominado por players grandes).
//
// Sazonais (páscoa, halloween) rendem pouco fora de época — é esperado, não
// remova por causa disso.
export const KEYWORDS: string[] = [
  "PDF por apenas",
  "guia completo por apenas",
  "material digital por apenas",
  "acesso vitalício por apenas",
  "moldes por apenas",
  "pronto para imprimir",
  "apostila por apenas",
  "arquivo digital por apenas",
  "kit digital por apenas",
  "aulas em vídeo por apenas",
  "e-book por apenas",
  "curso online por apenas",
  "planilha por apenas",
  "modelo editável por apenas",
  "receba em PDF",
  "gráficos de crochê",
  "moldes de costura",
  "moldes de crochê",
  "receitas de crochê",
  "pontos de crochê",
  "amigurumi passo a passo",
  "moldes de tricô",
  "curso de corte e costura",
  "moldes de roupas infantis",
  "moldes de bolsas",
  "moldes de vestidos",
  "touca de crochê",
  "moldes editáveis Canva",
  "kit festa infantil digital",
  "convites editáveis digital",
  "topo de bolo para imprimir",
  "moldes de letras",
  "moldes de números",
  "kit lembrancinha digital",
  "revistinha para colorir",
  "paper squishy",
  "kit digital de etiquetas",
  "planner para imprimir",
  "moldes de EVA",
  "scrapbook",
  "tags personalizadas",
  "atividades de alfabetização",
  "consciência fonológica",
  "atividades para imprimir educação infantil",
  "caderno de caligrafia",
  "desenhos para colorir",
  "kit de atividades por apenas",
  "sequência didática pronta",
  "jogos pedagógicos para imprimir",
  "atividades de matemática infantil",
  "grafismo e alfabetização",
  "dot to dot",
  "livro personalizado por IA",
  "projetos de robótica",
  "robótica infantil kit",
  "brincadeiras sem tela",
  "feira de ciências pronta",
  "experimentos científicos para imprimir",
  "planilhas de treino",
  "guia de musculação",
  "guia da barra fixa",
  "curso de extensão de cílios",
  "curso de design de sobrancelhas",
  "spa dos pés curso",
  "curso de alongamento de unhas",
  "protocolo de treino em casa",
  "curso de maquiagem online",
  "curso de manicure online",
  "curso de micropigmentação",
  "catequese atividades",
  "devocional católica",
  "estudo bíblico em PDF",
  "abas divisórias para bíblia",
  "kit crochê católico",
  "cartão evangelismo digital",
  "escola dominical atividades",
  "roupinhas pet moldes",
  "apostila de veterinária",
  "doenças bovinas",
  "curso de adestramento online",
  "roupinha de cachorro",
  "projetos de serralheria",
  "curso de refrigeração",
  "curso de climatização",
  "manual do eletricista",
  "projetos de marcenaria",
  "apostila de elétrica residencial",
  "mesa posta moldes",
  "arteterapia atividades",
  "harmonização facial estudo",
  "planner financeiro",
  "receitas de geladinho gourmet",
  "cardápio de confeitaria digital",
  "curso de brigadeiro gourmet",
  "curso de doces gourmet",
  "guia de organização da casa",
  "curso de jardinagem online",
  "tarot guia completo",
  "curso de numerologia",
  "apostila de inglês",
  "curso de espanhol online",
  "curso de desenho realista",
  "moldes de bordado",

  // Segunda leva — nichos grandes do mercado brasileiro de baixo ticket que
  // ainda não estavam cobertos (maternidade, casamento, datas sazonais,
  // creator economy, finanças pessoais, journaling, neurodivergência,
  // ofícios adicionais).
  "chá de bebê",
  "diário da gestante",
  "mesversário",
  "planner de gravidez",
  "álbum do bebê",
  "chá revelação",
  "convites de casamento digital",
  "kit noiva digital",
  "lista de convidados",
  "livro de assinaturas",
  "moldes de natal",
  "moldes de páscoa",
  "moldes de halloween",
  "kit natal digital",
  "kit páscoa digital",
  "decoração junina para imprimir",
  "templates para Canva Instagram",
  "pack de stories editáveis",
  "kit redes sociais digital",
  "moldura para reels",
  "planner de conteúdo editável",
  "planilha de controle financeiro",
  "orçamento doméstico",
  "planilha de gastos mensais",
  "bullet journal",
  "diário de gratidão para imprimir",
  "planner de metas",
  "diário de autoconhecimento",
  "rotina visual autismo",
  "material PECS para imprimir",
  "quadro de rotina infantil",
  "material TDAH para imprimir",
  "curso de barbeiro online",
  "curso de corte masculino",
  "catálogo de tatuagem",
  "unhas decoradas",
  "cardápio digital editável",
  "planner de estudos",
  "kit professor digital",
];

// Normaliza um cursor vindo do banco (pode estar fora da faixa se a lista
// encolher) para um índice válido da lista.
export function normalizarCursor(cursor: number): number {
  if (!Number.isFinite(cursor)) return 0;
  const n = Math.trunc(cursor) % KEYWORDS.length;
  return n < 0 ? n + KEYWORDS.length : n;
}

// Lista inteira reordenada pra começar em `cursor`, em rotação circular. A
// rodada varre a partir daí e para quando bate o alvo de ofertas novas ou o
// teto de tempo — o índice onde parou vira o cursor da próxima rodada, então
// nenhuma keyword é varrida duas vezes seguidas e, ao longo dos dias, a lista
// toda é coberta. (Antes o ponto de partida era o dia do ano: as duas rodadas
// do mesmo dia usavam as MESMAS keywords e dois dias seguidos repetiam quase
// todas — daí o volume de duplicadas e o catálogo parado.)
export function keywordsFromCursor(cursor: number): string[] {
  const start = normalizarCursor(cursor);
  return KEYWORDS.map((_, i) => KEYWORDS[(start + i) % KEYWORDS.length]);
}
