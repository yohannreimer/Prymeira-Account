# Local Demo Ecosystem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a one-command local demo mode that starts the Prymeira Hub and every product app with fake resettable data, local auth bypass, and fixed localhost URLs.

**Architecture:** `Prymeira Account` owns the demo control plane: config, launcher scripts, demo identity, Account API demo behavior, and Hub demo routing. Product repos keep their own local demo adapters and reset commands; the central launcher calls them with explicit environment variables. The first pass prioritizes a complete local happy path over Docker or production-like external services.

**Tech Stack:** Node.js ESM scripts, pnpm/npm workspace commands, Fastify, React/Vite, Vitest, Node `node:test`, local SQLite/Postgres-compatible reset commands where already present, Playwright/browser smoke verification.

---

## Scope Check

This spec crosses multiple repos, but the first implementation should stay a single coordinated plan because the core deliverable is one integrated command. The work is split into independently committable tasks:

1. shared demo config and identity;
2. Account API demo responses;
3. Hub demo auth and product URLs;
4. central launcher/reset/health scripts;
5. product app wiring for already-supported local demo paths;
6. Flowcut demo bypass;
7. final verification and docs.

If Task 5 reveals that one product requires a deep rewrite rather than small demo wiring, pause that product and mark it `partial` in `demo/ecosystem.config.json`; keep the launcher working for the rest.

---

## File Structure

### Prymeira Account

- Create: `demo/ecosystem.config.json`  
  Declares products, repo paths, ports, start commands, reset commands, health URLs, and environment overrides.
- Create: `demo/demo-user.json`  
  Shared local identity used by Account API, Hub and product bypasses.
- Create: `demo/scripts/lib/config.mjs`  
  Loads config, resolves repo paths, validates duplicate ports and required fields.
- Create: `demo/scripts/lib/config.test.mjs`  
  Unit tests for config validation.
- Create: `demo/scripts/lib/processes.mjs`  
  Starts child processes, writes PID file, stops tracked processes, checks ports.
- Create: `demo/scripts/lib/processes.test.mjs`  
  Unit tests for command/env normalization and PID file behavior.
- Create: `demo/scripts/start-all.mjs`  
  Runs reset, validates ports, starts services, prints table.
- Create: `demo/scripts/stop-all.mjs`  
  Stops services from PID file.
- Create: `demo/scripts/reset-all.mjs`  
  Runs all configured reset commands.
- Create: `demo/scripts/healthcheck-all.mjs`  
  Checks all configured health URLs.
- Modify: `package.json`  
  Adds `demo:start`, `demo:stop`, `demo:reset`, `demo:health`.
- Modify: `apps/account-api/src/env.ts`  
  Adds `DEMO_MODE` and demo identity fields.
- Create: `apps/account-api/src/modules/demo/demo-fixtures.ts`  
  Central source of demo user, workspace and product payloads.
- Create: `apps/account-api/src/modules/auth/demo.ts`  
  Local auth verifier accepting demo bearer tokens only in demo mode.
- Modify: `apps/account-api/src/app.ts`  
  Uses demo auth verifier and demo route behavior when `DEMO_MODE=true`.
- Modify: `apps/account-api/src/modules/access/access.routes.ts`  
  Short-circuits `/access-check` and `/me/products` with demo fixtures.
- Modify: `apps/account-api/src/modules/customers/customers.routes.ts`  
  Short-circuits `/customers/sync` with demo identity.
- Modify: `apps/account-api/src/modules/checkout/checkout.routes.ts`  
  Returns a local simulated checkout success URL in demo mode.
- Create: `apps/account-api/src/modules/demo/demo.routes.test.ts`  
  Tests demo auth, access, products, customer sync and checkout.
- Modify: `apps/hub-web/vite.config.ts`  
  Aliases Clerk to a demo module when `VITE_DEMO_MODE=true`.
- Create: `apps/hub-web/src/demo/mock-clerk.tsx`  
  Fake Clerk provider/hooks for local demo.
- Create: `apps/hub-web/src/demo/mock-clerk.test.tsx`  
  Tests demo token/user shape.
- Modify: `apps/hub-web/src/runtime-config.ts`  
  Reads demo product URLs from runtime/env.

### Product Repos

- Modify: `/Users/yohannreimer/Downloads/Locais/atomic-crm-main/package.json`  
  Adds fixed-port `demo:prymeira` command wrapping existing `dev:demo`.
- Modify: `/Users/yohannreimer/Downloads/Locais/Wpp Interface prot/package.json`  
  Adds `demo:prymeira`, `demo:reset`, and local bypass env command.
- Modify: `/Users/yohannreimer/Downloads/Locais/Plataforma Modular/package.json`  
  Adds `demo:prymeira`, `demo:reset`, and fixed local DB path env.
- Modify: `/Users/yohannreimer/Downloads/Locais/Plataforma Modular/apps/frontend/src/main.tsx`  
  Allows existing local auth bypass to render without a Clerk key.
- Modify: `/Users/yohannreimer/Downloads/operis-dev/operis/package.json`  
  Adds `demo:prymeira`, `demo:reset`, and fixed web port `5178`.
- Modify: `/Users/yohannreimer/Downloads/Locais/MediaFactory-SaaS/package.json`  
  Adds `demo:prymeira` command with web port `5177`, API port `4317`, and local demo env.
- Modify: `/Users/yohannreimer/Downloads/Locais/MediaFactory-SaaS/src/client/PrymeiraAuthGate.tsx`  
  Renders children directly in local demo mode and configures demo auth.
- Modify: `/Users/yohannreimer/Downloads/Locais/MediaFactory-SaaS/src/server/prymeira/tenant.ts`  
  Returns demo tenant context for local demo bearer tokens.

---

## Task 1: Shared Demo Config And Identity

