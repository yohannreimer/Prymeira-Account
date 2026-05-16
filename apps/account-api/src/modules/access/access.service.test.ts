import { describe, expect, it } from "vitest";
import { evaluateEntitlementAccess } from "./access.service.js";
import type { AccessEntitlement, AccessProduct } from "./access.types.js";

const now = new Date("2026-05-16T12:00:00.000Z");

const product: AccessProduct = {
  productKey: "operis",
  status: "active",
  marketingUrl: "https://primeiradigital.com.br/operis"
};

const workspace = {
  id: "workspace-1",
  status: "active",
  role: "owner"
};

const productSeat = {
  role: "admin",
  status: "active"
};

function entitlement(overrides: Partial<AccessEntitlement>): AccessEntitlement {
  return {
    workspaceId: "workspace-1",
    productKey: "operis",
    status: "active",
    plan: "pro",
    source: "manual",
    seatsLimit: 3,
    endsAt: null,
    trialEndsAt: null,
    currentPeriodEndsAt: null,
    limits: { ai_requests_month: 1000 },
    ...overrides
  } as AccessEntitlement;
}

function evaluate(overrides: Record<string, unknown> = {}) {
  return evaluateEntitlementAccess({
    hasCustomer: true,
    workspace,
    productSeat,
    product,
    entitlement: entitlement({}),
    now,
    ...overrides
  } as never);
}

describe("evaluateEntitlementAccess", () => {
  it("denies when the customer is missing", () => {
    const result = evaluate({ hasCustomer: false, entitlement: null });
    expect(result).toMatchObject({ allowed: false, reason: "no_customer" });
  });

  it("denies when workspace context is missing", () => {
    const result = evaluate({ workspace: null });
    expect(result).toMatchObject({ allowed: false, reason: "no_workspace" });
  });

  it("denies when workspace is suspended before checking entitlement", () => {
    const result = evaluate({ workspace: { ...workspace, status: "suspended" } });
    expect(result).toMatchObject({ allowed: false, reason: "workspace_suspended", status: "suspended" });
  });

  it("denies when product seat is missing", () => {
    const result = evaluate({ productSeat: null });
    expect(result).toMatchObject({ allowed: false, reason: "no_product_seat" });
  });

  it("denies when product seat is inactive", () => {
    const result = evaluate({ productSeat: { ...productSeat, status: "revoked" } });
    expect(result).toMatchObject({ allowed: false, reason: "no_product_seat" });
  });

  it("denies when the product is missing", () => {
    const result = evaluate({ product: null, entitlement: null });
    expect(result).toMatchObject({ allowed: false, reason: "no_product" });
  });

  it("denies when the product is inactive", () => {
    const result = evaluate({
      product: { ...product, status: "inactive" },
      entitlement: null
    });
    expect(result).toMatchObject({ allowed: false, reason: "inactive_product" });
  });

  it("denies when entitlement is missing and includes upgrade URL when marketing URL exists", () => {
    const result = evaluate({ entitlement: null });

    expect(result).toEqual({
      allowed: false,
      product_key: "operis",
      status: "locked",
      reason: "no_entitlement",
      upgrade_url: "https://primeiradigital.com.br/operis"
    });
  });

  it("denies when entitlement is missing and omits upgrade URL when marketing URL is null", () => {
    const result = evaluate({
      product: { ...product, marketingUrl: null },
      entitlement: null
    });

    expect(result).toEqual({
      allowed: false,
      product_key: "operis",
      status: "locked",
      reason: "no_entitlement"
    });
  });

  it("denies mismatched entitlement product key against requested product", () => {
    const result = evaluate({
      entitlement: entitlement({ productKey: "foreign-product" })
    });

    expect(result).toEqual({
      allowed: false,
      product_key: "operis",
      status: "locked",
      reason: "no_entitlement",
      upgrade_url: "https://primeiradigital.com.br/operis"
    });
  });

  it("allows active entitlement", () => {
    const result = evaluate();
    expect(result).toMatchObject({
      allowed: true,
      workspace_id: "workspace-1",
      workspace_role: "owner",
      product_role: "admin",
      seats_limit: 3,
      reason: "active_entitlement",
      plan: "pro"
    });
  });

  it("allows internal entitlement", () => {
    const result = evaluate({
      entitlement: entitlement({ status: "internal", plan: "internal", source: "internal" })
    });
    expect(result).toMatchObject({ allowed: true, reason: "internal_access" });
  });

  it("allows valid trial", () => {
    const result = evaluate({
      entitlement: entitlement({ status: "trial", trialEndsAt: new Date("2026-05-20T00:00:00.000Z") })
    });
    expect(result).toMatchObject({ allowed: true, reason: "active_entitlement", status: "trial" });
  });

  it("denies expired trial", () => {
    const result = evaluate({
      entitlement: entitlement({ status: "trial", trialEndsAt: new Date("2026-05-01T00:00:00.000Z") })
    });
    expect(result).toMatchObject({ allowed: false, reason: "trial_expired" });
  });

  it("denies trial with missing trial end", () => {
    const result = evaluate({
      entitlement: entitlement({ status: "trial", trialEndsAt: null })
    });

    expect(result).toMatchObject({ allowed: false, reason: "trial_expired" });
  });

  it("denies explicit expired entitlement", () => {
    const result = evaluate({
      entitlement: entitlement({ status: "expired" })
    });

    expect(result).toMatchObject({ allowed: false, reason: "expired" });
  });

  it("denies active entitlement that ends exactly now", () => {
    const result = evaluate({
      entitlement: entitlement({ status: "active", endsAt: now })
    });

    expect(result).toMatchObject({ allowed: false, reason: "expired" });
  });

  it("denies internal entitlement with past end date", () => {
    const result = evaluate({
      entitlement: entitlement({ status: "internal", endsAt: new Date("2026-05-15T12:00:00.000Z") })
    });

    expect(result).toMatchObject({ allowed: false, reason: "expired" });
  });

  it("denies unknown entitlement status closed as expired", () => {
    const result = evaluate({
      entitlement: entitlement({ status: "mystery" })
    });

    expect(result).toMatchObject({ allowed: false, reason: "expired" });
  });

  it("denies blocked entitlement", () => {
    const result = evaluate({
      entitlement: entitlement({ status: "blocked" })
    });
    expect(result).toMatchObject({ allowed: false, reason: "blocked" });
  });

  it("denies cancelled entitlement immediately", () => {
    const result = evaluate({
      entitlement: entitlement({ status: "cancelled" })
    });
    expect(result).toMatchObject({ allowed: false, reason: "cancelled" });
  });
});
