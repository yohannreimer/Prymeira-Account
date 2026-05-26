import type { PrismaClient } from "@prisma/client";
import Stripe from "stripe";
import { findCustomerByClerkUserId } from "../customers/customers.service.js";
import { upsertEntitlement } from "../entitlements/entitlements.service.js";

const PLAN_PRODUCT_KEYS: Record<string, string[]> = {
  start:        ["talk", "crm"],
  empresa:      ["talk", "crm", "financeiro"],
  "empresa-pro": ["talk", "crm", "financeiro", "orquestrador"],
  suite:        ["talk", "crm", "financeiro", "orquestrador", "media", "operis"],
  operis:       ["operis"],
  media:        ["media"]
};

export async function handleStripeEvent(
  prisma: PrismaClient,
  stripe: Stripe,
  event: Stripe.Event
): Promise<void> {
  if (event.type !== "checkout.session.completed") return;

  const session = event.data.object as Stripe.Checkout.Session;
  const clerkUserId = session.metadata?.clerk_user_id;
  const planId = session.metadata?.plan_id;

  if (!clerkUserId || !planId) return;

  const productKeys = PLAN_PRODUCT_KEYS[planId];
  if (!productKeys) return;

  const customer = await findCustomerByClerkUserId(prisma, clerkUserId);
  if (!customer) return;

  const membership = await prisma.workspaceMember.findFirst({
    where: { customerId: customer.id, status: "active" },
    include: { workspace: true },
    orderBy: { createdAt: "asc" }
  });

  if (!membership) return;

  const workspaceId = membership.workspaceId;

  let currentPeriodEndsAt: Date | null = null;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : (session.subscription?.id ?? null);

  if (subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const periodEnd = sub.items.data[0]?.current_period_end;
      if (periodEnd !== undefined) {
        currentPeriodEndsAt = new Date(periodEnd * 1000);
      }
    } catch {
      // non-fatal: entitlement is still granted without expiry
    }
  }

  await Promise.all(
    productKeys.map((productKey) =>
      upsertEntitlement(prisma, { clerkUserId }, {
        workspaceId,
        productKey,
        status: "active",
        plan: planId,
        source: "stripe",
        currentPeriodEndsAt,
        endsAt: null,
        trialEndsAt: null,
        limits: {},
        metadata: {
          stripe_session_id: session.id,
          stripe_subscription_id: subscriptionId
        },
        auditAction: "entitlement.stripe_checkout"
      })
    )
  );
}
