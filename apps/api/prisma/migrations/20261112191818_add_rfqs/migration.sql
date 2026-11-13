-- CreateEnum
CREATE TYPE "RfqStatus" AS ENUM ('OPEN', 'AWARDED', 'CLOSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('SUBMITTED', 'WITHDRAWN', 'AWARDED', 'NOT_SELECTED');

-- CreateTable
CREATE TABLE "rfqs" (
    "id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "buyerId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "productId" UUID,
    "companyId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'Piece',
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "budget" DECIMAL(14,2),
    "status" "RfqStatus" NOT NULL DEFAULT 'OPEN',
    "closesAt" TIMESTAMP(3) NOT NULL,
    "awardedQuoteId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfq_invites" (
    "id" UUID NOT NULL,
    "rfqId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),

    CONSTRAINT "rfq_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" UUID NOT NULL,
    "rfqId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "deliveryDays" INTEGER NOT NULL,
    "material" TEXT,
    "warranty" TEXT,
    "paymentTerms" TEXT,
    "certificates" TEXT,
    "note" TEXT,
    "validUntil" TIMESTAMP(3),
    "revision" INTEGER NOT NULL DEFAULT 1,
    "status" "QuoteStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rfqs_number_key" ON "rfqs"("number");

-- CreateIndex
CREATE UNIQUE INDEX "rfqs_awardedQuoteId_key" ON "rfqs"("awardedQuoteId");

-- CreateIndex
CREATE INDEX "rfqs_buyerId_createdAt_idx" ON "rfqs"("buyerId", "createdAt");

-- CreateIndex
CREATE INDEX "rfqs_status_categoryId_closesAt_idx" ON "rfqs"("status", "categoryId", "closesAt");

-- CreateIndex
CREATE INDEX "rfq_invites_companyId_notifiedAt_idx" ON "rfq_invites"("companyId", "notifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "rfq_invites_rfqId_companyId_key" ON "rfq_invites"("rfqId", "companyId");

-- CreateIndex
CREATE INDEX "quotes_companyId_status_idx" ON "quotes"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_rfqId_companyId_key" ON "quotes"("rfqId", "companyId");

-- AddForeignKey
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_invites" ADD CONSTRAINT "rfq_invites_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "rfqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_invites" ADD CONSTRAINT "rfq_invites_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "rfqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
