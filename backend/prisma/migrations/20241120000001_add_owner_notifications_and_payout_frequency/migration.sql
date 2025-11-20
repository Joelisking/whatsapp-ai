-- CreateEnum for PayoutFrequency
CREATE TYPE "PayoutFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- AlterTable: Add phoneNumber and payoutFrequency to users table
ALTER TABLE "users" ADD COLUMN "phoneNumber" TEXT;
ALTER TABLE "users" ADD COLUMN "payoutFrequency" "PayoutFrequency" NOT NULL DEFAULT 'WEEKLY';
