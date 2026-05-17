import { beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { buildApp } from "./app.js";

beforeEach(() => {
  process.env.DATABASE_URL = "postgresql://example.test/account";
  process.env.CLERK_SECRET_KEY = "clerk_secret";
  process.env.CLERK_PUBLISHABLE_KEY = "pk_test_public";
  process.env.ADMIN_EMAILS = "admin@example.com";
  process.env.NODE_ENV = "test";
});

describe("public config", () => {
  it("returns the Clerk publishable key without auth", async () => {
    const app = await buildApp({ prisma: {} as PrismaClient });

    const response = await app.inject({
      method: "GET",
      url: "/public/config"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      clerk_publishable_key: "pk_test_public"
    });

    await app.close();
  });
});