**Files:**
- Create: `demo/ecosystem.config.json`
- Create: `demo/demo-user.json`
- Create: `demo/scripts/lib/config.mjs`
- Create: `demo/scripts/lib/config.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write config loader tests**

Create `demo/scripts/lib/config.test.mjs`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test demo/scripts/lib/config.test.mjs
```

Expected: FAIL with `Cannot find module .../config.mjs`.

- [ ] **Step 3: Add demo identity**

Create `demo/demo-user.json`:

```json
{
  "userId": "demo_user",
  "clerkUserId": "demo_user",
  "email": "demo@prymeira.local",
  "name": "Usuario Demo",
  "workspaceId": "demo_workspace",
  "workspaceName": "Prymeira Demo",
  "workspaceRole": "owner",
  "token": "demo-token"
}
```

- [ ] **Step 4: Add ecosystem config**

Create `demo/ecosystem.config.json`:

```json
{
  "pidFile": "demo/.demo-processes.json",
  "services": [
    {
      "id": "account-api",
      "name": "Account API demo",
      "cwd": ".",
      "command": "pnpm",
      "args": ["dev:api"],
      "ports": [3001],
      "healthUrl": "http://localhost:3001/health",
      "env": {
        "DEMO_MODE": "true",
        "PORT": "3001",
        "CORS_ORIGINS": "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177,http://localhost:5178"
      }
    },
    {
      "id": "hub-web",
      "name": "Hub web",
      "cwd": ".",
      "command": "pnpm",
      "args": ["dev:hub"],
      "ports": [5175],
      "healthUrl": "http://localhost:5175",
      "env": {
        "VITE_DEMO_MODE": "true",
        "VITE_PRYMEIRA_ACCOUNT_API_URL": "http://localhost:3001",
        "VITE_PRODUCT_MEDIA_URL": "http://localhost:5177",
        "VITE_PRODUCT_FINANCEIRO_URL": "http://localhost:5173/m/financeiro",
        "VITE_PRODUCT_ORQUESTRADOR_URL": "http://localhost:5173/m/tecnico",
        "VITE_PRODUCT_CRM_URL": "http://localhost:5174",
        "VITE_PRODUCT_OPERIS_URL": "http://localhost:5178",
        "VITE_PRODUCT_TALK_URL": "http://localhost:5176"
      }
    },
    {
      "id": "plataforma-modular",
      "name": "Fluvia / Velio",
      "cwd": "../Plataforma Modular",
      "command": "npm",
      "args": ["run", "demo:prymeira"],
      "ports": [4000, 5173],
      "healthUrl": "http://localhost:4000/health",
      "resetCommand": "npm run demo:reset",
      "env": {}
    },
    {
      "id": "vincula-crm",
      "name": "Vincula CRM",
      "cwd": "../atomic-crm-main",
      "command": "npm",
      "args": ["run", "demo:prymeira"],
      "ports": [5174],
      "healthUrl": "http://localhost:5174",
      "env": {}
    },
    {
      "id": "talk",
      "name": "Prymeira Talk",
      "cwd": "../Wpp Interface prot",
      "command": "pnpm",
      "args": ["demo:prymeira"],
      "ports": [3002, 5176],
      "healthUrl": "http://localhost:3002/health",
      "resetCommand": "pnpm demo:reset",
      "env": {}
    },
    {
      "id": "flowcut",
      "name": "Flowcut",
      "cwd": "../MediaFactory-SaaS",
      "command": "npm",
      "args": ["run", "demo:prymeira"],
      "ports": [4317, 5177],
      "healthUrl": "http://localhost:4317/health",
      "env": {}
    },
    {
      "id": "operis",
      "name": "Operis",
      "cwd": "../../operis-dev/operis",
      "command": "npm",
      "args": ["run", "demo:prymeira"],
      "ports": [3000, 5178],
      "healthUrl": "http://localhost:3000/health",
      "resetCommand": "npm run demo:reset",
      "env": {}
    }
  ]
}
```

- [ ] **Step 5: Implement config loader**

Create `demo/scripts/lib/config.mjs`:

```js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");

export function resolveFromRepoRoot(relativePath) {
  return path.resolve(repoRoot, relativePath);
}

export function validateDemoConfig(config) {
  if (!config || !Array.isArray(config.services)) {
    throw new Error("Demo config must contain a services array.");
  }

  const seenPorts = new Map();
  for (const service of config.services) {
    for (const key of ["id", "name", "cwd", "command", "healthUrl"]) {
      if (typeof service[key] !== "string" || service[key].trim() === "") {
        throw new Error(`Demo service is missing ${key}.`);
      }
    }
    if (!Array.isArray(service.args)) {
      throw new Error(`Demo service ${service.id} args must be an array.`);
    }
    if (!Array.isArray(service.ports) || service.ports.length === 0) {
      throw new Error(`Demo service ${service.id} ports must be a non-empty array.`);
    }
    for (const port of service.ports) {
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(`Invalid demo port ${port}.`);
      }
      if (seenPorts.has(port)) {
        throw new Error(`Duplicate demo port ${port} for ${service.id} and ${seenPorts.get(port)}.`);
      }
      seenPorts.set(port, service.id);
    }
  }

  return config;
}

export function loadDemoConfig(configPath = resolveFromRepoRoot("demo/ecosystem.config.json")) {
  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw);
  const config = validateDemoConfig(parsed);
  return {
    ...config,
    pidFile: resolveFromRepoRoot(config.pidFile ?? "demo/.demo-processes.json"),
    services: config.services.map((service) => ({
      ...service,
      absoluteCwd: resolveFromRepoRoot(service.cwd),
      env: service.env ?? {}
    }))
  };
}

export function loadDemoUser(userPath = resolveFromRepoRoot("demo/demo-user.json")) {
  return JSON.parse(fs.readFileSync(userPath, "utf8"));
}
```

- [ ] **Step 6: Add root scripts**

Modify `package.json` scripts:

