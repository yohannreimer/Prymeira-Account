import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";
import { loadEnv } from "../../env.js";

const demoHeaders = { authorization: "Bearer demo-token" };
const prisma = {} as PrismaClient;

beforeEach(() => {
  process.env.DATABASE_URL = "postgresql://example.test/account";
  process.env.CLERK_SECRET_KEY = "clerk_secret";
  process.env.ADMIN_EMAILS = "admin@example.com";
  process.env.NODE_ENV = "test";
  process.env.DEMO_MODE = "true";
  process.env.DEMO_USER_ID = "demo_user";
  process.env.DEMO_EMAIL = "demo@prymeira.local";
  process.env.DEMO_NAME = "Usuario Demo";
  process.env.DEMO_WORKSPACE_ID = "demo_workspace";
  process.env.DEMO_WORKSPACE_NAME = "Prymeira Demo";
  process.env.VITE_PRYMEIRA_HUB_URL = "http://localhost:5175";
});

describe("demo account routes", () => {
  it("rejects demo mode in production env", () => {
    expect(() =>
      loadEnv({
        DATABASE_URL: "postgresql://example.test/account",
        CLERK_SECRET_KEY: "clerk_secret",
        NODE_ENV: "production",
        DEMO_MODE: "true"
      })
    ).toThrow(/DEMO_MODE cannot be true when NODE_ENV is production/);

    expect(
      loadEnv({
        DATABASE_URL: "postgresql://example.test/account",
        CLERK_SECRET_KEY: "clerk_secret",
        NODE_ENV: "production",
        DEMO_MODE: "false"
      }).DEMO_MODE
    ).toBe("false");
  });

  it("starts without connecting to Prisma when no explicit client is provided", async () => {
    process.env.DATABASE_URL = "postgresql://demo:demo@127.0.0.1:1/demo";
    const app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/access-check?product_key=crm",
      headers: demoHeaders
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      allowed: true,
      product_key: "crm",
      workspace_id: "demo_workspace",
      reason: "demo_mode"
    });

    await app.close();
  });

  it("allows demo access checks for crm", async () => {
    const app = await buildApp({ prisma });

    const response = await app.inject({
      method: "GET",
      url: "/access-check?product_key=crm",
      headers: demoHeaders
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      allowed: true,
      product_key: "crm",
      workspace_id: "demo_workspace",
      reason: "demo_mode"
    });

    await app.close();
  });

  it("returns demo customer workspace and allowed products", async () => {
    const app = await buildApp({ prisma });

    const response = await app.inject({
      method: "GET",
      url: "/me/products",
      headers: demoHeaders
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toMatchObject({
      customer: {
        email: "demo@prymeira.local"
      },
      workspace: {
        id: "demo_workspace"
      }
    });
    expect(body.products).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          product_key: "talk",
          allowed: true
        })
      ])
    );
    expect(body.products.every((product: { allowed: boolean }) => product.allowed)).toBe(true);

    await app.close();
  });

  it("syncs the demo identity without persistence", async () => {
    const app = await buildApp({ prisma });

    const response = await app.inject({
      method: "POST",
      url: "/customers/sync",
      headers: demoHeaders,
      payload: {
        clerk_user_id: "demo_user",
        email: "demo@prymeira.local",
        name: "Usuario Demo"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      customer_id: "demo_user",
      email: "demo@prymeira.local",
      workspace: {
        id: "demo_workspace",
        role: "owner"
      }
    });

    await app.close();
  });

  it("simulates checkout by returning the success URL with a demo flag", async () => {
    const app = await buildApp({ prisma });

    const response = await app.inject({
      method: "POST",
      url: "/checkout",
      headers: demoHeaders,
      payload: {
        plan_id: "suite",
        billing: "monthly",
        success_url: "http://localhost:5175/billing/success?plan=suite",
        cancel_url: "http://localhost:5175/billing"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      checkout_url: "http://localhost:5175/billing/success?plan=suite&demo_checkout=1"
    });

    await app.close();
  });
});
