-- CreateTable
CREATE TABLE "pruned_offers" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "produto" TEXT NOT NULL,
    "anunciante" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "vendaUrl" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "podadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pruned_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pruned_offers_podadoEm_idx" ON "pruned_offers"("podadoEm");
