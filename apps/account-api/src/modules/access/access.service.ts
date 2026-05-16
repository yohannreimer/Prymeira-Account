import type { AccessDecision, AccessEntitlement, AccessProduct } from "./access.types.js";

type EvaluateAccessInput = {
  hasCustomer: boolean;
  product: AccessProduct | null;
  entitlement: AccessEntitlement | null;
  now: Date;
};

export function evaluateEntitlementAccess(input: EvaluateAccessInput): AccessDecision {
  const productKey = input.product?.productKey ?? input.entitlement?.productKey ?? "unknown";

  if (!input.hasCustomer) {
    return deny(productKey, "locked", "no_customer", input.product?.marketingUrl);
  }

  if (!input.product) {
    return deny(productKey, "locked", "no_product");
  }

  if (input.product.status !== "active") {
    return deny(input.product.productKey, input.product.status, "inactive_product", input.product.marketingUrl);
  }

  if (!input.entitlement) {
    return deny(input.product.productKey, "locked", "no_entitlement", input.product.marketingUrl);
  }

  const entitlement = input.entitlement;

  if (entitlement.productKey !== input.product.productKey) {
    return deny(input.product.productKey, "locked", "no_entitlement", input.product.marketingUrl);
  }

  if (entitlement.status === "blocked") {
    return denyWithEntitlement(entitlement, "blocked", input.product.marketingUrl);
  }

  if (entitlement.status === "cancelled") {
    return denyWithEntitlement(entitlement, "cancelled", input.product.marketingUrl);
  }

  if (entitlement.status === "expired") {
    return denyWithEntitlement(entitlement, "expired", input.product.marketingUrl);
  }

  if (entitlement.endsAt && entitlement.endsAt <= input.now) {
    return denyWithEntitlement(entitlement, "expired", input.product.marketingUrl);
  }

  if (entitlement.status === "trial") {
    if (!entitlement.trialEndsAt || entitlement.trialEndsAt <= input.now) {
      return denyWithEntitlement(entitlement, "trial_expired", input.product.marketingUrl);
    }

    return allow(entitlement, "active_entitlement");
  }

  if (entitlement.status === "internal") {
    return allow(entitlement, "internal_access");
  }

  if (entitlement.status === "active") {
    return allow(entitlement, "active_entitlement");
  }

  return denyWithEntitlement(entitlement, "expired", input.product.marketingUrl);
}

function allow(entitlement: AccessEntitlement, reason: AccessDecision["reason"]): AccessDecision {
  return {
    allowed: true,
    product_key: entitlement.productKey,
    status: entitlement.status,
    plan: entitlement.plan,
    source: entitlement.source,
    limits: entitlement.limits,
    reason
  };
}

function deny(
  productKey: string,
  status: string,
  reason: AccessDecision["reason"],
  upgradeUrl?: string | null
): AccessDecision {
  return {
    allowed: false,
    product_key: productKey,
    status,
    reason,
    ...(upgradeUrl ? { upgrade_url: upgradeUrl } : {})
  };
}

function denyWithEntitlement(
  entitlement: AccessEntitlement,
  reason: AccessDecision["reason"],
  upgradeUrl?: string | null
): AccessDecision {
  return {
    allowed: false,
    product_key: entitlement.productKey,
    status: entitlement.status,
    plan: entitlement.plan,
    source: entitlement.source,
    limits: entitlement.limits,
    reason,
    ...(upgradeUrl ? { upgrade_url: upgradeUrl } : {})
  };
}
