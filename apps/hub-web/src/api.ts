import type {
  AccountProductsResponse,
  AdminCustomerDetailResponse,
  AdminCustomerListItem,
  AdminEntitlement,
  AdminSessionResponse
} from "./types";

const env = import.meta.env as Record<string, string | undefined>;

export const accountApiUrl = (
  env.VITE_PRYMEIRA_ACCOUNT_API_URL
    ?? env.PRYMEIRA_ACCOUNT_API_URL
    ?? "http://localhost:3001"
).replace(/\/$/, "");

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

export function resolveProductUrl(productKey: string, fallbackUrl: string | null | undefined) {
  const overrideKey = `VITE_PRODUCT_${productKey.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_URL`;
  return env[overrideKey] ?? fallbackUrl ?? "#";
}
