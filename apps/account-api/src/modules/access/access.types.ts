export type AccessReason =
  | "no_customer"
  | "no_product"
  | "inactive_product"
  | "no_entitlement"
  | "expired"
  | "blocked"
  | "cancelled"
  | "trial_expired"
  | "active_entitlement"
  | "internal_access";

export type AccessProduct = {
  productKey: string;
  status: string;
  marketingUrl: string | null;
};

export type AccessEntitlement = {
  productKey: string;
  status: string;
  plan: string;
  source: string;
  endsAt: Date | null;
  trialEndsAt: Date | null;
  currentPeriodEndsAt: Date | null;
  limits: unknown;
};

export type AccessDecision = {
  allowed: boolean;
  product_key: string;
  status: string;
  plan?: string;
  source?: string;
  limits?: unknown;
  reason: AccessReason;
  upgrade_url?: string;
};
