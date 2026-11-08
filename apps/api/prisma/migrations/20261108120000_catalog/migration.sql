-- Trigram matching for typo-tolerant suggestions and ILIKE search.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('MANUFACTURER', 'EXPORTER', 'WHOLESALER', 'TRADER', 'RETAILER', 'SERVICE_PROVIDER');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "parentId" UUID,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legalName" TEXT,
    "gstin" TEXT,
    "gstVerifiedAt" TIMESTAMP(3),
    "businessTypes" "BusinessType"[],
    "yearEstablished" INTEGER,
    "description" TEXT,
    "logoUrl" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "addressLine" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT,
    "trustSeal" BOOLEAN NOT NULL DEFAULT false,
    "exportsTo" TEXT[],
    "status" "CompanyStatus" NOT NULL DEFAULT 'PENDING',
    "responseHours" INTEGER,
    "ratingAvg" DECIMAL(2,1),
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "priceMin" DECIMAL(12,2),
    "priceMax" DECIMAL(12,2),
    "priceUnit" TEXT NOT NULL DEFAULT 'Piece',
    "moq" INTEGER,
    "specs" JSONB NOT NULL DEFAULT '[]',
    "images" TEXT[],
    "status" "ProductStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "rejectionReason" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parentId_sortOrder_idx" ON "categories"("parentId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "companies_ownerId_key" ON "companies"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "companies_gstin_key" ON "companies"("gstin");

-- CreateIndex
CREATE INDEX "companies_status_city_idx" ON "companies"("status", "city");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_status_categoryId_idx" ON "products"("status", "categoryId");

-- CreateIndex
CREATE INDEX "products_companyId_status_idx" ON "products"("companyId", "status");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ── Hand-written: things Prisma's schema language can't express ──

-- Search document kept current by PostgreSQL itself.
-- Name weighs most, then summary, then spec values and description.
ALTER TABLE "products" ADD COLUMN "searchVector" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce("name", '')), 'A') ||
  setweight(to_tsvector('english', coalesce("summary", '')), 'B') ||
  setweight(jsonb_to_tsvector('english', "specs", '["string"]'), 'C') ||
  setweight(to_tsvector('english', coalesce("description", '')), 'D')
) STORED;

CREATE INDEX "products_searchVector_idx" ON "products" USING GIN ("searchVector");
CREATE INDEX "products_name_trgm_idx" ON "products" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "categories_name_trgm_idx" ON "categories" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "companies_name_trgm_idx" ON "companies" USING GIN ("name" gin_trgm_ops);

-- Listing filters
CREATE INDEX "products_active_price_idx" ON "products" ("priceMin") WHERE "status" = 'ACTIVE';
CREATE INDEX "companies_business_types_idx" ON "companies" USING GIN ("businessTypes");

ALTER TABLE "products" ADD CONSTRAINT "products_price_range_chk"
  CHECK ("priceMin" IS NULL OR "priceMax" IS NULL OR "priceMin" <= "priceMax");
ALTER TABLE "products" ADD CONSTRAINT "products_moq_chk" CHECK ("moq" IS NULL OR "moq" > 0);