```json
{
  "scripts": {
    "build": "pnpm -r build",
    "dev": "pnpm --filter @prymeira/account-api dev",
    "dev:api": "pnpm --filter @prymeira/account-api dev",
    "dev:hub": "pnpm --filter @prymeira/hub-web dev",
    "demo:start": "node demo/scripts/start-all.mjs",
    "demo:stop": "node demo/scripts/stop-all.mjs",
    "demo:reset": "node demo/scripts/reset-all.mjs",
    "demo:health": "node demo/scripts/healthcheck-all.mjs",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "lint": "pnpm -r lint",
    "prisma:generate": "pnpm --filter @prymeira/account-api prisma:generate",
    "prisma:migrate": "pnpm --filter @prymeira/account-api prisma:migrate",
    "prisma:seed": "pnpm --filter @prymeira/account-api prisma:seed"
  }
}
```

- [ ] **Step 7: Run config tests**

Run:

```bash
node --test demo/scripts/lib/config.test.mjs
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add package.json demo/ecosystem.config.json demo/demo-user.json demo/scripts/lib/config.mjs demo/scripts/lib/config.test.mjs
git commit -m "feat: add local demo ecosystem config"
```

---

## Task 2: Account API Demo Mode

**Files:**
- Modify: `apps/account-api/src/env.ts`
- Create: `apps/account-api/src/modules/demo/demo-fixtures.ts`
- Create: `apps/account-api/src/modules/auth/demo.ts`
- Modify: `apps/account-api/src/app.ts`
- Modify: `apps/account-api/src/modules/access/access.routes.ts`
- Modify: `apps/account-api/src/modules/customers/customers.routes.ts`
- Modify: `apps/account-api/src/modules/checkout/checkout.routes.ts`
- Create: `apps/account-api/src/modules/demo/demo.routes.test.ts`

- [ ] **Step 1: Write failing Account API demo tests**

Create `apps/account-api/src/modules/demo/demo.routes.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../../app.js";

const originalEnv = { ...process.env };

describe("Account API demo mode", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
      DEMO_MODE: "true",
      DATABASE_URL: "postgresql://demo:demo@localhost:5432/demo",
      CLERK_SECRET_KEY: "sk_test_demo",
      CORS_ORIGINS: "http://localhost:5175",
      VITE_PRYMEIRA_HUB_URL: "http://localhost:5175"
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("allows every product in access-check", async () => {
    const app = await buildApp({ prisma: {} as never });
    const response = await app.inject({
      method: "GET",
      url: "/access-check?product_key=crm",
      headers: { Authorization: "Bearer demo-token" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      allowed: true,
      product_key: "crm",
      workspace_id: "demo_workspace",
      reason: "demo_mode"
    });
  });

  it("returns all products in me/products", async () => {
    const app = await buildApp({ prisma: {} as never });
    const response = await app.inject({
      method: "GET",
      url: "/me/products",
      headers: { Authorization: "Bearer demo-token" }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.customer.email).toBe("demo@prymeira.local");
    expect(body.workspace.id).toBe("demo_workspace");
    expect(body.products.map((product: { product_key: string }) => product.product_key)).toContain("talk");
    expect(body.products.every((product: { allowed: boolean }) => product.allowed)).toBe(true);
  });

  it("syncs the demo customer without Prisma", async () => {
    const app = await buildApp({ prisma: {} as never });
    const response = await app.inject({
      method: "POST",
      url: "/customers/sync",
      headers: {
        Authorization: "Bearer demo-token",
        "Content-Type": "application/json"
      },
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
      workspace: { id: "demo_workspace", role: "owner" }
    });
  });

  it("returns local simulated checkout URL", async () => {
    const app = await buildApp({ prisma: {} as never });
    const response = await app.inject({
      method: "POST",
      url: "/checkout",
      headers: {
        Authorization: "Bearer demo-token",
        "Content-Type": "application/json"
      },
      payload: {
        plan_id: "suite",
        billing: "monthly",
        success_url: "http://localhost:5175/?checkout_success=1&plan=suite",
        cancel_url: "http://localhost:5175/planos"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().checkout_url).toBe("http://localhost:5175/?checkout_success=1&plan=suite&demo_checkout=1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @prymeira/account-api test -- apps/account-api/src/modules/demo/demo.routes.test.ts
```

Expected: FAIL because demo fixtures and demo route behavior do not exist.

- [ ] **Step 3: Add demo env fields**

In `apps/account-api/src/env.ts`, extend `envSchema`:

```ts
DEMO_MODE: z.enum(["true", "false"]).default("false"),
DEMO_USER_ID: z.string().default("demo_user"),
DEMO_EMAIL: z.string().default("demo@prymeira.local"),
DEMO_NAME: z.string().default("Usuario Demo"),
DEMO_WORKSPACE_ID: z.string().default("demo_workspace"),
DEMO_WORKSPACE_NAME: z.string().default("Prymeira Demo"),
VITE_PRYMEIRA_HUB_URL: z.string().default("http://localhost:5175")
```

Export helper:

```ts
export function isDemoMode(env: Env): boolean {
  return env.DEMO_MODE === "true";
}
```

- [ ] **Step 4: Add demo fixtures**

Create `apps/account-api/src/modules/demo/demo-fixtures.ts`:

