import type { AccountProductsResponse } from "./types";

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

export function resolveProductUrl(productKey: string, fallbackUrl: string | null | undefined) {
  const overrideKey = `VITE_PRODUCT_${productKey.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_URL`;
  return env[overrideKey] ?? fallbackUrl ?? "#";
}
