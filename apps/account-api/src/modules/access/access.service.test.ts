import { describe, expect, it } from "vitest";
import { evaluateEntitlementAccess } from "./access.service.js";
import type { AccessEntitlement, AccessProduct } from "./access.types.js";

const now = new Date("2026-05-16T12:00:00.000Z");

const product: AccessProduct = {
  productKey: "operis",
  status: "active",
  marketingUrl: "https://primeiradigital.com.br/operis"
};

function entitlement(overrides: Partial<AccessEntitlement>): AccessEntitlement {
  return {
    productKey: "operis",
    status: "active",
    plan: "pro",
    source: "manual",
    endsAt: null,
    trialEndsAt: null,
    currentPeriodEndsAt: null,
    limits: { ai_requests_month: 1000 },
    ...overrides
  };
}

describe("evaluateEntitlementAccess", () => {
  it("denies when the customer is missing", () => {
    const result = evaluateEntitlementAccess({ hasCustomer: false, product, entitlement: null, now });
    expect(result).toMatchObject({ allowed: false, reason: "no_customer" });
  });

  it("denies when the product is missing", () => {
    const result = evaluateEntitlementAccess({ hasCustomer: true, product: null, entitlement: null, now });
    expect(result).toMatchObject({ allowed: false, reason: "no_product" });
  });

  it("denies when the product is inactive", () => {
    const result = evaluateEntitlementAccess({
      hasCustomer: true,
      product: { ...product, status: "inactive" },
      entitlement: null,
      now
    });
    expect(result).toMatchObject({ allowed: false, reason: "inactive_product" });
  });

  it("allows active entitlement", () => {
    const result = evaluateEntitlementAccess({ hasCustomer: true, product, entitlement: entitlement({}), now });
    expect(result).toMatchObject({ allowed: true, reason: "active_entitlement", plan: "pro" });
  });

  it("allows internal entitlement", () => {
    const result = evaluateEntitlementAccess({
      hasCustomer: true,
      product,
      entitlement: entitlement({ status: "internal", plan: "internal", source: "internal" }),
      now
    });
    expect(result).toMatchObject({ allowed: true, reason: "internal_access" });
  });

  it("allows valid trial", () => {
    const result = evaluateEntitlementAccess({
      hasCustomer: true,
      product,
      entitlement: entitlement({ status: "trial", trialEndsAt: new Date("2026-05-20T00:00:00.000Z") }),
      now
    });
    expect(result).toMatchObject({ allowed: true, reason: "active_entitlement", status: "trial" });
  });

  it("denies expired trial", () => {
    const result = evaluateEntitlementAccess({
      hasCustomer: true,
      product,
      entitlement: entitlement({ status: "trial", trialEndsAt: new Date("2026-05-01T00:00:00.000Z") }),
      now
    });
    expect(result).toMatchObject({ allowed: false, reason: "trial_expired" });
  });

  it("denies blocked entitlement", () => {
    const result = evaluateEntitlementAccess({
      hasCustomer: true,
      product,
      entitlement: entitlement({ status: "blocked" }),
      now
    });
    expect(result).toMatchObject({ allowed: false, reason: "blocked" });
  });

  it("denies cancelled entitlement immediately", () => {
    const result = evaluateEntitlementAccess({
      hasCustomer: true,
      product,
      entitlement: entitlement({ status: "cancelled" }),
      now
    });
    expect(result).toMatchObject({ allowed: false, reason: "cancelled" });
  });
});
