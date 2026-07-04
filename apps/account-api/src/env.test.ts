import { describe, expect, it } from "vitest";
import { loadEnv } from "./env.js";

const baseProductionEnv = {
  DATABASE_URL: "postgresql://example.test/account",
  CLERK_SECRET_KEY: "clerk_secret",
  ADMIN_EMAILS: "admin@example.com",
  ADMIN_ACTION_TOKEN: "confirm-admin",
  CORS_ORIGINS: "https://hub.prymeiradigital.com.br",
  NODE_ENV: "production"
} as const;

describe("loadEnv", () => {
  it("rejects production without configured CORS origins", () => {
    expect(() =>
      loadEnv({
        ...baseProductionEnv,
        CORS_ORIGINS: ""
      })
    ).toThrow(/CORS_ORIGINS/);
  });

  it("rejects production without an admin action token", () => {
    expect(() =>
      loadEnv({
        ...baseProductionEnv,
        ADMIN_ACTION_TOKEN: ""
      })
    ).toThrow(/ADMIN_ACTION_TOKEN/);
  });

  it("loads rate-limit defaults", () => {
    expect(loadEnv(baseProductionEnv)).toMatchObject({
      RATE_LIMIT_MAX: 300,
      RATE_LIMIT_TIME_WINDOW: "1 minute"
    });
  });
});
