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

A mineração roda por **cron**: `0 7` e `0 11` UTC = **04h e 08h de Brasília**
(as duas terminam antes das 10h, quando o Cayan acorda). Também dá pra
disparar na mão pela aba **Actions → Run workflow** — isso é clique do Cayan,
não tem `gh` CLI configurado nesta máquina.

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
4. `keywords.ts` — a lista de nichos varridos.
5. `apiClient.ts` — grava no site pela API (`/api/offers/upsert`,
   `/api/offers/delete`, `/api/status/update`), autenticado por
   `SCRAPER_API_SECRET`.

Comandos: `npm run mine` (minerar), `npm run dev`, `npm run db:deploy`
(aplicar migração), `npx tsc --noEmit` (checar tipos).

## Regras de negócio (definidas pelo Cayan — não afrouxe sem perguntar)

- **Nunca WhatsApp** como destino. Só página de venda de verdade.
- Ticket entre **R$9 e R$50**.
- **Nada de concurso público** (mercado grande, dominado por players grandes) —
  por isso essas keywords ficam fora da lista de propósito.
- Nada de expert famoso ou marca grande: só oferta que **vende por si só**.
- Fora também: formulário de lead, quiz de captação, blog, loja física, site em
  espanhol, página de busca.
- Nichos que ele considera **bons**: memorização, enfermeiros, pedagogos,
  crochê/costura, papelaria digital, maternidade, artesanato.

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
  uma rodada virarem busca vazia. Keyword boa é curta e comum.
- **Rotação de keywords é por cursor** (`meta_status.keywordCursor`), não por
  dia do ano. O modelo antigo fazia as duas rodadas do mesmo dia varrerem as
  mesmas keywords e dois dias seguidos repetirem quase tudo.
- **Contagem de criativos** tem que ser da *oferta*, não do anunciante:
  `countOfferCreatives(pageId, creativeText)` filtra pelo texto do criativo. Já
  quebrou uma vez mostrando "+108 escalando" quando eram 2.
- **Extração de preço**: vale o "por apenas R$ X"; senão, o primeiro preço
  válido ignorando R$ 0,00. Pegar o menor preço da página, ou a moda, já foi
  testado e dá errado. Carregue a página com `networkidle` — com
  `domcontentloaded` o preço sai instável.
- **O log do GitHub Actions exige login**, então você não consegue lê-lo. Por
  isso o funil da rodada é reportado em `GET /api/status` no campo
  `diagnostico` — é essa a sua janela pra debugar uma rodada.
- **Prévia de branch na Vercel fica protegida por SSO**; pra o Cayan ver, tem
  que estar na `main`.

## Estado do painel

Favoritar/descartar ficam no `localStorage` (o site não tem login, então é por
dispositivo — isso é intencional). Tema preto e verde, logo de radar, tabela que
vira cards no celular, `noindex` ligado.
