# Radar do Garimpo — contexto do projeto

Leia este arquivo antes de mexer em qualquer coisa. Ele existe pra que uma
conversa nova comece sabendo o essencial, sem precisar reler o histórico.

## O que é

Painel que monitora **ofertas digitais de baixo ticket (R$9–50)** — PDFs,
apostilas, moldes, kits — que estão **rodando anúncios agora** na Biblioteca de
Anúncios da Meta. Objetivo: identificar o que está escalando antes dos
concorrentes perceberem.

O dono do projeto é o **Cayan** (marketing digital, Rio de Janeiro). Ele **não
é programador** — explique em português, sem jargão, e diga o que ele precisa
clicar quando a ação for dele.

## Regra número um

> Nada pode depender do computador do Cayan estar ligado, de um navegador na
> máquina dele, nem de qualquer passo manual no dia a dia.

Site e mineração rodam inteiramente na nuvem, sozinhos. Qualquer solução que
exija "rodar isso aqui todo dia" está errada por definição.

## Como está montado

| Peça | Onde roda |
|---|---|
| Site (Next.js 14, App Router) | Vercel — projeto `radar-do-garimpo`, https://radar-do-garimpo.vercel.app |
| Banco (Postgres + Prisma) | Neon, região `sa-east-1` |
| Minerador (Playwright/Chromium) | GitHub Actions, `.github/workflows/` |
| Deploy | push na `main` → Vercel publica sozinho |

A mineração roda por **cron**, **8 vezes ao dia** (a cada 3h, hora fechada em
Brasília: 00h/03h/06h/09h/12h/15h/18h/21h) — desde 04/09/2026, quando trocamos
de 2 rodadas grandes pra várias pequenas (ver armadilha do bloqueio do
Facebook abaixo). Também dá pra disparar na mão pela aba
**Actions → Run workflow** — isso é clique do Cayan, não tem `gh` CLI
configurado nesta máquina.

O minerador **não usa IA e não gasta crédito do Claude**: é código rodando
Playwright. Nunca proponha "eu minero manualmente" como solução — além de caro,
reintroduz a dependência que a regra número um proíbe.

### Fluxo do minerador (`scraper/`)

1. `mine.ts` — orquestra: revalida o catálogo atual, minera ofertas novas, poda
   as degradadas, grava o status.
2. `adLibraryClient.ts` — tudo que fala com o Facebook (busca, detalhe do
   anúncio, contagem de criativos, abrir a página de venda).
3. `heuristics.ts` — todos os filtros de conteúdo (é digital? é low ticket? a
   página de venda presta?).
4. `keywords.ts` — monta a lista de busca a partir de
   `src/lib/keywordCategorias.ts` (fonte única: keyword → categoria saúde /
   religião / renda extra). O site importa do mesmo arquivo pra alimentar o
   filtro de nicho no painel — editar keyword é lá, não em `keywords.ts`.
5. `apiClient.ts` — grava no site pela API (`/api/offers/upsert`,
   `/api/offers/delete`, `/api/status/update`), autenticado por
   `SCRAPER_API_SECRET`.

Comandos: `npm run mine` (minerar), `npm run dev`, `npm run db:deploy`
(aplicar migração), `npx tsc --noEmit` (checar tipos).

## Regras de negócio (definidas pelo Cayan — não afrouxe sem perguntar)

- **Só três nichos** (definido em 04/09/2026, substituiu a lista antiga de
  nichos bons):
  1. **Saúde e bem-estar**, amplo — emagrecimento, treino, enfermagem, saúde
     mental, terapias holísticas.
  2. **Religião**.
  3. **Renda extra**, e isso **inclui artesanato e ofício**: crochê, costura,
     papelaria de festa, confeitaria, elétrica — quem aprende pra produzir e
     vender — além de vender online.

  Fora do escopo: educação/pedagogia, idiomas, maternidade/gestação,
  casamento, finanças pessoais, agro e **estética/beleza** (cílios,
  sobrancelha, manicure, barbeiro, tatuagem — cortado explicitamente, nem
  como saúde nem como ofício).
- **Nunca WhatsApp** como destino. Só página de venda de verdade.
- Ticket entre **R$9 e R$50**.
- **Nada de concurso público** (mercado grande, dominado por players grandes) —
  por isso essas keywords ficam fora da lista de propósito.
- Nada de expert famoso ou marca grande: só oferta que **vende por si só**.
- Fora também: formulário de lead, quiz de captação, blog, loja física, site em
  espanhol, página de busca.
- Sem keyword genérica de formato ("PDF por apenas", "e-book por apenas"):
  rende bem, mas traz qualquer nicho — foi o que enchia o painel de oferta
  fora do escopo.

## Como trabalhar com o Cayan

- **Antes de remover qualquer coisa** (oferta do catálogo, keyword), mande a
  lista do que você achou ruim e **espere ele aprovar**. Ele pediu isso
  explicitamente e vale pra sempre.
- Traga números, não achismo: valide contra páginas reais antes de mudar
  heurística. Várias "correções óbvias" já se provaram erradas na prática.
- Ele acompanha o custo da conversa. Resposta longa só quando agrega.

## Armadilhas já pagas (não repita)

- **Node não está no PATH** do shell desta sessão. Prefixe comandos PowerShell
  com o refresh do PATH da máquina/usuário.
