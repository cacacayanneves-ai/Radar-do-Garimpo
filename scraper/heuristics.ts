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

// A busca por palavra-chave da Biblioteca de Anúncios é solta — ela traz
// anúncios que só tangenciam a keyword (ex: buscando "kit digital por
// apenas" também aparece "compre um carro usado sem entrada"). Isso não é
// infoproduto nenhum. Esse filtro exige um sinal claro de material digital
// (PDF, apostila, molde, planilha, curso online etc.) E rejeita de cara
// qualquer sinal forte de produto físico/serviço presencial/oferta
// financeira — mesmo heurístico, mesma limitação: não substitui revisão
// manual, só reduz o volume de lixo óbvio.
const DIGITAL_PRODUCT_SIGNALS = [
  "pdf",
  "e-book",
  "ebook",
  "apostila",
  "apostilas",
  "molde",
  "moldes",
  "gráfico",
  "graficos",
  "gráficos",
  "planilha",
  "planilhas",
  "kit digital",
  "material digital",
  "arquivo digital",
  "arquivos digitais",
  "curso online",
  "curso 100% online",
  "acesso imediato",
  "acesso vitalício",
  "acesso vitalicio",
  "receba no seu e-mail",
  "direto no seu e-mail",
  "envio digital",
  "download",
  "arte digital",
  "editável",
  "editavel",
  "impressão",
  "para imprimir",
  "colorir",
  "atividades prontas",
  "atividades para",
  "desenhos para",
  "prontas para imprimir",
  // Termos que quase só aparecem em PÁGINA DE VENDA de infoproduto — o
  // anúncio raramente diz o formato, a página sempre diz.
  "área de membros",
  "area de membros",
  "baixe agora",
  "baixar agora",
  "videoaulas",
  "vídeo aulas",
  "video aulas",
  "aulas gravadas",
  "conteúdo digital",
  "conteudo digital",
];

const NON_DIGITAL_SIGNALS = [
  "carro usado",
  "carro seminovo",
  "sem entrada",
  "entrada facilitada",
  "financiamento",
  "propriedade rural",
  "piquete",
  "máquinas agrícolas",
  "maquinas agricolas",
  "curso presencial",
  "vagas limitadas para a turma",
  "consulta médica",
  "consulta medica",
  "imóvel",
  "imovel",
  "imóveis",
  "seguro de vida",
  "empréstimo consignado",
  "emprestimo consignado",
  "cartão de crédito",
  "cartao de credito",
  "vaga de emprego",
  "envie seu currículo",
  "envie seu curriculo",
  "agendar visita",
  "test drive",
  "km rodados",
  "km rodado",
  // Formulário de captação de lead (não é venda direta/self-service).
  "preencha o formulário",
  "preencha o formulario",
  "cadastre-se agora",
  "cadastre-se gratuitamente",
  "deixe seus dados",
  "deixe seu contato",
  "receba uma ligação",
  "receba uma ligacao",
  "fale com um consultor",
  "fale com um especialista",
  "agende uma consulta",
  "agende uma call",
  "solicite um orçamento",
  "solicite um orcamento",
  "orçamento sem compromisso",
  "orcamento sem compromisso",
  "inscreva-se para saber mais",
  // Concurso público / mercado dominado por players grandes — pedido
  // explícito: fora do radar, mesmo quando parece um infoproduto digital.
  "concurso público",
  "concurso publico",
  "concurseiro",
  "concurseira",
  "edital publicado",
  "edital do concurso",
  "banca examinadora",
  "cargo público",
  "cargo publico",
  "prova objetiva",
  "vestibular",
  "detran",
  "simulado concurso",
  "apostila concurso",
  "questões comentadas",
  "concurso prf",
  "concurso pmma",
  "concurso pm ",
  "concurso petrobras",
  "apostila enem",
  "concurso enem",
  // Concurso militar/policial: "Preparatório CBMMA" passou porque a lista
  // só tinha as palavras genéricas ("concurso público", "edital"), e o
  // anúncio usava só a sigla da corporação.
  "preparatório",
  "preparatorio",
  "bombeiro militar",
  "polícia militar",
  "policia militar",
  "polícia civil",
  "policia civil",
  "soldado pm",
  "cbm",
  "pmma",
  "prf",
  "apostila digital para concurso",
  // Software/ferramenta/licença — é produto digital, mas não é infoproduto
  // (ex: speedcorel.com, que vende macro pro CorelDRAW). Fora do escopo.
  "macro para corel",
  "macros para corel",
  "plugin para",
  "licença de uso",
  "licenca de uso",
  "chave de ativação",
  "chave de ativacao",
  "instalador",
  "versão vitalícia do software",
  "assinatura mensal do sistema",
];

