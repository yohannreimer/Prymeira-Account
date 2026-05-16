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

export type AccessDecision = {
  allowed: boolean;
  product_key: string;
  status: string;
  plan?: string;
  source?: string;
  limits?: Record<string, unknown>;
  reason: AccessReason;
  upgrade_url?: string;
};

export type CurrentCustomerResponse = {
  customer: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  products: Array<{
    product_key: string;
    name: string;
    description: string | null;
    app_url: string;
    marketing_url: string | null;
    status: string;
    plan?: string;
    allowed: boolean;
    reason: AccessReason;
  }>;
};

export type PrymeiraAuthClientOptions = {
  accountApiUrl: string;
  fetch?: typeof fetch;
  upgradeUrl?: string;
};

export type PrymeiraAuthContext = {
  getToken: () => Promise<string | null> | string | null;
  redirect?: (url: string) => never | Response | void;
};
