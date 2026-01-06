-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ConversationStatus" ADD VALUE 'WAITING_FOR_OWNER';
ALTER TYPE "ConversationStatus" ADD VALUE 'WITH_OWNER';

-- AlterEnum
ALTER TYPE "MessageSender" ADD VALUE 'OWNER';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "phoneNumber" TEXT;

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "ownerPhoneNumber" TEXT,
    "ownerNotifications" BOOLEAN NOT NULL DEFAULT true,
    "aiEscalationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dailyPayoutTime" TEXT NOT NULL DEFAULT '18:00',
    "businessName" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);
