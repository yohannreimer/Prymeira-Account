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

type StripeSubscriptionSnapshot = Pick<Stripe.Subscription, "id" | "metadata" | "status" | "trial_end" | "items">;

export async function handleStripeEvent(
  prisma: PrismaClient,
  stripe: Stripe,
  event: Stripe.Event
): Promise<void> {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const clerkUserId = session.metadata?.clerk_user_id;
    const planId = session.metadata?.plan_id;

    if (!clerkUserId || !planId) return;

    let subscription: StripeSubscriptionSnapshot | null = null;
    const subscriptionId =
      typeof session.subscription === "string" ? session.subscription : (session.subscription?.id ?? null);

    if (subscriptionId) {
      try {
        subscription = await stripe.subscriptions.retrieve(subscriptionId);
      } catch {
        // non-fatal: entitlement is still granted without expiry
      }
    }

    await upsertPlanEntitlements(prisma, {
      clerkUserId,
      planId,
      sessionId: session.id,
      subscriptionId,
      subscription
    });
    return;
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as StripeSubscriptionSnapshot;
    const clerkUserId = subscription.metadata?.clerk_user_id;
    const planId = subscription.metadata?.plan_id;

    if (!clerkUserId || !planId) return;

    await upsertPlanEntitlements(prisma, {
      clerkUserId,
      planId,
      sessionId: null,
      subscriptionId: subscription.id,
      subscription
    });
  }
}

async function upsertPlanEntitlements(
  prisma: PrismaClient,
  input: {
    clerkUserId: string;
    planId: string;
    sessionId: string | null;
    subscriptionId: string | null;
    subscription: StripeSubscriptionSnapshot | null;
  }
) {
  const { clerkUserId, planId, sessionId, subscriptionId, subscription } = input;
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

  const subscriptionStatus = subscription?.status ?? null;
  const currentPeriodEndsAt = unixSecondsToDate(subscription?.items.data[0]?.current_period_end);
  const trialEndFromStripe = unixSecondsToDate(subscription?.trial_end);
  const entitlementStatus = mapSubscriptionStatus(subscriptionStatus);
  const trialEndsAt = entitlementStatus === "trial"
    ? (trialEndFromStripe ?? currentPeriodEndsAt)
    : null;

  const metadata: Record<string, string | null> = {
    stripe_session_id: sessionId,
    stripe_subscription_id: subscriptionId
  };

  if (subscriptionStatus) {
    metadata.stripe_subscription_status = subscriptionStatus;
  }

  await Promise.all(
    productKeys.map((productKey) =>
      upsertEntitlement(prisma, { clerkUserId }, {
        workspaceId,
        productKey,
        status: entitlementStatus,
        plan: planId,
        source: "stripe",
        currentPeriodEndsAt,
        endsAt: null,
        trialEndsAt,
        limits: {},
        metadata,
        auditAction: "entitlement.stripe_checkout"
      })
    )
  );
}

function mapSubscriptionStatus(status: Stripe.Subscription.Status | null) {
  if (status === "trialing") return "trial";
  if (status === "active") return "active";
  if (status === "canceled") return "cancelled";
  if (status === "incomplete_expired" || status === "unpaid") return "expired";
  return "blocked";
}

function unixSecondsToDate(value: number | null | undefined) {
  return value ? new Date(value * 1000) : null;
}
