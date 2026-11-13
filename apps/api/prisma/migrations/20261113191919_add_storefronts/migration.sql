-- CreateEnum
CREATE TYPE "StorefrontTheme" AS ENUM ('BAZAAR', 'FORGE', 'HERITAGE', 'MERIDIAN');

-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('PENDING_DNS', 'PENDING_APPROVAL', 'ACTIVE', 'REJECTED');

-- CreateTable
CREATE TABLE "storefronts" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "theme" "StorefrontTheme" NOT NULL DEFAULT 'MERIDIAN',
    "accent" TEXT,
    "tagline" TEXT,
    "bannerUrl" TEXT,
    "showAbout" BOOLEAN NOT NULL DEFAULT true,
    "showProducts" BOOLEAN NOT NULL DEFAULT true,
    "showCertificates" BOOLEAN NOT NULL DEFAULT true,
    "showContact" BOOLEAN NOT NULL DEFAULT true,
    "certificates" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storefronts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_domains" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "host" TEXT NOT NULL,
    "verifyToken" TEXT NOT NULL,
    "status" "DomainStatus" NOT NULL DEFAULT 'PENDING_DNS',
    "rejectionReason" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_domains_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "storefronts_companyId_key" ON "storefronts"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "custom_domains_companyId_key" ON "custom_domains"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "custom_domains_host_key" ON "custom_domains"("host");

-- CreateIndex
CREATE INDEX "custom_domains_status_idx" ON "custom_domains"("status");

-- AddForeignKey
ALTER TABLE "storefronts" ADD CONSTRAINT "storefronts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
