export type AccessReason =
  | "no_customer"
  | "no_workspace"
  | "no_workspace_membership"
  | "workspace_suspended"
  | "no_product"
  | "inactive_product"
  | "no_entitlement"
  | "no_product_seat"
  | "seats_limit_reached"
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

export type AccessWorkspace = {
  id: string;
  status: string;
  role: string;
};

export type AccessProductSeat = {
  role: string;
  status: string;
};

export type AccessEntitlement = {
  workspaceId: string;
  productKey: string;
  status: string;
  plan: string;
  source: string;
  seatsLimit: number;
  endsAt: Date | null;
  trialEndsAt: Date | null;
  currentPeriodEndsAt: Date | null;
  limits: unknown;
};

export type AccessDecision = {
  allowed: boolean;
  workspace_id?: string;
  workspace_role?: string;
  product_key: string;
  product_role?: string;
  status: string;
  plan?: string;
  source?: string;
  seats_limit?: number;
  limits?: unknown;
  reason: AccessReason;
  upgrade_url?: string;
};
