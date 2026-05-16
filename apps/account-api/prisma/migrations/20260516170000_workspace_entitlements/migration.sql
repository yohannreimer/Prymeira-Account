-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'individual',
    "status" TEXT NOT NULL DEFAULT 'active',
    "owner_customer_id" UUID NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_product_members" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "product_key" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_product_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "product_keys" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "entitlements" ADD COLUMN "workspace_id" UUID;
ALTER TABLE "entitlements" ADD COLUMN "seats_limit" INTEGER NOT NULL DEFAULT 1;

-- Backfill workspace ownership and memberships for existing customers.
INSERT INTO "workspaces" ("id", "name", "slug", "type", "status", "owner_customer_id", "metadata", "created_at", "updated_at")
SELECT
  gen_random_uuid(),
  COALESCE(NULLIF("name", ''), split_part("email", '@', 1)),
  lower(regexp_replace(split_part("email", '@', 1), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr("id"::text, 1, 8),
  'individual',
  'active',
  "id",
  '{}'::jsonb,
  now(),
  now()
FROM "customers" c
WHERE NOT EXISTS (
  SELECT 1 FROM "workspaces" w WHERE w."owner_customer_id" = c."id"
);

INSERT INTO "workspace_members" ("id", "workspace_id", "customer_id", "role", "status", "created_at", "updated_at")
SELECT gen_random_uuid(), w."id", w."owner_customer_id", 'owner', 'active', now(), now()
FROM "workspaces" w
WHERE NOT EXISTS (
  SELECT 1 FROM "workspace_members" wm
  WHERE wm."workspace_id" = w."id" AND wm."customer_id" = w."owner_customer_id"
);

UPDATE "entitlements" e
SET "workspace_id" = w."id"
FROM "workspaces" w
WHERE e."customer_id" = w."owner_customer_id"
  AND e."workspace_id" IS NULL;

INSERT INTO "workspace_product_members" ("id", "workspace_id", "customer_id", "product_key", "role", "status", "created_at", "updated_at")
SELECT gen_random_uuid(), e."workspace_id", COALESCE(e."customer_id", w."owner_customer_id"), e."product_key", 'owner', 'active', now(), now()
FROM "entitlements" e
JOIN "workspaces" w ON w."id" = e."workspace_id"
WHERE NOT EXISTS (
  SELECT 1 FROM "workspace_product_members" wpm
  WHERE wpm."workspace_id" = e."workspace_id"
    AND wpm."customer_id" = COALESCE(e."customer_id", w."owner_customer_id")
    AND wpm."product_key" = e."product_key"
);

-- Replace customer-owned entitlement constraints with workspace-owned constraints.
ALTER TABLE "entitlements" ALTER COLUMN "workspace_id" SET NOT NULL;
DROP INDEX "entitlements_customer_id_product_key_key";
ALTER TABLE "entitlements" DROP CONSTRAINT "entitlements_customer_id_fkey";
ALTER TABLE "entitlements" ALTER COLUMN "customer_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");
CREATE INDEX "workspaces_owner_customer_id_idx" ON "workspaces"("owner_customer_id");
CREATE UNIQUE INDEX "workspace_members_workspace_id_customer_id_key" ON "workspace_members"("workspace_id", "customer_id");
CREATE INDEX "workspace_members_customer_id_status_idx" ON "workspace_members"("customer_id", "status");
CREATE UNIQUE INDEX "workspace_product_members_workspace_id_customer_id_product__key" ON "workspace_product_members"("workspace_id", "customer_id", "product_key");
CREATE INDEX "workspace_product_members_customer_id_product_key_status_idx" ON "workspace_product_members"("customer_id", "product_key", "status");
CREATE INDEX "invitations_workspace_id_status_idx" ON "invitations"("workspace_id", "status");
CREATE INDEX "invitations_email_status_idx" ON "invitations"("email", "status");
CREATE UNIQUE INDEX "entitlements_workspace_id_product_key_key" ON "entitlements"("workspace_id", "product_key");
CREATE INDEX "entitlements_customer_id_idx" ON "entitlements"("customer_id");

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_customer_id_fkey" FOREIGN KEY ("owner_customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_product_members" ADD CONSTRAINT "workspace_product_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_product_members" ADD CONSTRAINT "workspace_product_members_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_product_members" ADD CONSTRAINT "workspace_product_members_product_key_fkey" FOREIGN KEY ("product_key") REFERENCES "products"("product_key") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
