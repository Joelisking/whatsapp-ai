-- Multi-Tenant Migration Script
-- This script migrates existing single-tenant data to multi-tenant structure

-- Step 1: Create Business table
CREATE TABLE IF NOT EXISTS "businesses" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "whatsappNumber" TEXT NOT NULL UNIQUE,
  "whatsappAccessToken" TEXT NOT NULL,
  "whatsappPhoneId" TEXT NOT NULL,
  "whatsappVerifyToken" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "paystackSecretKey" TEXT,
  "paystackPublicKey" TEXT,
  "ownerPhoneNumber" TEXT,
  "ownerNotifications" BOOLEAN NOT NULL DEFAULT true,
  "aiEscalationEnabled" BOOLEAN NOT NULL DEFAULT true,
  "dailyPayoutTime" TEXT NOT NULL DEFAULT '18:00',
  "plan" TEXT NOT NULL DEFAULT 'FREE',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "maxProducts" INTEGER NOT NULL DEFAULT 10,
  "maxOrders" INTEGER NOT NULL DEFAULT 100,
  "messageLimit" INTEGER NOT NULL DEFAULT 1000,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Create default business from existing settings
INSERT INTO "businesses" (
  "id",
  "name",
  "slug",
  "whatsappNumber",
  "whatsappAccessToken",
  "whatsappPhoneId",
  "ownerPhoneNumber",
  "ownerNotifications",
  "aiEscalationEnabled",
  "dailyPayoutTime",
  "plan",
  "status"
)
SELECT
  'legacy-business-' || gen_random_uuid()::text,
  COALESCE((SELECT "businessName" FROM "settings" LIMIT 1), 'Legacy Business'),
  'legacy',
  COALESCE(current_setting('app.whatsapp_number', true), '+1234567890'),
  COALESCE(current_setting('app.whatsapp_token', true), 'PLACEHOLDER_TOKEN'),
  COALESCE(current_setting('app.whatsapp_phone_id', true), 'PLACEHOLDER_PHONE_ID'),
  (SELECT "ownerPhoneNumber" FROM "settings" LIMIT 1),
  COALESCE((SELECT "ownerNotifications" FROM "settings" LIMIT 1), true),
  COALESCE((SELECT "aiEscalationEnabled" FROM "settings" LIMIT 1), true),
  COALESCE((SELECT "dailyPayoutTime" FROM "settings" LIMIT 1), '18:00'),
  'PROFESSIONAL',
  'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM "businesses" WHERE "slug" = 'legacy');

-- Step 3: Add businessId column to all tables (nullable first)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "businessId" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "businessId" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "businessId" TEXT;
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "businessId" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "businessId" TEXT;

-- Step 4: Populate businessId with the default business
UPDATE "users"
SET "businessId" = (SELECT "id" FROM "businesses" WHERE "slug" = 'legacy' LIMIT 1)
WHERE "businessId" IS NULL;

UPDATE "customers"
SET "businessId" = (SELECT "id" FROM "businesses" WHERE "slug" = 'legacy' LIMIT 1)
WHERE "businessId" IS NULL;

UPDATE "products"
SET "businessId" = (SELECT "id" FROM "businesses" WHERE "slug" = 'legacy' LIMIT 1)
WHERE "businessId" IS NULL;

UPDATE "conversations"
SET "businessId" = (SELECT "id" FROM "businesses" WHERE "slug" = 'legacy' LIMIT 1)
WHERE "businessId" IS NULL;

UPDATE "orders"
SET "businessId" = (SELECT "id" FROM "businesses" WHERE "slug" = 'legacy' LIMIT 1)
WHERE "businessId" IS NULL;

-- Step 5: Make businessId NOT NULL
ALTER TABLE "users" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "customers" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "products" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "conversations" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "businessId" SET NOT NULL;

-- Step 6: Add foreign key constraints
ALTER TABLE "users" ADD CONSTRAINT "users_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customers" ADD CONSTRAINT "customers_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "products" ADD CONSTRAINT "products_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conversations" ADD CONSTRAINT "conversations_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orders" ADD CONSTRAINT "orders_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 7: Drop old unique constraints and add new scoped ones
ALTER TABLE "customers" DROP CONSTRAINT IF EXISTS "customers_phoneNumber_key";
ALTER TABLE "customers" ADD CONSTRAINT "customers_businessId_phoneNumber_key"
  UNIQUE ("businessId", "phoneNumber");

ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_orderNumber_key";
ALTER TABLE "orders" ADD CONSTRAINT "orders_businessId_orderNumber_key"
  UNIQUE ("businessId", "orderNumber");

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_key";
ALTER TABLE "users" ADD CONSTRAINT "users_businessId_email_key"
  UNIQUE ("businessId", "email");

-- Step 8: Add indexes for performance
CREATE INDEX IF NOT EXISTS "users_businessId_idx" ON "users"("businessId");
CREATE INDEX IF NOT EXISTS "customers_businessId_idx" ON "customers"("businessId");
CREATE INDEX IF NOT EXISTS "products_businessId_idx" ON "products"("businessId");
CREATE INDEX IF NOT EXISTS "conversations_businessId_customerId_idx" ON "conversations"("businessId", "customerId");
CREATE INDEX IF NOT EXISTS "orders_businessId_customerId_idx" ON "orders"("businessId", "customerId");

-- Step 9: Add new enums
DO $$ BEGIN
  CREATE TYPE "BusinessPlan" AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "BusinessStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TRIAL', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 10: Update business table to use enums (if needed)
ALTER TABLE "businesses" ALTER COLUMN "plan" TYPE "BusinessPlan" USING "plan"::"BusinessPlan";
ALTER TABLE "businesses" ALTER COLUMN "status" TYPE "BusinessStatus" USING "status"::"BusinessStatus";

-- Step 11: Drop old Settings table (data migrated to Business)
-- DROP TABLE IF EXISTS "settings";

COMMIT;
