export type AccountProductAccess = {
  product_key: string;
  name: string;
  description: string | null;
  app_url: string;
  marketing_url: string | null;
  status: string;
  plan?: string;
  source?: string;
  limits?: Record<string, unknown>;
  seats_limit?: number;
  workspace_id?: string;
  workspace_role?: string;
  product_role?: string;
  allowed: boolean;
  reason: string;
  upgrade_url?: string;
};

export type AccountWorkspace = {
  id: string;
  name: string;
  type: string;
  role: string;
};

export type AccountProductsResponse = {
  customer: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  workspace: AccountWorkspace | null;
  products: AccountProductAccess[];
};

export type SyncCustomerResponse = {
  customer_id: string;
  clerk_user_id: string;
  email: string;
  workspace: AccountWorkspace;
};

export type AdminSessionResponse = {
  admin: boolean;
  email: string;
};

export type AdminCustomerListItem = {
  id: string;
  clerkUserId: string;
  email: string;
  name: string | null;
  gatewayCustomerId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminEntitlement = {
  id: string;
  workspaceId: string;
  customerId: string | null;
  productKey: string;
  status: string;
  plan: string;
  source: string;
  seatsLimit: number;
  startsAt: string;
  endsAt: string | null;
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
  limits: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type AdminWorkspaceMember = {
  id?: string;
  customerId?: string;
  role: string;
  status?: string;
  customer?: Pick<AdminCustomerListItem, "id" | "email" | "name">;
};

export type AdminProductMember = {
  id?: string;
  customerId: string;
  productKey: string;
  role: string;
  status: string;
};

export type AdminWorkspace = {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  ownerCustomerId: string;
  members: AdminWorkspaceMember[];
  productMembers: AdminProductMember[];
  entitlements: AdminEntitlement[];
};

export type AdminSubscription = {
  id: string;
  status: string;
  plan: string;
  gateway: string | null;
  amountCents: number | null;
  currency: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export type AdminAuditLog = {
  id: string;
  actorClerkUserId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
};

export type AdminCustomerDetail = AdminCustomerListItem & {
  subscriptions: AdminSubscription[];
  workspaces: AdminWorkspace[];
  entitlements: AdminEntitlement[];
};

export type AdminCustomerDetailResponse = {
  customer: AdminCustomerDetail | null;
  audit_logs: AdminAuditLog[];
};
