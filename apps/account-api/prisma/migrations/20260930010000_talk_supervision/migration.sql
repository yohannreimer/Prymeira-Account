-- CreateTable
CREATE TABLE "talk_supervision_grants" (
    "id" UUID NOT NULL,
    "supervisor_customer_id" UUID NOT NULL,
    "seller_customer_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "channel_display_name" TEXT,
    "channel_phone_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "talk_supervision_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "talk_supervision_grants_supervisor_customer_id_status_idx" ON "talk_supervision_grants"("supervisor_customer_id", "status");

-- CreateIndex
CREATE INDEX "talk_supervision_grants_seller_customer_id_workspace_id_idx" ON "talk_supervision_grants"("seller_customer_id", "workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "talk_supervision_grants_supervisor_customer_id_workspace_id_key" ON "talk_supervision_grants"("supervisor_customer_id", "workspace_id", "channel_id");

-- AddForeignKey
ALTER TABLE "talk_supervision_grants" ADD CONSTRAINT "talk_supervision_grants_supervisor_customer_id_fkey" FOREIGN KEY ("supervisor_customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talk_supervision_grants" ADD CONSTRAINT "talk_supervision_grants_seller_customer_id_fkey" FOREIGN KEY ("seller_customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talk_supervision_grants" ADD CONSTRAINT "talk_supervision_grants_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
