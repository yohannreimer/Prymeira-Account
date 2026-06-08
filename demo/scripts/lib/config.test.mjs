import assert from "node:assert/strict";
import test from "node:test";
import { validateDemoConfig } from "./config.mjs";

test("validateDemoConfig accepts the Prymeira demo service map", () => {
  const config = {
    services: [
      {
        id: "hub-web",
        name: "Hub web",
        cwd: ".",
        command: "pnpm",
        args: ["dev:hub"],
        ports: [5175],
        healthUrl: "http://localhost:5175",
        env: { VITE_DEMO_MODE: "true" }
      },
      {
        id: "account-api",
        name: "Account API demo",
        cwd: ".",
        command: "pnpm",
        args: ["dev:api"],
        ports: [3001],
        healthUrl: "http://localhost:3001/health",
        env: { DEMO_MODE: "true" }
      }
    ]
  };

  assert.equal(validateDemoConfig(config).services.length, 2);
});

test("validateDemoConfig rejects duplicate ports", () => {
  const config = {
    services: [
      { id: "one", name: "One", cwd: ".", command: "npm", args: ["run", "dev"], ports: [5175], healthUrl: "http://localhost:5175", env: {} },
      { id: "two", name: "Two", cwd: ".", command: "npm", args: ["run", "dev"], ports: [5175], healthUrl: "http://localhost:5176", env: {} }
    ]
  };

  assert.throws(() => validateDemoConfig(config), /Duplicate demo port 5175/);
});