```ts
import type { Env } from "../../env.js";

export const demoProducts = [
  { product_key: "media", name: "Flowcut", description: "Produção de vídeo com IA.", app_url: "http://localhost:5177" },
  { product_key: "financeiro", name: "Fluvia", description: "Gestão financeira para empresas.", app_url: "http://localhost:5173/m/financeiro" },
  { product_key: "orquestrador", name: "Velio", description: "Gestão de equipes técnicas em campo.", app_url: "http://localhost:5173/m/tecnico" },
  { product_key: "crm", name: "Vincula CRM", description: "Pipeline, contatos e propostas.", app_url: "http://localhost:5174" },
  { product_key: "operis", name: "Operis", description: "Execução estratégica pessoal.", app_url: "http://localhost:5178" },
  { product_key: "talk", name: "Prymeira Talk", description: "Operações WhatsApp em escala.", app_url: "http://localhost:5176" }
] as const;

export function demoCustomer(env: Env) {
  return {
    id: env.DEMO_USER_ID,
    clerk_user_id: env.DEMO_USER_ID,
    email: env.DEMO_EMAIL,
    name: env.DEMO_NAME
  };
}

export function demoWorkspace(env: Env) {
  return {
    id: env.DEMO_WORKSPACE_ID,
    name: env.DEMO_WORKSPACE_NAME,
    type: "organization",
    role: "owner"
  };
}

export function demoAccessDecision(env: Env, productKey: string) {
  return {
    allowed: true,
    reason: "demo_mode",
    product_key: productKey,
    workspace_id: env.DEMO_WORKSPACE_ID,
    workspace_role: "owner",
    product_role: "owner",
    plan: "suite",
    source: "demo_mode",
    status: "active",
    limits: {},
    seats_limit: 99
  };
}

export function demoProductsResponse(env: Env) {
  return {
    customer: {
      id: env.DEMO_USER_ID,
      email: env.DEMO_EMAIL,
      name: env.DEMO_NAME
    },
    workspace: demoWorkspace(env),
    products: demoProducts.map((product) => ({
      ...product,
      marketing_url: null,
      upgrade_url: undefined,
      ...demoAccessDecision(env, product.product_key)
    }))
  };
}
```

- [ ] **Step 5: Add demo auth verifier**

Create `apps/account-api/src/modules/auth/demo.ts`:

```ts
import { ApiError } from "../../lib/errors.js";
import type { Env } from "../../env.js";
import type { AuthVerifier } from "./types.js";

export function createDemoAuthVerifier(env: Env): AuthVerifier {
  return {
    async verifyBearerToken(authorizationHeader) {
      const token = authorizationHeader?.replace(/^Bearer\s+/i, "").trim();
      if (token !== "demo-token") {
        throw new ApiError(401, "UNAUTHORIZED", "Demo authentication requires Bearer demo-token.");
      }

      return {
        clerkUserId: env.DEMO_USER_ID,
        email: env.DEMO_EMAIL,
        name: env.DEMO_NAME
      };
    }
  };
}
```

- [ ] **Step 6: Wire demo auth in app builder**

In `apps/account-api/src/app.ts`, import:

```ts
import { isDemoMode } from "./env.js";
import { createDemoAuthVerifier } from "./modules/auth/demo.js";
```

Replace auth decoration:

```ts
app.decorate(
  "authVerifier",
  options.authVerifier ?? (isDemoMode(env) ? createDemoAuthVerifier(env) : createClerkAuthVerifier())
);
```

- [ ] **Step 7: Short-circuit demo routes**

In `access.routes.ts`, import `loadEnv`, `isDemoMode`, `demoAccessDecision`, and `demoProductsResponse`. At the top of each handler:

```ts
const env = loadEnv();
if (isDemoMode(env)) {
  await app.authVerifier.verifyBearerToken(request.headers.authorization);
  const query = accessCheckQuerySchema.parse(request.query);
  return demoAccessDecision(env, query.product_key);
}
```

For `/me/products`:

```ts
const env = loadEnv();
if (isDemoMode(env)) {
  await app.authVerifier.verifyBearerToken(request.headers.authorization);
  return demoProductsResponse(env);
}
```

In `customers.routes.ts`, short-circuit after auth:

```ts
const env = loadEnv();
const user = await app.authVerifier.verifyBearerToken(request.headers.authorization);
const input = syncCustomerSchema.parse(request.body);

if (isDemoMode(env)) {
  if (input.clerk_user_id !== user.clerkUserId || input.email !== user.email) {
    throw new ApiError(403, "FORBIDDEN", "Cannot sync a different demo user.");
  }
  return {
    customer_id: env.DEMO_USER_ID,
    clerk_user_id: env.DEMO_USER_ID,
    email: env.DEMO_EMAIL,
    workspace: demoWorkspace(env)
  };
}
```

In `checkout.routes.ts`, after auth/body parse:

```ts
if (isDemoMode(env)) {
  const successUrl = new URL(body.success_url);
  successUrl.searchParams.set("demo_checkout", "1");
  return reply.status(200).send({ checkout_url: successUrl.toString() });
}
```

- [ ] **Step 8: Run Account API tests**

Run:

```bash
pnpm --filter @prymeira/account-api test
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/account-api/src/env.ts apps/account-api/src/app.ts apps/account-api/src/modules/auth/demo.ts apps/account-api/src/modules/demo/demo-fixtures.ts apps/account-api/src/modules/demo/demo.routes.test.ts apps/account-api/src/modules/access/access.routes.ts apps/account-api/src/modules/customers/customers.routes.ts apps/account-api/src/modules/checkout/checkout.routes.ts
git commit -m "feat: add account api demo mode"
```

---

## Task 3: Hub Demo Mode Without Real Clerk

**Files:**
- Modify: `apps/hub-web/vite.config.ts`
- Create: `apps/hub-web/src/demo/mock-clerk.tsx`
- Create: `apps/hub-web/src/demo/mock-clerk.test.tsx`
- Modify: `apps/hub-web/src/main.tsx`
- Modify: `apps/hub-web/src/runtime-config.ts`

- [ ] **Step 1: Write failing mock Clerk test**

