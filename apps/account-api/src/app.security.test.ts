import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

beforeEach(() => {
  process.env.DATABASE_URL = "postgresql://example.test/account";
  process.env.CLERK_SECRET_KEY = "clerk_secret";
  process.env.CLERK_PUBLISHABLE_KEY = "pk_test_public";
  process.env.ADMIN_EMAILS = "admin@example.com";
  process.env.CORS_ORIGINS = "https://hub.prymeiradigital.com.br";
  process.env.RATE_LIMIT_MAX = "2";
  process.env.RATE_LIMIT_TIME_WINDOW = "1 minute";
  process.env.NODE_ENV = "test";
});

describe("app security controls", () => {
  it("sets CORS headers only for configured origins", async () => {
    const app = await buildApp({ prisma: {} as PrismaClient });

    const allowedResponse = await app.inject({
      method: "GET",
      url: "/public/config",
      headers: { origin: "https://hub.prymeiradigital.com.br" }
    });
    const deniedResponse = await app.inject({
      method: "GET",
      url: "/public/config",
      headers: { origin: "https://evil.example" }
    });

    expect(allowedResponse.headers["access-control-allow-origin"]).toBe(
      "https://hub.prymeiradigital.com.br"
    );
    expect(deniedResponse.statusCode).toBe(200);
    expect(deniedResponse.headers["access-control-allow-origin"]).toBeUndefined();

    await app.close();
  });

  it("rate-limits repeated requests by client", async () => {
    const app = await buildApp({ prisma: {} as PrismaClient });

    const firstResponse = await app.inject({ method: "GET", url: "/public/config" });
    const secondResponse = await app.inject({ method: "GET", url: "/public/config" });
    const thirdResponse = await app.inject({ method: "GET", url: "/public/config" });

    expect(firstResponse.statusCode).toBe(200);
    expect(secondResponse.statusCode).toBe(200);
    expect(thirdResponse.statusCode).toBe(429);
    expect(thirdResponse.json()).toMatchObject({
      error: { code: "RATE_LIMITED" }
    });

    await app.close();
  });
});
