import { describe, expect, it, vi } from "vitest";
import { createPrymeiraAuthClient } from "./client.js";
import { ProductAccessDeniedError } from "./errors.js";

describe("createPrymeiraAuthClient", () => {
  it("calls access-check with bearer token", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ allowed: true, product_key: "operis", status: "active", reason: "active_entitlement" }))
    );

    const client = createPrymeiraAuthClient({
      accountApiUrl: "https://account-api.test",
      fetch: fetchMock
    });

    const result = await client.checkProductAccess("operis", "token_123");

    expect(result.allowed).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("https://account-api.test/access-check?product_key=operis", {
      headers: { Authorization: "Bearer token_123" }
    });
  });

  it("throws ProductAccessDeniedError from requireProductAccess when denied", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ allowed: false, product_key: "operis", status: "locked", reason: "no_entitlement" }))
    );

    const client = createPrymeiraAuthClient({
      accountApiUrl: "https://account-api.test",
      fetch: fetchMock
    });

    await expect(client.requireProductAccess("operis", "token_123")).rejects.toBeInstanceOf(ProductAccessDeniedError);
  });
});
