-- CreateEnum
CREATE TYPE "OtpChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'SMS');

-- AlterTable
ALTER TABLE "users" DROP COLUMN "passwordHash",
ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "otp_challenges" (
    "id" UUID NOT NULL,
    "channel" "OtpChannel" NOT NULL,
    "destination" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "otp_challenges_destination_createdAt_idx" ON "otp_challenges"("destination", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

