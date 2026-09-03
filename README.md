# Radar do Garimpo

Painel de monitoramento de ofertas digitais *low ticket* (R$ 9–50) escalando na
Biblioteca de Anúncios da Meta. Reconstrução standalone do protótipo Artifact
original, com banco de dados próprio e mineração 100% automatizada em nuvem.

## Sumário

- [Stack e por quê](#stack-e-por-quê)
- [Rodando localmente](#rodando-localmente)
- [Modelo de dados](#modelo-de-dados)
- [Decisão técnica: como o scraper lê a Biblioteca de Anúncios](#decisão-técnica-como-o-scraper-lê-a-biblioteca-de-anúncios)
- [Regras de negócio](#regras-de-negócio-não-mude-sem-necessidade)
- [Deploy em produção](#deploy-em-produção)
- [Agendando o job de mineração](#agendando-o-job-de-mineração)
- [Variáveis de ambiente](#variáveis-de-ambiente)

## Stack e por quê

| Camada | Escolha | Por quê |
|---|---|---|
| Frontend + API | Next.js 14 (App Router, TypeScript) | UI e rotas de API no mesmo projeto; deploy trivial na Vercel. |
| Banco de dados | Postgres (Neon) via Prisma | Free tier, sem servidor pra gerenciar, funciona igual em dev e produção. Escrita a partir de serverless functions (Vercel) e do GitHub Action, os dois via HTTPS — SQLite local não serviria porque o filesystem da Vercel é efêmero. |
| Mineração | Node + Playwright, script separado (`npm run mine`) | Roda fora do request HTTP do site, sem depender do navegador do usuário. |
| Agendamento | GitHub Actions (`schedule` cron) | Sobe uma máquina temporária na nuvem, roda o script, desliga sozinha. Não existe servidor nem PC pessoal envolvido em nenhum momento — ver justificativa completa abaixo. |
| Atualização da UI | Polling `fetch` a cada 45s | Simples, sem infra extra (WebSocket/SSE não são necessários pra esse volume/frequência de dados). |

### Por que nada disso depende do seu computador

- O **site** roda na Vercel: build uma vez, depois cada acesso é atendido pela infraestrutura da Vercel, sem processo seu rodando.
- O **banco de dados** é o Neon (Postgres gerenciado): fica no ar independente de qualquer máquina sua.
- O **job de mineração** roda como **GitHub Actions scheduled workflow** ([.github/workflows/mine.yml](.github/workflows/mine.yml)): a cada disparo do cron, o GitHub sobe uma VM limpa, faz `npm ci`, instala o Chromium do Playwright, roda `npm run mine`, e desliga a VM — tudo isso acontece nos servidores do GitHub, não no seu PC. Você só precisa configurar os *secrets* uma vez (`SITE_URL`, `SCRAPER_API_SECRET`) e o restante é 100% autônomo.

## Rodando localmente

Pré-requisitos: [Node.js 20+](https://nodejs.org) instalado (este projeto foi montado sem Node disponível na máquina onde foi criado — instale antes de continuar) e uma connection string de um banco Postgres (veja [Neon](#1-crie-o-banco-neon) abaixo; o mesmo banco pode ser usado em dev e produção para um projeto pessoal como este).

```bash
npm install
cp .env.example .env      # preencha DATABASE_URL, SCRAPER_API_SECRET, SITE_URL
npx prisma migrate dev --name init
npm run db:seed           # popula o catálogo com ~12 ofertas de exemplo
npm run dev
```

Abra `http://localhost:3000` — o painel deve aparecer populado com as ofertas de exemplo do seed. Só depois de validar a UI visualmente é que vale rodar o scraper de verdade (`npm run mine`), que **sobrescreve** o catálogo de exemplo com dados reais minerados da Biblioteca de Anúncios.

## Modelo de dados

Definido em [prisma/schema.prisma](prisma/schema.prisma):

- **`Offer`** — uma linha por oferta rastreada (produto, anunciante, ticket, `libraryId`/`pageId` da Meta, `collation` = nº de anúncios ativos com o mesmo criativo, `concorrencia` = tamanho do nicho, heurísticas de `internacional`/`riscoPolitica`, e `history` = série temporal do `collation`, últimos 45 pontos).
- **`MetaStatus`** — linha única (`id: "singleton"`) com o resumo da última rodada de mineração (usada no rodapé do painel).

Tipos TypeScript espelhando esse schema para o frontend/API estão em [src/lib/types.ts](src/lib/types.ts); a lógica de filtro/ordenação (`computeDelta`, `isNewThisWeek`, `opportunity`) está isolada em [src/lib/compute.ts](src/lib/compute.ts) — a mesma lógica descrita na spec original do protótipo.

## Decisão técnica: como o scraper lê a Biblioteca de Anúncios

A spec original cogitava duas opções (sessão logada vs. API oficial da Meta). **Confirmado com o Cayan: a Biblioteca de Anúncios (`facebook.com/ads/library`) é pública e não exige login** — então o scraper ([`scraper/adLibraryClient.ts`](scraper/adLibraryClient.ts)) navega como visitante anônimo via Playwright, sem `storageState`/cookies de conta nenhuma. Isso elimina o risco de restrição de conta pessoal que a Opção A original (com login) tinha.

A extração continua sendo feita lendo o HTML/JSON embutido na página (mesmos padrões da spec: `link_url`, `collation_count`, `page_id`, `page_name`, além de uma heurística adicional para aproximar o texto do criativo — ver comentários em `adLibraryClient.ts`). **Isso é inerentemente frágil**: a Meta pode mudar a estrutura desse payload sem aviso. Se em produção os campos vierem vazios ou errados, o primeiro lugar a olhar é essa extração — não a lógica de negócio em `scraper/mine.ts`.

A extração está isolada atrás da interface `AdLibraryClient` (`fetchAdDetails`, `searchAds`, `searchCompetitionCount`) exatamente para permitir trocar a implementação por uma baseada na [Ad Library API oficial](https://www.facebook.com/ads/library/api/) no futuro, sem tocar no resto do pipeline — só implementar a mesma interface em outro arquivo e trocar o `export` de `getAdLibraryClient()`.

**Ritmo**: requisições são espaçadas (0.7–2.2s de pausa aleatória entre chamadas, mais uma pausa de 4s a cada lote de 12 ofertas revalidadas) para tratar a Biblioteca de Anúncios pública como alguém navegando manualmente, não uma API de alto throughput.

### Rotina de cada rodada ([scraper/mine.ts](scraper/mine.ts))

1. Lê o catálogo atual via `GET /api/offers`.
2. Revalida cada oferta existente (detecta anúncios que saíram do ar, mudaram pra WhatsApp, ou esfriaram — mais de 21 dias, concorrência >1200, nunca escalou nos últimos 10 pontos).
3. Grava atualizações de `history`/`collation` (upsert em lote).
4. Detecta escaladas fortes (`Δ ≥ 2` ou dobrou em relação a ontem).
5. Minera até ~30 ofertas novas, em rotação circular por 7 das 22 keywords fixas ([`scraper/keywords.ts`](scraper/keywords.ts), índice inicial = dia do ano % 22), aplicando os critérios de entrada (low-ticket, `destino: sales_page` obrigatório, sem duplicar `libraryId`, sem perfil genérico do Instagram).
6. Atualiza `meta_status` com o resumo da rodada.
7. Imprime um relatório no log da Action — sempre com o link `?id=<libraryId>` de cada oferta nova, pra conferência manual.

## Regras de negócio (não mude sem necessidade)

Já validadas no protótipo original — ver seção 7 da spec original:

1. **Nunca** rastrear/manter oferta com destino WhatsApp — filtrado tanto na mineração quanto na revalidação, e rejeitado defensivamente pela própria API (`POST /api/offers/upsert`).
2. Ticket entre R$ 9 e R$ 50 (ou `null` se não declarado mas claramente low-ticket).
3. Deduplicação sempre por `libraryId`.
4. Catálogo se auto-poda (regras do passo 2 da rotina acima).
5. Toda oferta nova vem com o link da Biblioteca de Anúncios no relatório da rodada.

## Deploy em produção

### 1. Crie o banco (Neon)

1. Crie uma conta em [neon.tech](https://neon.tech) (free tier).
2. Crie um projeto → copie a **connection string** (pooled, com `?sslmode=require`).
3. Guarde como `DATABASE_URL`.

### 2. Rode as migrações contra o banco de produção

```bash
DATABASE_URL="sua-connection-string" npx prisma migrate deploy
DATABASE_URL="sua-connection-string" npm run db:seed   # opcional, só se quiser ver dados de exemplo antes do 1º scraper rodar
```

### 3. Deploy do site na Vercel

1. Conecte o repositório GitHub existente à [Vercel](https://vercel.com/new).
2. Configure as variáveis de ambiente do projeto na Vercel: `DATABASE_URL`, `SCRAPER_API_SECRET` (gere um valor aleatório forte, ex. `openssl rand -hex 32` — o mesmo valor vai para o secret do GitHub Actions no passo 4).
3. Deploy. Anote a URL pública (ex. `https://radar-do-garimpo.vercel.app`) — esse é o `SITE_URL`.

### 4. Configure os secrets do GitHub Actions

No repositório GitHub → *Settings → Secrets and variables → Actions*, adicione:

- `SITE_URL` — a URL pública do passo 3.
- `SCRAPER_API_SECRET` — o mesmo valor configurado na Vercel.

### 5. Conecte este código ao seu repositório existente

Como você já tem um repositório GitHub, só falta apontar esta pasta pra ele:

```bash
git init
git add .
git commit -m "Radar do Garimpo — versão inicial"
git remote add origin <url-do-seu-repo>
git branch -M main
git push -u origin main
```

## Agendando o job de mineração

Já configurado em [.github/workflows/mine.yml](.github/workflows/mine.yml): roda 2x por dia (09:00 e 18:00 horário de Brasília) via `schedule` cron do GitHub Actions, mais um gatilho manual (`workflow_dispatch`) disponível na aba *Actions* do GitHub pra rodar sob demanda. Ajuste a frequência editando as linhas `cron:` se quiser mais ou menos rodadas por dia — só tenha em mente o ritmo de requisições contra a Biblioteca de Anúncios pública (ver seção acima).

## Variáveis de ambiente

Ver [.env.example](.env.example):

| Variável | Usada por | Descrição |
|---|---|---|
| `DATABASE_URL` | site (Vercel) | Connection string Postgres (Neon). |
| `SCRAPER_API_SECRET` | site + scraper | Chave que protege `/api/offers/upsert`, `/api/offers/delete`, `/api/status/update` — só o job de mineração deve ter. |
| `SITE_URL` | scraper | URL pública do site em produção (ou `http://localhost:3000` em dev), usada pelo scraper para chamar a API. |

## Estrutura do projeto

```
src/app/            → páginas e rotas de API (Next.js App Router)
src/components/      → componentes React da UI
src/lib/             → tipos, cliente Prisma, lógica de negócio compartilhada
prisma/              → schema do banco + seed de exemplo
scraper/             → job de mineração (Node + Playwright), roda via `npm run mine`
.github/workflows/   → agendamento do scraper via GitHub Actions
```