- **A busca de anúncios usa frase exata** (`q="keyword"`). Keyword longa e
  específica volta **zero** resultado — foi isso que fez 24 das 40 keywords de
  uma rodada virarem busca vazia. Keyword boa é curta e comum: "planner
  financeiro editável" dá 0, "planner financeiro" dá 30. **Meça toda keyword
  nova** com `npx tsx scraper/auditarKeywords.ts lista.txt saida.json` antes de
  incluir; abaixo de ~10 anúncios ela quase não paga o tempo da rodada.
- **Rotação de keywords é por cursor** (`meta_status.keywordCursor`), não por
  dia do ano. O modelo antigo fazia as duas rodadas do mesmo dia varrerem as
  mesmas keywords e dois dias seguidos repetirem quase tudo.
- **O Facebook bloqueia/limita a sessão do runner do GitHub Actions depois de
  ~60 buscas seguidas.** Medido em 04/09/2026: uma rodada sem teto varreu a
  lista de 182 keywords toda numa sessão só, e a taxa de busca vazia foi de
  60% no primeiro terço pra quase 100% no segundo e terceiro — mesma lista que
  rende 20-30 anúncios por keyword quando testada da minha máquina. Não é
  problema de keyword, é o IP do runner sendo penalizado ao longo da sessão.
  Por isso `KEYWORDS_PER_ROUND` existe (hoje 30) e a mineração roda 8x ao dia
  em vez de rodadas longas — **não tire esse teto sem medir de novo**.
- **O histórico (`history`) guarda no máximo 1 ponto por DIA**, mesmo rodando
  várias vezes ao dia — `appendHistory` em `mine.ts` atualiza o ponto de hoje
  em vez de empilhar um por rodada. Sem isso, o gráfico de tendência e o
  "escalou de X para Y" comparariam horas entre si (ruído), não dias.
- **Contagem de criativos** tem que ser da *oferta*, não do anunciante:
  `countOfferCreatives(pageId, creativeText)` filtra pelo texto do criativo. Já
  quebrou uma vez mostrando "+108 escalando" quando eram 2.
- **Nunca decida com o `collationHint` da busca.** Ele só conta cópias do mesmo
  texto dentro dos ~20 resultados carregados, então subestima muito: medido em
  04/09/2026, ofertas com 5, 6 e 71 criativos reais apareciam como 1. Usado
  como filtro de entrada, barrava 74% dos candidatos e duas rodadas seguidas
  fecharam com ZERO ofertas novas. O filtro de criativos usa
  `countOfferCreatives` e fica DEPOIS de todos os testes de graça (link,
  texto, ticket, dedup), porque custa uma requisição a mais.
- **Não remova/rejeite nada por causa de UMA leitura ruim.** Falha de leitura
  ≠ problema real: o Facebook bloqueia o runner de tempos em tempos e site que
  carrega por JavaScript às vezes devolve só código. Já apagou oferta viva por
  "anúncio saiu do ar" e por "página degradou". Hoje toda poda passa por
  `Offer.strikes`: só sai com o MESMO motivo em `PRUNE_STRIKES` (3) rodadas
  seguidas, e passar em tudo zera. Tem ainda a trava de sanidade: se mais da
  metade do catálogo der problema na mesma rodada, é falha de ambiente e
  nenhum strike é aplicado.
- **Extração de preço**: vale o "por apenas R$ X"; senão, o primeiro preço
  válido ignorando R$ 0,00. Pegar o menor preço da página, ou a moda, já foi
  testado e dá errado. Carregue a página com `networkidle` — com
  `domcontentloaded` o preço sai instável.
- **O log do GitHub Actions exige login**, então você não consegue lê-lo. Por
  isso o funil da rodada é reportado em `GET /api/status` no campo
  `diagnostico` — é essa a sua janela pra debugar uma rodada. Mas
  `diagnostico` só guarda a ÚLTIMA rodada (a próxima sobrescreve) — pra saber
  por que uma oferta específica sumiu, mesmo dias depois, use
  `GET /api/podadas` (histórico permanente, tabela `PrunedOffer`, gravado em
  `/api/offers/delete` antes do hard delete da Offer).
- **Prévia de branch na Vercel fica protegida por SSO**; pra o Cayan ver, tem
  que estar na `main`.

## Notificação por WhatsApp

Cada rodada manda um resumo pro WhatsApp pessoal do Cayan via **CallMeBot**
(serviço comunitário gratuito, não é API oficial da Meta — ativado pelo
telefone dele em 04/09/2026). `scraper/whatsapp.ts` lê `WHATSAPP_PHONE` e
`WHATSAPP_APIKEY` dos secrets do GitHub Actions; se não existirem, só pula o
envio e loga um aviso — nunca derruba a mineração. Mensagem montada em
`buildWhatsAppMessage` (mine.ts): novas ofertas, podadas (com motivo),
escaladas fortes, total do catálogo.

## Estado do painel

Favoritar/descartar ficam no `localStorage` (o site não tem login, então é por
dispositivo — isso é intencional). Tema preto e verde, logo de radar, tabela que
vira cards no celular, `noindex` ligado. Filtro por nicho (Saúde/Religião/
Renda extra) é independente da aba (Top 10, Escalando etc) e combina com
ela — os dois filtram juntos, não um substitui o outro.
