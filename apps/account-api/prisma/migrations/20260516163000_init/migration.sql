-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "gateway_customer_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "product_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "app_url" TEXT NOT NULL,
    "marketing_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlements" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "product_key" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "source" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3),
    "trial_ends_at" TIMESTAMP(3),
    "current_period_ends_at" TIMESTAMP(3),
    "limits" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "gateway" TEXT,
    "gateway_subscription_id" TEXT,
    "gateway_customer_id" TEXT,
    "status" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "amount_cents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_clerk_user_id" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_clerk_user_id_key" ON "customers"("clerk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_product_key_key" ON "products"("product_key");

-- CreateIndex
CREATE UNIQUE INDEX "entitlements_customer_id_product_key_key" ON "entitlements"("customer_id", "product_key");

-- CreateIndex
CREATE INDEX "subscriptions_customer_id_idx" ON "subscriptions"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_gateway_gateway_subscription_id_key" ON "subscriptions"("gateway", "gateway_subscription_id");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_created_at_idx" ON "audit_logs"("target_type", "target_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_clerk_user_id_created_at_idx" ON "audit_logs"("actor_clerk_user_id", "created_at");

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_product_key_fkey" FOREIGN KEY ("product_key") REFERENCES "products"("product_key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
