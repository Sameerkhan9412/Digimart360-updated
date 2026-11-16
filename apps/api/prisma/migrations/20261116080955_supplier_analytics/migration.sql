-- CreateEnum
CREATE TYPE "CompanyViewKind" AS ENUM ('PROFILE', 'SITE');

-- CreateTable
CREATE TABLE "product_daily_views" (
    "productId" UUID NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_daily_views_pkey" PRIMARY KEY ("productId","day")
);

-- CreateTable
CREATE TABLE "company_daily_views" (
    "companyId" UUID NOT NULL,
    "kind" "CompanyViewKind" NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "company_daily_views_pkey" PRIMARY KEY ("companyId","kind","day")
);

-- CreateIndex
CREATE INDEX "product_daily_views_day_idx" ON "product_daily_views"("day");

-- CreateIndex
CREATE INDEX "company_daily_views_day_idx" ON "company_daily_views"("day");

-- AddForeignKey
ALTER TABLE "product_daily_views" ADD CONSTRAINT "product_daily_views_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_daily_views" ADD CONSTRAINT "company_daily_views_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
