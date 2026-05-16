import { ProductAccessDeniedError } from "./errors.js";
import type { AccessDecision, CurrentCustomerResponse, PrymeiraAuthClientOptions } from "./types.js";

export function createPrymeiraAuthClient(options: PrymeiraAuthClientOptions) {
  const fetcher = options.fetch ?? fetch;
  const baseUrl = options.accountApiUrl.replace(/\/$/, "");

  async function getJson<T>(path: string, token: string): Promise<T> {
    const response = await fetcher(`${baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`Prymeira Account API request failed with ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  return {
    checkProductAccess(productKey: string, token: string) {
      return getJson<AccessDecision>(`/access-check?product_key=${encodeURIComponent(productKey)}`, token);
    },

    async requireProductAccess(productKey: string, token: string) {
      const decision = await this.checkProductAccess(productKey, token);

      if (!decision.allowed) {
        throw new ProductAccessDeniedError(decision);
      }

      return decision;
    },

    getCurrentCustomer(token: string) {
      return getJson<CurrentCustomerResponse>("/me/products", token);
    }
  };
}