Create `apps/hub-web/src/demo/mock-clerk.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { useAuth, useUser } from "./mock-clerk";

describe("Hub demo Clerk mock", () => {
  it("returns the shared demo identity and token", async () => {
    const auth = useAuth();
    const user = useUser();

    await expect(auth.getToken()).resolves.toBe("demo-token");
    expect(auth.isLoaded).toBe(true);
    expect(auth.isSignedIn).toBe(true);
    expect(user.user?.id).toBe("demo_user");
    expect(user.user?.primaryEmailAddress?.emailAddress).toBe("demo@prymeira.local");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @prymeira/hub-web test -- src/demo/mock-clerk.test.tsx
```

Expected: FAIL because `mock-clerk.tsx` does not exist.

- [ ] **Step 3: Add mock Clerk module**

Create `apps/hub-web/src/demo/mock-clerk.tsx`:

```tsx
import type { ReactNode } from "react";

const demoUser = {
  id: "demo_user",
  firstName: "Usuario",
  lastName: "Demo",
  fullName: "Usuario Demo",
  primaryEmailAddress: { emailAddress: "demo@prymeira.local" },
  imageUrl: ""
};

export function ClerkProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function ClerkLoading() {
  return null;
}

export function SignedIn({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function SignedOut() {
  return null;
}

export function SignIn() {
  return null;
}

export function SignUp() {
  return null;
}

export function UserButton() {
  return <span aria-label="Usuario Demo" />;
}

export function useAuth() {
  return {
    isLoaded: true,
    isSignedIn: true,
    userId: "demo_user",
    getToken: async () => "demo-token",
    signOut: async () => {}
  };
}

export function useUser() {
  return {
    isLoaded: true,
    isSignedIn: true,
    user: demoUser
  };
}
```

- [ ] **Step 4: Add Vite alias**

Modify `apps/hub-web/vite.config.ts`:

```ts
import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isDemo = env.VITE_DEMO_MODE === "true";

  return {
    plugins: [react()],
    resolve: isDemo
      ? {
          alias: {
            "@clerk/clerk-react": path.resolve(__dirname, "src/demo/mock-clerk.tsx")
          }
        }
      : {},
    server: {
      host: "0.0.0.0",
      port: 5175
    }
  };
});
```

- [ ] **Step 5: Skip Clerk key loading in demo**

In `apps/hub-web/src/main.tsx`, read demo mode:

```tsx
const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";
```

Render directly in demo:

```tsx
if (shouldRenderPublicLanding(window.location) || isDemoMode) {
  rootRenderer.render(<App />);
} else {
  void loadClerkPublishableKey().then((publishableKey) => {
    rootRenderer.render(
      publishableKey ? (
        <ClerkProvider publishableKey={publishableKey}>
          <App />
        </ClerkProvider>
      ) : (
        <MissingConfig />
      )
    );
  });
}
```

- [ ] **Step 6: Run Hub tests and typecheck**

Run:

```bash
pnpm --filter @prymeira/hub-web test
pnpm --filter @prymeira/hub-web typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/hub-web/vite.config.ts apps/hub-web/src/main.tsx apps/hub-web/src/demo/mock-clerk.tsx apps/hub-web/src/demo/mock-clerk.test.tsx
git commit -m "feat: add hub demo auth bypass"
```

---

## Task 4: Central Launcher, Reset, Stop, And Health Scripts

**Files:**
- Create: `demo/scripts/lib/processes.mjs`
- Create: `demo/scripts/lib/processes.test.mjs`
- Create: `demo/scripts/start-all.mjs`
- Create: `demo/scripts/stop-all.mjs`
- Create: `demo/scripts/reset-all.mjs`
- Create: `demo/scripts/healthcheck-all.mjs`

- [ ] **Step 1: Write process helper tests**

Create `demo/scripts/lib/processes.test.mjs`:

```js
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildChildEnv, readPidFile, writePidFile } from "./processes.mjs";

test("buildChildEnv merges parent env, service env and demo defaults", () => {
  const env = buildChildEnv(
    { PATH: "/bin", KEEP: "yes" },
    { env: { DEMO_MODE: "true" } },
    { token: "demo-token", workspaceId: "demo_workspace" }
  );

  assert.equal(env.PATH, "/bin");
  assert.equal(env.KEEP, "yes");
  assert.equal(env.DEMO_MODE, "true");
  assert.equal(env.DEMO_TOKEN, "demo-token");
  assert.equal(env.DEMO_WORKSPACE_ID, "demo_workspace");
});

test("pid file round trip", () => {
  const tmp = path.join(os.tmpdir(), `prymeira-demo-${Date.now()}.json`);
  writePidFile(tmp, [{ id: "hub", pid: 123, name: "Hub" }]);
  assert.deepEqual(readPidFile(tmp), [{ id: "hub", pid: 123, name: "Hub" }]);
  fs.unlinkSync(tmp);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test demo/scripts/lib/processes.test.mjs
```

Expected: FAIL because `processes.mjs` does not exist.

- [ ] **Step 3: Implement process helpers**

Create `demo/scripts/lib/processes.mjs`:

```js
import fs from "node:fs";
import net from "node:net";
import { spawn } from "node:child_process";

export function buildChildEnv(parentEnv, service, demoUser) {
  return {
    ...parentEnv,
    ...service.env,
    DEMO_TOKEN: demoUser.token,
    DEMO_USER_ID: demoUser.userId,
    DEMO_EMAIL: demoUser.email,
    DEMO_NAME: demoUser.name,
    DEMO_WORKSPACE_ID: demoUser.workspaceId,
    DEMO_WORKSPACE_NAME: demoUser.workspaceName
  };
}

export function readPidFile(pidFile) {
  if (!fs.existsSync(pidFile)) return [];
  return JSON.parse(fs.readFileSync(pidFile, "utf8"));
}

export function writePidFile(pidFile, processes) {
  fs.writeFileSync(pidFile, JSON.stringify(processes, null, 2));
}

export function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

export async function assertPortsAvailable(services) {
  for (const service of services) {
    for (const port of service.ports) {
      if (!(await isPortAvailable(port))) {
        throw new Error(`Porta ${port} ocupada por outro processo. Pare o processo atual ou altere demo/ecosystem.config.json.`);
      }
    }
  }
}

export function startService(service, demoUser) {
  const child = spawn(service.command, service.args, {
    cwd: service.absoluteCwd,
    env: buildChildEnv(process.env, service, demoUser),
    stdio: "inherit",
    shell: false
  });

  return {
    id: service.id,
    name: service.name,
    pid: child.pid,
    ports: service.ports,
    healthUrl: service.healthUrl
  };
}
```

