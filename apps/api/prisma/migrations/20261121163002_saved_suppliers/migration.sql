-- CreateTable
CREATE TABLE "saved_suppliers" (
    "userId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_suppliers_pkey" PRIMARY KEY ("userId","companyId")
);

-- CreateIndex
CREATE INDEX "saved_suppliers_userId_createdAt_idx" ON "saved_suppliers"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "saved_suppliers" ADD CONSTRAINT "saved_suppliers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_suppliers" ADD CONSTRAINT "saved_suppliers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
