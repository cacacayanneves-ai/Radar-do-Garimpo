// Lista de keywords usadas na rotação de mineração de ofertas novas. A rodada
// varre a partir do cursor guardado no banco (ver keywordsFromCursor) até
// bater o alvo de ofertas novas ou o teto de tempo.
//
// ESCOPO (definido pelo Cayan em 04/09/2026): APENAS três nichos —
//   1. SAÚDE E BEM-ESTAR (amplo: emagrecimento, treino, enfermagem, saúde
//      mental, terapias holísticas).
//   2. RELIGIÃO.
//   3. RENDA EXTRA — inclui artesanato e ofício: quem aprende pra produzir e
//      vender (crochê, costura, papelaria de festa, confeitaria, elétrica) e
//      quem quer vender online.
// Ficaram de fora, por não serem nenhum dos três: educação/pedagogia,
// idiomas, maternidade/gestação, casamento, finanças pessoais, agro e
// estética/beleza (cílios, sobrancelha, manicure, barbeiro, tatuagem) — esta
// última o Cayan cortou explicitamente, nem como saúde nem como ofício.
//
// REGRA AO ADICIONAR KEYWORD: mantenha a frase CURTA. A busca da Biblioteca é
// por frase exata, então "planner financeiro editável" volta ZERO enquanto
// "planner financeiro" volta 30 anúncios. Meça com scraper/auditarKeywords.ts
// antes de incluir; abaixo de ~10 anúncios a keyword quase não paga o tempo
// que consome na rodada. Todas as daqui foram medidas.
//
// Não entram keywords genéricas de formato ("PDF por apenas", "e-book por
// apenas"): rendem bem, mas trazem qualquer nicho — foi o que enchia o painel
// de oferta fora do escopo.
//
// Sazonais (natal, páscoa, halloween, junina) rendem pouco fora de época — é
// esperado, não remova por causa disso.
export const KEYWORDS: string[] = [
  // ---------------------------------------------------------------- SAÚDE
  "guia de emagrecimento",
  "protocolo de emagrecimento",
  "cardápio de emagrecimento",
  "jejum intermitente",
  "receitas low carb",
  "receitas fit",
  "alimentação saudável",
  "receitas para diabéticos",
  "treino em casa",
  "treino para mulheres",
  "protocolo de treino em casa",
  "planilhas de treino",
  "guia de musculação",
  "guia da barra fixa",
  "alongamento em casa",
  "exercícios para dor nas costas",
  "yoga para iniciantes",
  "fisioterapia pélvica",
  "saúde da mulher",
  "menopausa",
  "guia do sono",
  "guia de primeiros socorros",
  "apostila de enfermagem",
  "resumos de enfermagem",
  "resumo de farmacologia",
  // Saúde mental e bem-estar
  "controle da ansiedade",
  "meditação guiada",
  "diário de gratidão para imprimir",
  "diário de autoconhecimento",
  "arteterapia atividades",
  // Terapias holísticas — o Cayan confirmou que entram em saúde
  "terapias holísticas",
  "aromaterapia",
  "reiki",
  "florais de bach",
  "auriculoterapia",
  "cromoterapia",
  "massagem relaxante",
  "tarot guia completo",
  "curso de numerologia",
  // Dietas e alimentação específica
  "dieta cetogênica",
  "receitas sem glúten",
  "receitas sem lactose",
  "guia de nutrição",
  "caminhada para emagrecer",
  "barriga chapada",
  // Treino
  "pilates em casa",
  "hipertrofia feminina",
  "ganhar massa muscular",
  // Condições e queixas comuns
  "intestino preso",
  "refluxo e gastrite",
  "colesterol alto",
  "pressão alta",
  "enxaqueca",
  "insônia",
  "dor no joelho",
  "hérnia de disco",
  "saúde do homem",
  // Estudo da área da saúde
  "resumo de anatomia",
  // Saúde mental (complementa o bloco acima)
  "crise de ansiedade",
  "autoestima",
  "mindfulness",

  // ------------------------------------------------------------- RELIGIÃO
  "devocional católica",
  "catequese atividades",
  "estudo bíblico em PDF",
  "estudo bíblico para mulheres",
  "estudo de salmos",
  "plano de leitura bíblica",
  "oração diária",
  "novena",
  "abas divisórias para bíblia",
  "kit crochê católico",
  "cartão evangelismo digital",
  "escola dominical atividades",
  "atividades bíblicas infantis",
  "material de discipulado",
  "sermão pronto",
  "devocional para casais",
  "cifras gospel",
  // Termos amplos — pegam evangélico e católico de uma vez
  "devocional",
  "estudo bíblico",
  "bíblia de estudo",
  "versículos para imprimir",
  "diário de oração",
  // Católico
  "orações católicas",
  "livro de orações",
  "santo terço",
  "material de crisma",
  "primeira eucaristia",
  // Evangélico
  "guerra espiritual",
  "esboço de sermão",
  "pregação pronta",
  "ministério infantil",
  "culto infantil",
  "escola dominical infantil",
  // Público específico
  "mulher de fé",
  "casamento cristão",

  // ----------------------------------------------------------- RENDA EXTRA
  // Vender / trabalhar por conta
  "renda extra em casa",
  "trabalhar em casa",
  "vender no Mercado Livre",
  "brechó online",
  "artesanato para vender",
  "crochê para vender",
  "personalizados para vender",
  "lembrancinhas para vender",
  "kit de festa para vender",
  "vender na Shopee",
  "revenda de roupas",
  "dropshipping",
  "marketing digital",
  "afiliado iniciante",
  "adesivos para vender",
  "canecas personalizadas",
  "sublimação",
  "cuidador de idosos",
  // Crochê, tricô, costura
  "gráficos de crochê",
  "moldes de crochê",
  "receitas de crochê",
  "pontos de crochê",
  "amigurumi passo a passo",
  "moldes de tricô",
  "touca de crochê",
  "moldes de costura",
  "curso de corte e costura",
  "curso de costura para iniciantes",
  "moldes de roupas infantis",
  "moldes de vestidos",
  "moldes de bolsas",
  "moldes de bordado",
  "roupinhas pet moldes",
  "roupinha de cachorro",
  // Papelaria digital, festa e artesanato
  "moldes editáveis Canva",
  "kit festa infantil digital",
  "topo de bolo para imprimir",
  "kit lembrancinha digital",
  "kit digital de etiquetas",
  "moldes de letras",
  "moldes de números",
  "revistinha para colorir",
  "paper squishy",
  "planner para imprimir",
  "moldes de EVA",
  "scrapbook",
  "tags personalizadas",
  "mesa posta moldes",
  "moldes de feltro",
  "patchwork",
  "velas artesanais",
  "sabonetes artesanais",
  "resina epóxi",
  "biscuit passo a passo",
  "mesversário",
  "chá revelação",
  // Sazonais
  "moldes de natal",
  "kit natal digital",
  "moldes de páscoa",
  "kit páscoa digital",
  "moldes de halloween",
  "decoração junina para imprimir",
  // Gastronomia pra vender
  "salgados para vender",
  "doces para vender",
  "bolo no pote",
  "marmitas para vender",
  "receitas de geladinho gourmet",
  "curso de brigadeiro gourmet",
  "curso de doces gourmet",
  "cardápio de confeitaria digital",
  "cardápio digital editável",
  "confeitaria para iniciantes",
  "pães caseiros",
  "hambúrguer artesanal",
  // Ofícios técnicos
  "manual do eletricista",
  "apostila de elétrica residencial",
  "curso de refrigeração",
  "curso de climatização",
  "projetos de marcenaria",
  "projetos de serralheria",
  "curso de adestramento online",
  "curso de jardinagem online",
  // Serviços digitais
  "templates para Canva Instagram",
  "pack de stories editáveis",
  "kit redes sociais digital",
  "planner de conteúdo editável",
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