// true = o texto tem um sinal forte de produto físico/serviço
// presencial/oferta financeira — nesse caso o candidato é sempre descartado,
// mesmo que também tenha um preço declarado ou uma palavra "digital" solta.
export function hasNonDigitalSignal(adText: string): boolean {
  const text = adText.toLowerCase();
  return NON_DIGITAL_SIGNALS.some((t) => text.includes(t));
}

// true = o texto menciona explicitamente um formato de material digital
// (PDF, apostila, molde, planilha etc.).
export function hasDigitalProductSignal(adText: string): boolean {
  const text = adText.toLowerCase();
  return DIGITAL_PRODUCT_SIGNALS.some((t) => text.includes(t));
}

// A lista de "palavras só do espanhol" que existia aqui foi removida: várias
// delas ("responde", "cómo" sem acento em texto sem acentuação) também são
// português, e ela reprovava página brasileira boa — pegou a oferta da
// Maximus Tecidos, que o Cayan já tinha validado. Quem cuida de idioma agora
// é pareceOutroIdioma, que exige marcas de português (ç, ã, ção, não) em vez
// de caçar palavras de outro idioma: espanhol e inglês não têm essas marcas,
// e página brasileira tem às dezenas.

// Página que pede dados de contato pra "liberar" o conteúdo, em vez de
// vender direto — formulário de captação de lead, não é a oferta se
// vendendo sozinha.
// Só sinais FORTES: "preencha seus dados"/"preencha os dados" saíram da
// lista porque loja de produto digital legítima (WooCommerce) usa essas
// frases no checkout — dava falso positivo em página de venda de verdade.
const LEAD_FORM_PAGE_SIGNALS = [
  "preencha o formulário",
  "preencha o formulario",
  "acesse o conteúdo",
  "acesse o conteudo",
  "receber comunicações",
  "receber comunicacoes",
  "nome*",
  "telefone*",
  "email*",
];

// Uma página de conteúdo/blog costuma linkar pra várias receitas/produtos
// diferentes em vez de vender uma única oferta — várias ocorrências de
// "veja aqui"/"confira aqui"/"baixe aqui"/"aprenda aqui" é um sinal forte
// disso (visto na prática: um post de blog com N receitas diferentes, cada
// uma linkando pra um e-book/página distinta).
const CONTENT_HUB_LINK_PATTERN = /\b(veja|confira|aprenda|baixe)\s+(aqui|a receita)\b/gi;
const CONTENT_HUB_MIN_OCCURRENCES = 3;

// Quiz de captação em português — mesmo padrão do quiz em espanhol que já
// era rejeitado ("Responde 4 preguntas"), só que na versão BR. Visto na
// prática em lucrativoatelie.netlify.app: "Qual dessas opções mais combina
// com você? / Leva menos de 3 minutos".
const QUIZ_FUNNEL_SIGNALS = [
  "qual dessas opções",
  "qual dessas opcoes",
  "responda as perguntas",
  "responda essas perguntas",
  "leva menos de 1 minuto",
  "leva menos de 2 minutos",
  "leva menos de 3 minutos",
  "responda o quiz",
  "faça o quiz",
  "faca o quiz",
];

// Loja de produto FÍSICO. O sinal decisivo é frete/entrega — "carrinho" e
// "adicionar ao carrinho" não servem, porque loja de produto digital
// legítima (WooCommerce etc.) também tem carrinho.
// Marcas que praticamente só existem em português. Uma página de venda
// brasileira de verdade tem dezenas delas; página em inglês não tem nenhuma,
// e espanhol também não (usa "ñ", não "ç"/"ã"). Serve pra barrar oferta
// internacional que anuncia pro Brasil mas vende em outro idioma — entrou
// uma certificação de coach em inglês (efficientcoach.com) por não existir
// checagem de inglês, só de espanhol.
// Só marcas acentuadas: chegaram a entrar "lh" e "nh" (que não existem em
// espanhol nem inglês), mas palavras inglesas comuns como "unhappy" e
// "enhance" contêm "nh" e enfraqueciam a detecção de inglês. Página de venda
// brasileira sem NENHUM ç/ã/ção em 400+ caracteres é rara o bastante pra não
// compensar esse risco.
const PORTUGUESE_MARKERS = ["ção", "não", "você", "ões", "ç", "ã"];
const MIN_MARCAS_PORTUGUES = 5;

