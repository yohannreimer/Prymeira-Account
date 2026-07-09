import type {
  AccessCustomer,
  AccessDecision,
  AccessDeniedDecision,
  AccessEntitlement,
  AccessGrantedDecision,
  AccessProduct,
  AccessProductSeat,
  AccessReason,
  AccessWorkspace
} from "./access.types.js";

type EvaluateAccessInput = {
  customer: AccessCustomer | null;
  workspace: AccessWorkspace | null;
  workspaceMissingReason?: Extract<AccessReason, "no_workspace" | "no_workspace_membership">;
  productSeat: AccessProductSeat | null;
  product: AccessProduct | null;
  entitlement: AccessEntitlement | null;
  now: Date;
};

export function evaluateEntitlementAccess(input: EvaluateAccessInput): AccessDecision {
  const productKey = input.product?.productKey ?? input.entitlement?.productKey ?? "unknown";

  if (!input.customer) {
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

  if (
    input.productSeat.workspaceId !== input.workspace.id ||
    input.productSeat.productKey !== input.product.productKey
  ) {
    return deny(input.product.productKey, "locked", "no_product_seat", input.product.marketingUrl);
  }

  if (!input.entitlement) {
    return deny(input.product.productKey, "locked", "no_entitlement", input.product.marketingUrl);
  }

  const entitlement = input.entitlement;

  if (entitlement.workspaceId !== input.workspace.id || entitlement.productKey !== input.product.productKey) {
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
  reason: AccessGrantedDecision["reason"]
): AccessGrantedDecision {
  return {
    allowed: true,
    workspace_id: input.workspace!.id,
    workspace_name: input.workspace!.name,
    workspace_role: input.workspace!.role,
    customer_id: input.customer!.id,
    customer_name: input.customer!.name,
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
  reason: AccessDeniedDecision["reason"],
  upgradeUrl?: string | null
): AccessDeniedDecision {
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
  reason: AccessDeniedDecision["reason"],
  upgradeUrl?: string | null
): AccessDeniedDecision {
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
