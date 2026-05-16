import type {
  AccessDecision,
  AccessEntitlement,
  AccessProduct,
  AccessProductSeat,
  AccessReason,
  AccessWorkspace
} from "./access.types.js";

type EvaluateAccessInput = {
  hasCustomer: boolean;
  workspace: AccessWorkspace | null;
  workspaceMissingReason?: Extract<AccessReason, "no_workspace" | "no_workspace_membership">;
  productSeat: AccessProductSeat | null;
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

  if (!input.workspace) {
    return deny(
      input.product.productKey,
      "locked",
      input.workspaceMissingReason ?? "no_workspace",
      input.product.marketingUrl
    );
  }

  if (input.workspace.status !== "active") {
    return deny(input.product.productKey, input.workspace.status, "workspace_suspended", input.product.marketingUrl);
  }

  if (!input.productSeat || input.productSeat.status !== "active") {
    return deny(input.product.productKey, "locked", "no_product_seat", input.product.marketingUrl);
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

    return allow(input, entitlement, "active_entitlement");
  }

  if (entitlement.status === "internal") {
    return allow(input, entitlement, "internal_access");
  }

  if (entitlement.status === "active") {
    return allow(input, entitlement, "active_entitlement");
  }

  return denyWithEntitlement(entitlement, "expired", input.product.marketingUrl);
}

function allow(
  input: EvaluateAccessInput,
  entitlement: AccessEntitlement,
  reason: AccessDecision["reason"]
): AccessDecision {
  return {
    allowed: true,
    workspace_id: input.workspace!.id,
    workspace_role: input.workspace!.role,
    product_key: entitlement.productKey,
    product_role: input.productSeat!.role,
    status: entitlement.status,
    plan: entitlement.plan,
    source: entitlement.source,
    seats_limit: entitlement.seatsLimit,
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
    seats_limit: entitlement.seatsLimit,
    limits: entitlement.limits,
    reason,
    ...(upgradeUrl ? { upgrade_url: upgradeUrl } : {})
  };
}
