-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "produto" TEXT NOT NULL,
    "anunciante" TEXT NOT NULL,
    "ticket" TEXT,
    "destino" TEXT NOT NULL DEFAULT 'sales_page',
    "vendaUrl" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "collation" INTEGER,
    "concorrencia" INTEGER,
    "concorrenciaEm" TIMESTAMP(3),
    "internacional" TEXT NOT NULL,
    "riscoPolitica" BOOLEAN NOT NULL DEFAULT false,
    "primeiraDeteccao" TIMESTAMP(3) NOT NULL,
    "descoberta" BOOLEAN NOT NULL DEFAULT true,
    "history" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_status" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "lastRun" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRunNota" TEXT NOT NULL DEFAULT '',
    "offersTracked" INTEGER NOT NULL DEFAULT 0,
    "novasHoje" INTEGER NOT NULL DEFAULT 0,
    "podadasHoje" INTEGER NOT NULL DEFAULT 0,
    "escalations" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "offers_libraryId_key" ON "offers"("libraryId");

-- CreateIndex
CREATE INDEX "offers_niche_idx" ON "offers"("niche");
