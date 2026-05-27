import type {
  AccountProductsResponse,
  AdminCustomerDetailResponse,
  AdminCustomerListItem,
  AdminEntitlement,
  AdminProduct,
  AdminSessionResponse,
  SyncCustomerResponse
} from "./types";
import { accountApiUrl, resolveConfiguredProductUrl } from "./runtime-config";

export { accountApiUrl };

export async function fetchMyProducts(token: string): Promise<AccountProductsResponse> {
  const response = await fetch(`${accountApiUrl}/me/products`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? "Nao foi possivel carregar seus produtos.");
  }

  return response.json() as Promise<AccountProductsResponse>;
}

export async function syncCurrentCustomer(
  token: string,
  payload: {
    clerk_user_id: string;
    email: string;
    name?: string;
  }
): Promise<SyncCustomerResponse> {
  const response = await fetch(`${accountApiUrl}/customers/sync`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Nao foi possivel sincronizar sua conta."));
  }

  return response.json() as Promise<SyncCustomerResponse>;
}

async function readApiError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
  return body?.error?.message ?? fallback;
}

async function adminFetch<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${accountApiUrl}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "A acao admin nao foi concluida."));
  }

  return response.json() as Promise<T>;
}

export function fetchAdminSession(token: string) {
  return adminFetch<AdminSessionResponse>(token, "/admin/session");
}

export function fetchAdminCustomers(token: string, search?: string) {
  const params = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  return adminFetch<{ customers: AdminCustomerListItem[] }>(token, `/admin/customers${params}`);
}

export function fetchAdminCustomer(token: string, customerId: string) {
  return adminFetch<AdminCustomerDetailResponse>(token, `/admin/customers/${customerId}`);
}

export function fetchAdminProducts(token: string) {
  return adminFetch<{ products: AdminProduct[] }>(token, "/admin/products");
}

function actionHeaders(actionToken: string): Record<string, string> {
  return actionToken.trim() ? { "x-admin-action-token": actionToken.trim() } : {};
}

export function upsertAdminEntitlement(
  token: string,
  actionToken: string,
  payload: {
    workspace_id: string;
    product_key: string;
    status: string;
    plan: string;
    source: string;
    seats_limit?: number;
    ends_at?: string | null;
    trial_ends_at?: string | null;
    current_period_ends_at?: string | null;
    limits?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }
) {
  return adminFetch<{ entitlement: AdminEntitlement }>(token, "/admin/entitlements", {
    method: "POST",
    headers: actionHeaders(actionToken),
    body: JSON.stringify(payload)
  });
}

export function blockAdminEntitlement(
  token: string,
  actionToken: string,
  payload: { workspace_id: string; product_key: string; reason: string }
) {
  return adminFetch<{ entitlement: AdminEntitlement }>(token, "/admin/entitlements/block", {
    method: "POST",
    headers: actionHeaders(actionToken),
    body: JSON.stringify(payload)
  });
}

export function grantAdminTrial(
  token: string,
  actionToken: string,
  payload: { workspace_id: string; product_key: string; plan: string; trial_days: number }
) {
  return adminFetch<{ entitlement: AdminEntitlement }>(token, "/admin/entitlements/trial", {
    method: "POST",
    headers: actionHeaders(actionToken),
    body: JSON.stringify(payload)
  });
}

export function createAdminProduct(
  token: string,
  actionToken: string,
  payload: {
    product_key: string;
    name: string;
    description?: string | null;
    app_url: string;
    marketing_url?: string | null;
    status: string;
  }
) {
  return adminFetch<{ product: AdminProduct }>(token, "/admin/products", {
    method: "POST",
    headers: actionHeaders(actionToken),
    body: JSON.stringify(payload)
  });
}

export function updateAdminProduct(
  token: string,
  actionToken: string,
  productKey: string,
  payload: {
    name: string;
    description?: string | null;
    app_url: string;
    marketing_url?: string | null;
    status: string;
  }
) {
  return adminFetch<{ product: AdminProduct }>(
    token,
    `/admin/products/${encodeURIComponent(productKey)}`,
    {
      method: "PATCH",
      headers: actionHeaders(actionToken),
      body: JSON.stringify(payload)
    }
  );
}

export function resolveProductUrl(productKey: string, fallbackUrl: string | null | undefined) {
  return resolveConfiguredProductUrl(productKey, fallbackUrl);
}

export type PlanPrice = {
  id: string;
  priceMonthly: number;
  priceAnnual: number;
};

export type PlansResponse = {
  plans: PlanPrice[];
  solos: PlanPrice[];
};

export async function fetchPlans(): Promise<PlansResponse> {
  const response = await fetch(`${accountApiUrl}/public/plans`);
  if (!response.ok) {
    throw new Error("Não foi possível carregar os preços.");
  }
  return response.json() as Promise<PlansResponse>;
}

export async function createCheckoutSession(
  token: string,
  payload: {
    plan_id: string;
    billing: "monthly" | "annual";
    success_url: string;
    cancel_url: string;
  }
): Promise<{ checkout_url: string }> {
  const response = await fetch(`${accountApiUrl}/checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Não foi possível iniciar o checkout."));
  }

  return response.json() as Promise<{ checkout_url: string }>;
}