// Só julga texto com tamanho suficiente — página curta ou quase toda em
// imagem não dá pra avaliar, e nesse caso não rejeita (não inventa motivo
// pra descartar oferta que pode ser boa).
export function pareceOutroIdioma(pageText: string): boolean {
  const text = pageText.toLowerCase();
  if (text.length < 400) return false;

  let marcas = 0;
  for (const marca of PORTUGUESE_MARKERS) {
    let i = text.indexOf(marca);
    while (i !== -1) {
      marcas++;
      if (marcas >= MIN_MARCAS_PORTUGUES) return false;
      i = text.indexOf(marca, i + 1);
    }
  }
  return true;
}

// Confirma que a frase aparece SEM negação logo antes ("não", "nao", "sem")
// — uma página de infoproduto de verdade costuma dizer explicitamente "isso
// NÃO é um produto físico" pra tranquilizar o comprador, e um match de texto
// simples lê isso como se a página estivesse AFIRMANDO ser produto físico.
// Pegou "Bordando com Fé" (100 riscos católicos em PDF), que dizia "não
// enviamos... produtos físicos" e "não é um produto físico: você recebe o
// PDF por e-mail" — o oposto do que a página realmente diz.
function temSinalAfirmativo(text: string, sinal: string): boolean {
  let i = text.indexOf(sinal);
  while (i !== -1) {
    const antes = text.slice(Math.max(0, i - 45), i);
    if (!/\b(não|nao|nunca|sem|nenhum|nenhuma)\b/.test(antes)) return true;
    i = text.indexOf(sinal, i + 1);
  }
  return false;
}

const PHYSICAL_STORE_SIGNALS = [
  // Loja com catálogo de produto físico — não é uma oferta única que vende
  // por si só. Pegou o ateliermaosdemaria.com, que lista "PRODUTOS FÍSICOS"
  // ao lado de "PRODUTOS DIGITAIS", "BOLSAS", "BEBÊS".
  "produtos físicos",
  "produtos fisicos",
  "produto físico",
  "produto fisico",
  // Login de lojista/atacado — praticamente exclusivo de loja física com
  // catálogo (armarinho, papelaria, material de costura). Pegou uma página
  // de barbante (fio de crochê físico) que tinha preço na faixa R$9-50 e
  // passava só por isso, mesmo sem ser produto digital nenhum.
  "login lojista",
  "área do lojista",
  "area do lojista",
  "política de frete",
  "politica de frete",
  "calcular frete",
  "frete grátis",
  "frete gratis",
  "prazo de entrega",
  "prazo de envio",
  "código de rastreio",
  "codigo de rastreio",
  "rastrear pedido",
  "troca, devoluções e prazos",
  "troca, devolucoes e prazos",
];

// Página de resultado de busca (às vezes até vazia) em vez da página do
// produto — visto na prática: um anúncio apontando pra
// /search/?q=MOLDE+BORDADO que abria "Não há resultados para a sua pesquisa".
const SEARCH_PAGE_SIGNALS = [
  "não há resultados para a sua pesquisa",
  "nao ha resultados para a sua pesquisa",
  "nenhum resultado encontrado",
  "nenhum produto encontrado",
  "resultados da pesquisa",
  "sua busca não retornou",
  "sua busca nao retornou",
];

export function isSearchResultsUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (/\/(search|busca|pesquisa)\b/i.test(u.pathname)) return true;
    return u.searchParams.has("q") || u.searchParams.has("s") || u.searchParams.has("busca");
  } catch {
    return false;
  }
}

export interface LandingPageVerdict {
  ok: boolean;
  reason?:
    | "formulario_de_lead"
    | "conteudo_de_blog"
    | "quiz_de_captacao"
    | "loja_fisica"
    | "outro_idioma"
    | "oferta_gratuita"
    | "pagina_de_busca";
}