- [ ] **Step 4: Implement reset script**

Create `demo/scripts/reset-all.mjs`:

```js
import { spawnSync } from "node:child_process";
import { loadDemoConfig, loadDemoUser } from "./lib/config.mjs";
import { buildChildEnv } from "./lib/processes.mjs";

const config = loadDemoConfig();
const demoUser = loadDemoUser();

for (const service of config.services) {
  if (!service.resetCommand) continue;
  const result = spawnSync(service.resetCommand, {
    cwd: service.absoluteCwd,
    env: buildChildEnv(process.env, service, demoUser),
    stdio: "inherit",
    shell: true
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
```

- [ ] **Step 5: Implement start script**

Create `demo/scripts/start-all.mjs`:

```js
import { loadDemoConfig, loadDemoUser } from "./lib/config.mjs";
import { assertPortsAvailable, startService, writePidFile } from "./lib/processes.mjs";
import "./reset-all.mjs";

const config = loadDemoConfig();
const demoUser = loadDemoUser();

await assertPortsAvailable(config.services);
const processes = config.services.map((service) => startService(service, demoUser));
writePidFile(config.pidFile, processes);

console.table(processes.map((processInfo) => ({
  service: processInfo.name,
  pid: processInfo.pid,
  ports: processInfo.ports.join(", "),
  health: processInfo.healthUrl
})));
```

- [ ] **Step 6: Implement stop script**

Create `demo/scripts/stop-all.mjs`:

```js
import fs from "node:fs";
import { loadDemoConfig } from "./lib/config.mjs";
import { readPidFile } from "./lib/processes.mjs";

const config = loadDemoConfig();
const processes = readPidFile(config.pidFile);

for (const processInfo of processes) {
  try {
    process.kill(processInfo.pid, "SIGTERM");
    console.log(`Stopped ${processInfo.name} (${processInfo.pid})`);
  } catch (error) {
    console.log(`Skipped ${processInfo.name}: process ${processInfo.pid} is not running`);
  }
}

if (fs.existsSync(config.pidFile)) {
  fs.unlinkSync(config.pidFile);
}
```

- [ ] **Step 7: Implement health script**

Create `demo/scripts/healthcheck-all.mjs`:

```js
import { loadDemoConfig } from "./lib/config.mjs";

const config = loadDemoConfig();
const results = [];

for (const service of config.services) {
  try {
    const response = await fetch(service.healthUrl, { signal: AbortSignal.timeout(5000) });
    results.push({ service: service.name, url: service.healthUrl, status: response.ok ? "ok" : `http ${response.status}` });
  } catch (error) {
    results.push({ service: service.name, url: service.healthUrl, status: "down" });
  }
}

console.table(results);

if (results.some((result) => result.status !== "ok")) {
  process.exit(1);
}
```

- [ ] **Step 8: Run helper tests**

Run:

```bash
node --test demo/scripts/lib/config.test.mjs demo/scripts/lib/processes.test.mjs
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add demo/scripts/lib/processes.mjs demo/scripts/lib/processes.test.mjs demo/scripts/start-all.mjs demo/scripts/stop-all.mjs demo/scripts/reset-all.mjs demo/scripts/healthcheck-all.mjs
git commit -m "feat: add local demo launcher scripts"
```

---

## Task 5: Wire Product Repos With Existing Demo Paths

**Files:**
- Modify: `/Users/yohannreimer/Downloads/Locais/atomic-crm-main/package.json`
- Modify: `/Users/yohannreimer/Downloads/Locais/Wpp Interface prot/package.json`
- Modify: `/Users/yohannreimer/Downloads/Locais/Plataforma Modular/package.json`
- Modify: `/Users/yohannreimer/Downloads/Locais/Plataforma Modular/apps/frontend/src/main.tsx`
- Modify: `/Users/yohannreimer/Downloads/operis-dev/operis/package.json`

- [ ] **Step 1: Add CRM fixed-port demo command**

In `/Users/yohannreimer/Downloads/Locais/atomic-crm-main/package.json`, add:

```json
"demo:prymeira": "VITE_IS_DEMO=true vite --config vite.demo.config --host 0.0.0.0 --port 5174 --force"
```

Run:

```bash
npm run build:demo
```

Expected: PASS.

- [ ] **Step 2: Add Talk demo commands**

In `/Users/yohannreimer/Downloads/Locais/Wpp Interface prot/package.json`, add:

```json
"demo:prymeira": "PRYMEIRA_LOCAL_AUTH_BYPASS=true PRYMEIRA_LOCAL_WORKSPACE_ID=demo_workspace PRYMEIRA_LOCAL_ROLE=owner VITE_LOCAL_AUTH_BYPASS=true VITE_API_URL=http://localhost:3002 pnpm --parallel dev",
"demo:reset": "pnpm --filter @prymeira-talk/api seed:demo"
```

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 3: Add Plataforma Modular demo commands**

In `/Users/yohannreimer/Downloads/Locais/Plataforma Modular/package.json`, add:

```json
"demo:prymeira": "APP_DB_PATH=./apps/backend/data/demo.db LOCAL_AUTH_BYPASS=1 VITE_LOCAL_AUTH_BYPASS=1 VITE_API_BASE_URL=http://localhost:4000 VITE_PRYMEIRA_HUB_URL=http://localhost:5175 npm run dev:backend & APP_DB_PATH=./apps/backend/data/demo.db LOCAL_AUTH_BYPASS=1 VITE_LOCAL_AUTH_BYPASS=1 VITE_API_BASE_URL=http://localhost:4000 VITE_PRYMEIRA_HUB_URL=http://localhost:5175 npm run dev:frontend",
"demo:reset": "rm -f ./apps/backend/data/demo.db"
```

