import type { PrismaClient } from "@prisma/client";
import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { findCustomerByClerkUserId } from "../customers/customers.service.js";
import { upsertEntitlement } from "../entitlements/entitlements.service.js";
import { handleStripeEvent } from "./webhook.service.js";

vi.mock("../customers/customers.service.js", () => ({
  findCustomerByClerkUserId: vi.fn()
}));

vi.mock("../entitlements/entitlements.service.js", () => ({
  upsertEntitlement: vi.fn()
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleStripeEvent", () => {
  it("grants trial entitlements when checkout completes for a trialing subscription", async () => {
    vi.mocked(findCustomerByClerkUserId).mockResolvedValue({
      id: "customer_1"
    } as Awaited<ReturnType<typeof findCustomerByClerkUserId>>);
    vi.mocked(upsertEntitlement).mockResolvedValue({} as Awaited<ReturnType<typeof upsertEntitlement>>);

    const prisma = {
      workspaceMember: {
        findFirst: vi.fn().mockResolvedValue({
          workspaceId: "workspace_1",
          workspace: { id: "workspace_1" }
        })
      }
    } as unknown as PrismaClient;
    const stripe = {
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          status: "trialing",
          trial_end: 1780000000,
          items: {
            data: [{ current_period_end: 1780000000 }]
          }
        })
      }
    } as unknown as Stripe;
    const event = {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          subscription: "sub_123",
          metadata: {
            clerk_user_id: "user_123",
            plan_id: "empresa"
          }
        }
      }
    } as unknown as Stripe.Event;

    await handleStripeEvent(prisma, stripe, event);

    expect(upsertEntitlement).toHaveBeenCalledTimes(3);
    expect(upsertEntitlement).toHaveBeenCalledWith(
      prisma,
      { clerkUserId: "user_123" },
      expect.objectContaining({
        workspaceId: "workspace_1",
        productKey: "talk",
        status: "trial",
        source: "stripe",
        trialEndsAt: new Date(1780000000 * 1000),
        metadata: expect.objectContaining({
          stripe_session_id: "cs_test_123",
          stripe_subscription_id: "sub_123",
          stripe_subscription_status: "trialing"
        })
      })
    );
  });

  it("updates trial entitlements to active when the subscription becomes active", async () => {
    vi.mocked(findCustomerByClerkUserId).mockResolvedValue({
      id: "customer_1"
    } as Awaited<ReturnType<typeof findCustomerByClerkUserId>>);
    vi.mocked(upsertEntitlement).mockResolvedValue({} as Awaited<ReturnType<typeof upsertEntitlement>>);

    const prisma = {
      workspaceMember: {
        findFirst: vi.fn().mockResolvedValue({
          workspaceId: "workspace_1",
          workspace: { id: "workspace_1" }
        })
      }
    } as unknown as PrismaClient;
    const stripe = {} as unknown as Stripe;
    const event = {
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_123",
          status: "active",
          trial_end: 1780000000,
          metadata: {
            clerk_user_id: "user_123",
            plan_id: "empresa"
          },
          items: {
            data: [{ current_period_end: 1782592000 }]
          }
        }
      }
    } as unknown as Stripe.Event;

    await handleStripeEvent(prisma, stripe, event);

    expect(upsertEntitlement).toHaveBeenCalledTimes(3);
    expect(upsertEntitlement).toHaveBeenCalledWith(
      prisma,
      { clerkUserId: "user_123" },
      expect.objectContaining({
        workspaceId: "workspace_1",
        productKey: "talk",
        status: "active",
        source: "stripe",
        trialEndsAt: null,
        currentPeriodEndsAt: new Date(1782592000 * 1000),
        metadata: expect.objectContaining({
          stripe_subscription_id: "sub_123",
          stripe_subscription_status: "active"
        })
      })
    );
  });
});
