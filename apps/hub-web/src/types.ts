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