// Frases fortes de "o conteúdo principal é de graça" — não é o mesmo que
// "ganhe um bônus grátis" (que é secundário, dentro de uma oferta paga de
// verdade). Pegou um "Curso Gratuito" com certificado que passava porque
// tinha palavra de formato digital no texto mas nenhum preço extraído — sem
// preço, nada barrava a oferta grátis, e ela quebra a regra de R$9-50 na
// raiz: não é baixo ticket, é isca sem cobrança nenhuma.
const OFERTA_GRATUITA_SIGNALS = [
  "curso gratuito",
  "curso 100% gratuito",
  "totalmente gratuito",
  "gratuito com certificado",
  "curso grátis",
  "curso 100% grátis",
  "liberar curso grátis",
  // "acesso gratuito" saiu da lista: pegou o "Mapa da Bíblia" (R$29,90 de
  // verdade) por causa de "receba 1 mês de acesso gratuito ao app" — um
  // BÔNUS dentro de oferta paga, não o produto principal de graça. As
  // frases que sobraram são específicas o bastante ("CURSO gratuito/grátis")
  // pra não confundir com bônus secundário.
];

export function pareceOfertaGratuita(pageText: string): boolean {
  const text = pageText.toLowerCase();
  return OFERTA_GRATUITA_SIGNALS.some((t) => text.includes(t));
}

export function verifyLandingPage(pageText: string, url?: string): LandingPageVerdict {
  const text = pageText.toLowerCase();

  if (pareceOutroIdioma(pageText)) {
    return { ok: false, reason: "outro_idioma" };
  }

  if (pareceOfertaGratuita(pageText)) {
    return { ok: false, reason: "oferta_gratuita" };
  }

  if (LEAD_FORM_PAGE_SIGNALS.some((t) => text.includes(t))) {
    return { ok: false, reason: "formulario_de_lead" };
  }

  if (QUIZ_FUNNEL_SIGNALS.some((t) => text.includes(t))) {
    return { ok: false, reason: "quiz_de_captacao" };
  }

  if (PHYSICAL_STORE_SIGNALS.some((t) => temSinalAfirmativo(text, t))) {
    return { ok: false, reason: "loja_fisica" };
  }

  if (SEARCH_PAGE_SIGNALS.some((t) => text.includes(t)) || (url && isSearchResultsUrl(url))) {
    return { ok: false, reason: "pagina_de_busca" };
  }

  const hubMatches = pageText.match(CONTENT_HUB_LINK_PATTERN);
  if (hubMatches && hubMatches.length >= CONTENT_HUB_MIN_OCCURRENCES) {
    return { ok: false, reason: "conteudo_de_blog" };
  }

  return { ok: true };
}

// Preço praticado, lido da própria página de venda. O anúncio quase nunca
// declara o valor (por isso a coluna Ticket ficava "n/d" na maioria das
// linhas), mas a página sempre mostra.
//
// Estratégia (validada contra páginas reais): usar o PRIMEIRO preço da
// página, que é o do produto anunciado. Pegar o menor não funciona — em
// loja com produtos relacionados o menor é de outro item (Eureka: o
// produto custa R$10 e havia um relacionado de R$7). A moda também não
// (Na ponta do lápis: produto R$6, mas R$3 aparecia 4x nos relacionados).
// Antes disso, se houver "por apenas R$ X" a gente prefere esse valor,
// porque cobre a ancoragem "de R$97 por R$27".
function parseValor(bruto: string): number | null {
  const valor = parseFloat(bruto.replace(/\./g, "").replace(",", "."));
  return Number.isNaN(valor) || valor <= 0 ? null : valor;
}

const PRECO = String.raw`(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)`;