This command uses the existing backend seed path: deleting `demo.db` forces `seedDb()` to recreate demo data on the next backend start.

- [ ] **Step 4: Allow Plataforma Modular local bypass without Clerk key**

In `/Users/yohannreimer/Downloads/Locais/Plataforma Modular/apps/frontend/src/main.tsx`, import:

```ts
import { isLocalAuthBypassEnabled } from './auth/localDevAuth';
```

Compute:

```ts
const localAuthBypass = isLocalAuthBypassEnabled(window.location.hostname);
```

Render condition:

```tsx
{clerkPublishableKey || localAuthBypass ? (
  <ClerkProvider publishableKey={clerkPublishableKey ?? 'pk_demo_local'} signInUrl="/" afterSignOutUrl="/">
    <BrowserRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  </ClerkProvider>
) : (
  <MissingClerkConfig />
)}
```

Run:

```bash
npm --workspace apps/frontend run test -- src/auth/localDevAuth.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 5: Add Operis demo commands**

In `/Users/yohannreimer/Downloads/operis-dev/operis/package.json`, add:

```json
"demo:prymeira": "VITE_DEMO_MODE=true VITE_API_URL=http://localhost:3000 VITE_PRYMEIRA_ACCOUNT_API_URL=http://localhost:3001 VITE_PRYMEIRA_HUB_URL=http://localhost:5175 PORT=3000 npm run dev:api & VITE_DEMO_MODE=true VITE_API_URL=http://localhost:3000 VITE_PRYMEIRA_ACCOUNT_API_URL=http://localhost:3001 VITE_PRYMEIRA_HUB_URL=http://localhost:5175 npm run dev:web -- --host 0.0.0.0 --port 5178",
"demo:reset": "npm run seed --workspace @execution-os/api"
```

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit product wiring in each repo**

Run one commit per repo:

```bash
git -C "/Users/yohannreimer/Downloads/Locais/atomic-crm-main" add package.json
git -C "/Users/yohannreimer/Downloads/Locais/atomic-crm-main" commit -m "feat: add prymeira local demo command"

git -C "/Users/yohannreimer/Downloads/Locais/Wpp Interface prot" add package.json
git -C "/Users/yohannreimer/Downloads/Locais/Wpp Interface prot" commit -m "feat: add prymeira local demo command"

git -C "/Users/yohannreimer/Downloads/Locais/Plataforma Modular" add package.json apps/frontend/src/main.tsx
git -C "/Users/yohannreimer/Downloads/Locais/Plataforma Modular" commit -m "feat: add prymeira local demo command"

git -C "/Users/yohannreimer/Downloads/operis-dev/operis" add package.json
git -C "/Users/yohannreimer/Downloads/operis-dev/operis" commit -m "feat: add prymeira local demo command"
```

---

## Task 6: Flowcut Local Demo Bypass

**Files:**
- Modify: `/Users/yohannreimer/Downloads/Locais/MediaFactory-SaaS/package.json`
- Modify: `/Users/yohannreimer/Downloads/Locais/MediaFactory-SaaS/src/client/PrymeiraAuthGate.tsx`
- Modify: `/Users/yohannreimer/Downloads/Locais/MediaFactory-SaaS/src/server/prymeira/tenant.ts`
- Create: `/Users/yohannreimer/Downloads/Locais/MediaFactory-SaaS/src/server/prymeira/tenant-demo.test.ts`

- [ ] **Step 1: Write failing tenant demo test**

Create `/Users/yohannreimer/Downloads/Locais/MediaFactory-SaaS/src/server/prymeira/tenant-demo.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createPrymeiraTenantAccess } from "./tenant";

describe("Flowcut demo tenant access", () => {
  it("returns demo tenant context when demo mode is enabled", async () => {
    const previousDemoMode = process.env.DEMO_MODE;
    process.env.DEMO_MODE = "true";

    const requireTenantAccess = createPrymeiraTenantAccess({
      accountApiUrl: "http://localhost:3001",
      productKey: "media"
    });

    await expect(requireTenantAccess("Bearer demo-token")).resolves.toMatchObject({
      token: "demo-token",
      workspaceId: "demo_workspace",
      workspaceRole: "owner",
      productKey: "media",
      plan: "suite"
    });

    if (previousDemoMode === undefined) {
      delete process.env.DEMO_MODE;
    } else {
      process.env.DEMO_MODE = previousDemoMode;
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/server/prymeira/tenant-demo.test.ts
```

Expected: FAIL because demo tenant access does not exist.

- [ ] **Step 3: Implement server demo tenant**

In `src/server/prymeira/tenant.ts`, add before real token requirement:

```ts
function isDemoMode() {
  return process.env.DEMO_MODE === "true";
}

function createDemoTenantContext(productKey: string): PrymeiraTenantContext {
  return {
    token: "demo-token",
    workspaceId: process.env.DEMO_WORKSPACE_ID ?? "demo_workspace",
    workspaceRole: "owner",
    productKey,
    productRole: "owner",
    plan: "suite",
    limits: {}
  };
}
```

Inside `requireTenantAccess`:

```ts
if (isDemoMode()) {
  const token = getBearerToken(authorization);
  if (token !== "demo-token") {
    throw new PrymeiraTenantError(401, "missing_auth_token", "Missing demo bearer token.");
  }
  return createDemoTenantContext(productKey);
}
```

- [ ] **Step 4: Implement client demo bypass**

In `src/client/PrymeiraAuthGate.tsx`, add:

```ts
const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";
```

Before rendering Clerk provider:

```tsx
if (isDemoMode) {
  return <LocalAuthBypass>{children}</LocalAuthBypass>;
}
```

In `LocalAuthBypass`, configure token getter:

```tsx
useEffect(() => {
  configureApiAuth(() => Promise.resolve("demo-token"));
  return () => configureApiAuth(null);
}, []);
```

- [ ] **Step 5: Add Flowcut demo command**

In `/Users/yohannreimer/Downloads/Locais/MediaFactory-SaaS/package.json`, add:

```json
"demo:prymeira": "DEMO_MODE=true VITE_DEMO_MODE=true VITE_PRYMEIRA_HUB_URL=http://localhost:5175 PRYMEIRA_ACCOUNT_API_URL=http://localhost:3001 PORT=4317 concurrently -k \"vite --host 0.0.0.0 --port 5177\" \"tsx watch src/server/index.ts\""
```

- [ ] **Step 6: Run Flowcut checks**

Run:

```bash
npm test -- src/server/prymeira/tenant-demo.test.ts
npm run check
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git -C "/Users/yohannreimer/Downloads/Locais/MediaFactory-SaaS" add package.json src/client/PrymeiraAuthGate.tsx src/server/prymeira/tenant.ts src/server/prymeira/tenant-demo.test.ts
git -C "/Users/yohannreimer/Downloads/Locais/MediaFactory-SaaS" commit -m "feat: add flowcut local demo bypass"
```

---

## Task 7: End-To-End Demo Verification And Docs

**Files:**
- Modify: `docs/ecosystem/README.md`
- Create: `docs/ecosystem/local-demo.md`
- Modify: `docs/superpowers/specs/2026-06-07-local-demo-ecosystem-design.md`

- [ ] **Step 1: Add local demo docs**

Create `docs/ecosystem/local-demo.md`:

```md
# Demo local integrada

Use esta demo para testar todos os produtos Prymeira em localhost com dados fake resetaveis.

## Comandos

```bash
pnpm demo:start
pnpm demo:health
pnpm demo:stop
```

`pnpm demo:start` executa o reset antes de subir os apps.

## URLs

| Produto | URL |
|---|---|
| Hub | http://localhost:5175 |
| Flowcut | http://localhost:5177 |
| Fluvia | http://localhost:5173/m/financeiro |
| Velio | http://localhost:5173/m/tecnico |
| Vincula CRM | http://localhost:5174 |
| Operis | http://localhost:5178 |
| Prymeira Talk | http://localhost:5176 |

## Identidade

- Usuario: `demo@prymeira.local`
- Workspace: `demo_workspace`
- Token local: `demo-token`

## Roteiro rapido

1. Abra o Hub em `http://localhost:5175`.
2. Confirme que todos os produtos aparecem ativos.
3. Abra cada produto pelo card do Hub.
4. Confirme que nenhum app pede login real.
5. Rode `pnpm demo:stop` ao final.
```

- [ ] **Step 2: Link docs from ecosystem README**

In `docs/ecosystem/README.md`, add a row under "Padrões do ecossistema":

```md
| [local-demo.md](./local-demo.md) | Como rodar a demo integrada local com todos os apps |
```

- [ ] **Step 3: Run local script tests**

Run:

```bash
node --test demo/scripts/lib/config.test.mjs demo/scripts/lib/processes.test.mjs
pnpm --filter @prymeira/account-api test
pnpm --filter @prymeira/hub-web typecheck
```

Expected: PASS.

- [ ] **Step 4: Start the full demo**

Run:

```bash
pnpm demo:start
```

Expected: terminal table includes all services and PIDs. Keep this command running in its own terminal until Step 7.

- [ ] **Step 5: Run healthcheck**

In another terminal:

```bash
pnpm demo:health
```

Expected: PASS table with `ok` for every service.

- [ ] **Step 6: Browser smoke**

Open `http://localhost:5175` in the in-app browser. Verify:

- Hub renders without Clerk login.
- Hub shows `Usuario Demo` or demo customer/workspace data.
- Flowcut card opens `http://localhost:5177`.
- Fluvia card opens `http://localhost:5173/m/financeiro`.
- Velio card opens `http://localhost:5173/m/tecnico`.
- Vincula CRM card opens `http://localhost:5174`.
- Operis card opens `http://localhost:5178`.
- Talk card opens `http://localhost:5176`.

- [ ] **Step 7: Stop the full demo**

Run:

```bash
pnpm demo:stop
```

Expected: PID file is removed and no configured demo port remains occupied by a launcher-started process.

- [ ] **Step 8: Commit final docs**

```bash
git add docs/ecosystem/local-demo.md docs/ecosystem/README.md docs/superpowers/specs/2026-06-07-local-demo-ecosystem-design.md
git commit -m "docs: add local demo runbook"
```

---

## Self-Review

### Spec Coverage

- One command starts all apps: Task 4 and Task 7.
- Hub entry point: Task 3 and Task 7.
- Local Account API demo access: Task 2.
- No real Clerk: Task 3, Task 5, Task 6.
- Reset fake data on start: Task 4 and product reset commands in Task 5.
- Fixed ports: Task 1 config and product commands in Tasks 5-6.
- Services external simulation: Task 2 checkout simulation, Talk existing simulated Evolution path, Flowcut demo tenant bypass.
- Healthcheck: Task 4 and Task 7.
- Documentation: Task 7.

### Placeholder Scan

The plan contains concrete file paths, commands and code snippets for the first implementation pass. Product-specific data quality improvements beyond existing seeds are deliberately outside the first pass and should be handled after the integrated launcher works.

### Type Consistency

- Demo token is consistently `demo-token`.
- Demo user id is consistently `demo_user`.
- Demo workspace id is consistently `demo_workspace`.
- Account API uses `product_key` in HTTP payloads and `productKey` only inside existing Prisma/internal code.