export function extractPriceFromPage(pageText: string): number | null {
  let limpo = pageText;

  // Parcelamento ("12x de R$ 2,90") nunca é o preço da oferta.
  limpo = limpo.replace(/\d+\s*x\s*(de\s*)?R\$\s?[\d.,]+/gi, " ");

  // Preço de bônus/referência ("Valor normal: R$ 254,00 | Bônus: GRÁTIS").
  // Página de venda longa lista um desses por brinde — a da Maximus tinha 12
  // deles ANTES do preço real, e o extrator ficava com o primeiro (R$ 794),
  // o que reprovava a oferta por "preço fora da faixa".
  limpo = limpo.replace(/valor\s+(normal|original|real)\s*:?\s*R\$\s?[\d.,]+/gi, " ");
  limpo = limpo.replace(/de\s*R\$\s?[\d.,]+\s*(?=por\b)/gi, " "); // ancoragem "de R$ 97 por R$ 19"

  // "por apenas R$ 19,97" é o sinal mais forte de preço praticado.
  const porApenas = limpo.match(new RegExp(String.raw`por\s+apenas\s+R\$\s?${PRECO}`, "i"));
  if (porApenas) {
    const valor = parseValor(porApenas[1]);
    if (valor != null) return valor;
  }

  // "por R$ X" — fica com a ÚLTIMA ocorrência, que é o preço do botão final
  // de compra; as primeiras costumam ser comparação com outros produtos.
  const porTodas = [...limpo.matchAll(new RegExp(String.raw`por\s+R\$\s?${PRECO}`, "gi"))];
  for (let i = porTodas.length - 1; i >= 0; i--) {
    const valor = parseValor(porTodas[i][1]);
    if (valor != null) return valor;
  }

  // Primeiro preço válido, na ordem da página. Pula zerados — quase toda
  // loja mostra "R$ 0,00" do carrinho vazio no topo, antes do preço real.
  for (const m of limpo.matchAll(new RegExp(String.raw`R\$\s?${PRECO}`, "g"))) {
    const valor = parseValor(m[1]);
    if (valor != null) return valor;
  }
  return null;
}

export function precoNaFaixa(preco: number): boolean {
  return preco >= 9 && preco <= 50;
}

export function formatPreco(preco: number): string {
  return `R$ ${preco.toFixed(2).replace(".", ",")}`;
}

// Nome do produto tirado do <title> da página de venda — quase sempre é o
// nome real ("+500 Moldes de Paper Squishy Prontos para Imprimir"), muito
// melhor que a primeira linha do anúncio, que é só a isca ("Tem coisa que a
// gente olha e já imagina usando 💙"). Retorna null quando o título não
// serve (domínio cru, título genérico de tema, vazio).
const TITULOS_INUTEIS = [
  "home",
  "início",
  "inicio",
  "página inicial",
  "pagina inicial",
  "my blog",
  "loja",
  "checkout",
  "carrinho",
  "produto",
  "untitled",
];

export function produtoFromTitle(title: string): string | null {
  if (!title) return null;

  // "Produto X – Nome da Loja" / "Produto X | Nome da Loja" → "Produto X"
  const principal = title.split(/\s+[–—|]\s+/)[0].trim();
  const limpo = principal || title.trim();

  if (limpo.length < 8) return null;
  if (TITULOS_INUTEIS.includes(limpo.toLowerCase())) return null;
  // Domínio cru como título (ex: "universocatolico.site").
  if (/^[\w-]+\.[a-z]{2,}(\.[a-z]{2,})?$/i.test(limpo)) return null;

  return limpo.slice(0, 120);
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

// Instagram nunca é "página de venda que vende por si só" — é perfil, post
// ou link de app. A versão antiga só rejeitava quando o caminho não tinha
// barra, e o formato de deep link do app (instagram.com/_u/usuario) criava
// uma barra que enganava a checagem: um perfil entrou no catálogo com o
// produto chamado literalmente "Instagram".
export function isGenericInstagramProfile(url: string | null): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host === "instagram.com" || host.endsWith(".instagram.com");
  } catch {
    return false;
  }
}

const FACEBOOK_OWNED_HOSTS = [
  "facebook.com",
  "fb.me",
  "fb.com",
  "l.facebook.com",
  "m.facebook.com",
  "business.facebook.com",
  "messenger.com",
  "m.me",
];

// O link_url de um anúncio às vezes aponta pra dentro do próprio Facebook
// (Página, Messenger, formulário de lead) em vez de um site externo de
// verdade. Isso nunca é uma "página de venda" própria — mesma regra de
// negócio que já rejeita WhatsApp, só que pro domínio da própria Meta.
export function isFacebookOwnedLink(url: string | null): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return FACEBOOK_OWNED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

const APP_STORE_HOSTS = ["play.google.com", "apps.apple.com", "itunes.apple.com", "apple.co"];

// Anúncio de app de celular não é oferta low ticket com página de venda —
// é instalação de aplicativo. A página da loja ainda por cima contém
// "download", que é um dos sinais de produto digital, então sem este filtro
// ela passa batido (um jogo da Play Store chegou a ser aceito num teste).
export function isAppStoreLink(url: string | null): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return APP_STORE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}
