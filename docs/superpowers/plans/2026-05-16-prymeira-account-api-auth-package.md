# Prymeira Account API and Auth Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first Prymeira Digital account infrastructure slice: a Fastify Account API backed by Prisma/PostgreSQL and a reusable `@prymeira/auth` TypeScript package.

**Architecture:** Use a small pnpm monorepo with `apps/account-api` and `packages/auth`. The Account API owns Clerk verification, customers, products, entitlements, access evaluation, and admin mutations. The auth package is a typed client/helper layer that product apps use to call the Account API from backend integration points.

**Tech Stack:** Node.js, TypeScript, pnpm workspaces, Fastify, Prisma, PostgreSQL, Zod, Vitest, tsup, Clerk Backend SDK.

---

## Scope Check

This plan covers two tightly coupled deliverables in one implementation track:

- Account API: source of truth for product authorization.
- `@prymeira/auth`: reusable package consumed by existing product apps.

Hub Web, Admin Web, payment gateway checkout, and payment webhooks are outside this implementation. Admin functionality is exposed through API endpoints only.

## File Structure

Create this structure:

```txt
package.json
pnpm-workspace.yaml
tsconfig.base.json
.gitignore
.env.example

apps/
  account-api/
    package.json
    tsconfig.json
    vitest.config.ts
    prisma/
      schema.prisma
      seed.ts
    src/
      app.ts
      server.ts
      env.ts
      plugins/
        prisma.ts
      lib/
        errors.ts
        time.ts
      modules/
        auth/
          clerk.ts
          admin.ts
          types.ts
        access/
          access.routes.ts
          access.service.ts
          access.types.ts
          access.service.test.ts
        customers/
          customers.routes.ts
          customers.service.ts
          customers.schemas.ts
          customers.routes.test.ts
        products/
          products.service.ts
        admin/
          admin.routes.ts
          admin.schemas.ts
          admin.routes.test.ts
        entitlements/
          entitlements.service.ts
      test/
        build-app.ts
        auth-fixtures.ts

packages/
  auth/
    package.json
    tsconfig.json
    tsup.config.ts
    vitest.config.ts
    src/
      client.ts
      errors.ts
      server.ts
      types.ts
      index.ts
      client.test.ts
```

Responsibilities:

- `apps/account-api/src/app.ts`: build and configure the Fastify app for tests and runtime.
- `apps/account-api/src/server.ts`: start the HTTP server.
- `apps/account-api/src/env.ts`: validate environment variables.
- `apps/account-api/src/plugins/prisma.ts`: attach Prisma to Fastify.
- `apps/account-api/src/modules/auth`: Clerk token verification and admin allowlist checks.
- `apps/account-api/src/modules/access`: pure entitlement evaluation and `/access-check`.
- `apps/account-api/src/modules/customers`: customer sync and customer lookup.
- `apps/account-api/src/modules/admin`: admin customer listing and entitlement mutation routes.
- `apps/account-api/src/modules/entitlements`: entitlement upsert/block/trial helpers with audit logs.
- `packages/auth/src/client.ts`: low-level HTTP client for Account API.
- `packages/auth/src/server.ts`: backend helpers such as `requireProductAccess`.
- `packages/auth/src/types.ts`: shared response and option types.

## Task 1: Monorepo Foundation

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `apps/account-api/package.json`
- Create: `apps/account-api/tsconfig.json`
- Create: `apps/account-api/vitest.config.ts`
- Create: `packages/auth/package.json`
- Create: `packages/auth/tsconfig.json`
- Create: `packages/auth/tsup.config.ts`
- Create: `packages/auth/vitest.config.ts`

- [ ] **Step 1: Create root workspace files**

Create `package.json`:

```json
{
  "name": "prymeira-account",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@9.15.4",
  "scripts": {
    "build": "pnpm -r build",
    "dev": "pnpm --filter @prymeira/account-api dev",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "lint": "pnpm -r lint",
    "prisma:generate": "pnpm --filter @prymeira/account-api prisma:generate",
    "prisma:migrate": "pnpm --filter @prymeira/account-api prisma:migrate",
    "prisma:seed": "pnpm --filter @prymeira/account-api prisma:seed"
  },
  "devDependencies": {
    "@types/node": "^22.15.18",
    "typescript": "^5.8.3",
    "vitest": "^3.1.3"
  }
}
```

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

Create `.gitignore`:

```gitignore
node_modules
dist
.env
.env.local
coverage
*.log
.DS_Store
apps/account-api/prisma/dev.db
```

Create `.env.example`:

```txt
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/prymeira_account"
CLERK_SECRET_KEY="sk_test_replace_me"
CLERK_PUBLISHABLE_KEY="pk_test_replace_me"
ADMIN_EMAILS="owner@primeiradigital.com.br"
PORT="3001"
NODE_ENV="development"
PRYMEIRA_ACCOUNT_API_URL="http://localhost:3001"
PRYMEIRA_PRODUCT_KEY="operis"
```

- [ ] **Step 2: Create Account API package config**

Create `apps/account-api/package.json`:

```json
{
  "name": "@prymeira/account-api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsx watch src/server.ts",
    "lint": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@clerk/backend": "^1.34.0",
    "@fastify/cors": "^11.0.1",
    "@prisma/client": "^6.8.2",
    "fastify": "^5.3.3",
    "zod": "^3.24.4"
  },
  "devDependencies": {
    "prisma": "^6.8.2",
    "tsx": "^4.19.4"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

Create `apps/account-api/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": ".",
    "types": ["node", "vitest/globals"]
  },
  "include": ["src", "prisma", "vitest.config.ts"]
}
```

Create `apps/account-api/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    restoreMocks: true
  }
});
```

- [ ] **Step 3: Create auth package config**

Create `packages/auth/package.json`:

```json
{
  "name": "@prymeira/auth",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "lint": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "tsup": "^8.4.0"
  }
}
```

Create `packages/auth/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node", "vitest/globals"]
  },
  "include": ["src", "vitest.config.ts", "tsup.config.ts"]
}
```

Create `packages/auth/tsup.config.ts`:

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true
});
```

Create `packages/auth/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    restoreMocks: true
  }
});
```

- [ ] **Step 4: Install dependencies**

Run:

```bash
pnpm install
```

Expected: pnpm creates `pnpm-lock.yaml` and installs all workspace dependencies without errors.

- [ ] **Step 5: Run typecheck baseline**

Run:

```bash
pnpm typecheck
```

Expected: this may fail because source entry files do not exist yet. If it fails only with missing inputs, continue to Task 2.

- [ ] **Step 6: Commit foundation**

Run:

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .gitignore .env.example apps/account-api/package.json apps/account-api/tsconfig.json apps/account-api/vitest.config.ts packages/auth/package.json packages/auth/tsconfig.json packages/auth/tsup.config.ts packages/auth/vitest.config.ts pnpm-lock.yaml
git commit -m "chore: scaffold account monorepo"
```

## Task 2: Prisma Schema and Product Seed

**Files:**

- Create: `apps/account-api/prisma/schema.prisma`
- Create: `apps/account-api/prisma/seed.ts`

- [ ] **Step 1: Create Prisma schema**

Create `apps/account-api/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Customer {
  id                String         @id @default(uuid()) @db.Uuid
  clerkUserId       String         @unique @map("clerk_user_id")
  email             String
  name              String?
  gatewayCustomerId String?        @map("gateway_customer_id")
  createdAt         DateTime       @default(now()) @map("created_at")
  updatedAt         DateTime       @updatedAt @map("updated_at")
  entitlements      Entitlement[]
  subscriptions     Subscription[]

  @@map("customers")
}

model Product {
  id           String        @id @default(uuid()) @db.Uuid
  productKey   String        @unique @map("product_key")
  name         String
  description  String?
  appUrl       String        @map("app_url")
  marketingUrl String?       @map("marketing_url")
  status       String        @default("active")
  createdAt    DateTime      @default(now()) @map("created_at")
  updatedAt    DateTime      @updatedAt @map("updated_at")
  entitlements Entitlement[]

  @@map("products")
}

model Entitlement {
  id                  String   @id @default(uuid()) @db.Uuid
  customerId          String   @map("customer_id") @db.Uuid
  productKey          String   @map("product_key")
  status              String
  plan                String   @default("free")
  source              String
  startsAt            DateTime @default(now()) @map("starts_at")
  endsAt              DateTime? @map("ends_at")
  trialEndsAt         DateTime? @map("trial_ends_at")
  currentPeriodEndsAt DateTime? @map("current_period_ends_at")
  limits              Json     @default("{}")
  metadata            Json     @default("{}")
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")
  customer            Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  product             Product  @relation(fields: [productKey], references: [productKey], onDelete: Restrict)

  @@unique([customerId, productKey])
  @@map("entitlements")
}

model Subscription {
  id                    String   @id @default(uuid()) @db.Uuid
  customerId            String   @map("customer_id") @db.Uuid
  gateway               String?
  gatewaySubscriptionId String?  @map("gateway_subscription_id")
  gatewayCustomerId     String?  @map("gateway_customer_id")
  status                String
  plan                  String
  amountCents           Int?     @map("amount_cents")
  currency              String   @default("BRL")
  currentPeriodStart    DateTime? @map("current_period_start")
  currentPeriodEnd      DateTime? @map("current_period_end")
  cancelAtPeriodEnd     Boolean  @default(false) @map("cancel_at_period_end")
  metadata              Json     @default("{}")
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")
  customer              Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)

  @@map("subscriptions")
}

model AuditLog {
  id                String   @id @default(uuid()) @db.Uuid
  actorClerkUserId  String?  @map("actor_clerk_user_id")
  action            String
  targetType        String   @map("target_type")
  targetId          String   @map("target_id")
  before            Json?
  after             Json?
  createdAt         DateTime @default(now()) @map("created_at")

  @@map("audit_logs")
}
```

- [ ] **Step 2: Add product seed**

Create `apps/account-api/prisma/seed.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const products = [
  {
    productKey: "operis",
    name: "Operis",
    description: "Segundo cerebro, tarefas e organizacao pessoal.",
    appUrl: "https://operis.primeiradigital.com.br",
    marketingUrl: "https://primeiradigital.com.br/operis"
  },
  {
    productKey: "orquestrador",
    name: "Orquestrador",
    description: "App tecnico de orquestracao.",
    appUrl: "https://orquestrador.primeiradigital.com.br",
    marketingUrl: "https://primeiradigital.com.br/orquestrador"
  },
  {
    productKey: "financeiro",
    name: "Financeiro",
    description: "Gestao financeira.",
    appUrl: "https://financeiro.primeiradigital.com.br",
    marketingUrl: "https://primeiradigital.com.br/financeiro"
  },
  {
    productKey: "media",
    name: "Media AI",
    description: "App de videos e midia.",
    appUrl: "https://media.primeiradigital.com.br",
    marketingUrl: "https://primeiradigital.com.br/media"
  },
  {
    productKey: "ads",
    name: "Ads Vision",
    description: "Campanhas e Meta Ads.",
    appUrl: "https://ads.primeiradigital.com.br",
    marketingUrl: "https://primeiradigital.com.br/ads"
  },
  {
    productKey: "commerce",
    name: "Commerce Intel",
    description: "Monitoramento de e-commerce.",
    appUrl: "https://commerce.primeiradigital.com.br",
    marketingUrl: "https://primeiradigital.com.br/commerce"
  }
];

async function main() {
  for (const product of products) {
    await prisma.product.upsert({
      where: { productKey: product.productKey },
      update: {
        name: product.name,
        description: product.description,
        appUrl: product.appUrl,
        marketingUrl: product.marketingUrl,
        status: "active"
      },
      create: {
        ...product,
        status: "active"
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
```

- [ ] **Step 3: Generate Prisma client**

Run:

```bash
pnpm prisma:generate
```

Expected: Prisma Client is generated for `apps/account-api`.

- [ ] **Step 4: Run schema formatting**

Run:

```bash
pnpm --filter @prymeira/account-api exec prisma format
```

Expected: Prisma formats `schema.prisma` without changing model semantics.

- [ ] **Step 5: Commit data model**

Run:

```bash
git add apps/account-api/prisma/schema.prisma apps/account-api/prisma/seed.ts package.json pnpm-lock.yaml
git commit -m "feat: add account data model"
```

## Task 3: Account API App Shell and Error Handling

**Files:**

- Create: `apps/account-api/src/env.ts`
- Create: `apps/account-api/src/app.ts`
- Create: `apps/account-api/src/server.ts`
- Create: `apps/account-api/src/plugins/prisma.ts`
- Create: `apps/account-api/src/lib/errors.ts`
- Create: `apps/account-api/src/lib/time.ts`

- [ ] **Step 1: Add env validation**

Create `apps/account-api/src/env.ts`:

```ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
  ADMIN_EMAILS: z.string().default(""),
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development")
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(input: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(input);
}
```

- [ ] **Step 2: Add error helpers**

Create `apps/account-api/src/lib/errors.ts`:

```ts
import type { FastifyReply } from "fastify";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ApiErrorCode,
    message: string
  ) {
    super(message);
  }
}

export function sendApiError(reply: FastifyReply, error: ApiError) {
  return reply.status(error.statusCode).send({
    error: {
      code: error.code,
      message: error.message
    }
  });
}
```

Create `apps/account-api/src/lib/time.ts`:

```ts
export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
```

- [ ] **Step 3: Add Prisma plugin**

Create `apps/account-api/src/plugins/prisma.ts`:

```ts
import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export const prismaPlugin = fp(async (app) => {
  const prisma = new PrismaClient();
  app.decorate("prisma", prisma);

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
});
```

Add `fastify-plugin` to `apps/account-api/package.json` dependencies:

```json
"fastify-plugin": "^5.0.1"
```

- [ ] **Step 4: Add Fastify app and health route**

Create `apps/account-api/src/app.ts`:

```ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import { ApiError, sendApiError } from "./lib/errors.js";
import { prismaPlugin } from "./plugins/prisma.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "test" ? "silent" : "info"
    }
  });

  await app.register(cors, { origin: true });
  await app.register(prismaPlugin);

  app.get("/health", async () => ({ ok: true }));

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ApiError) {
      return sendApiError(reply, error);
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: error.issues.map((issue) => issue.message).join("; ")
        }
      });
    }

    requestLogError(reply, error);
    return reply.status(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected server error."
      }
    });
  });

  return app;
}

function requestLogError(reply: { log?: { error: (error: unknown) => void } }, error: unknown) {
  reply.log?.error(error);
}
```

Create `apps/account-api/src/server.ts`:

```ts
import { buildApp } from "./app.js";
import { loadEnv } from "./env.js";

const env = loadEnv();
const app = await buildApp();

await app.listen({
  port: env.PORT,
  host: "0.0.0.0"
});
```

- [ ] **Step 5: Run typecheck**

Run:

```bash
pnpm --filter @prymeira/account-api typecheck
```

Expected: PASS. If TypeScript reports `requestLogError` shape issues, replace the handler body with `app.log.error(error)` and rerun.

- [ ] **Step 6: Commit app shell**

Run:

```bash
git add apps/account-api/src apps/account-api/package.json pnpm-lock.yaml
git commit -m "feat: add account api shell"
```

## Task 4: Clerk Auth and Admin Guards

**Files:**

- Create: `apps/account-api/src/modules/auth/types.ts`
- Create: `apps/account-api/src/modules/auth/clerk.ts`
- Create: `apps/account-api/src/modules/auth/admin.ts`

- [ ] **Step 1: Add auth types**

Create `apps/account-api/src/modules/auth/types.ts`:

```ts
export type AuthenticatedUser = {
  clerkUserId: string;
  email: string;
  name?: string;
};

export type AuthVerifier = {
  verifyBearerToken(authorizationHeader: string | undefined): Promise<AuthenticatedUser>;
};
```

- [ ] **Step 2: Implement Clerk verifier**

Create `apps/account-api/src/modules/auth/clerk.ts`:

```ts
import { createClerkClient } from "@clerk/backend";
import { ApiError } from "../../lib/errors.js";
import { loadEnv } from "../../env.js";
import type { AuthenticatedUser, AuthVerifier } from "./types.js";

export function createClerkAuthVerifier(): AuthVerifier {
  const env = loadEnv();
  const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

  return {
    async verifyBearerToken(authorizationHeader) {
      const token = extractBearerToken(authorizationHeader);
      const payload = await clerk.verifyToken(token);
      const clerkUserId = payload.sub;

      if (!clerkUserId) {
        throw new ApiError(401, "UNAUTHORIZED", "Authentication is required.");
      }

      const user = await clerk.users.getUser(clerkUserId);
      const email = user.primaryEmailAddress?.emailAddress;

      if (!email) {
        throw new ApiError(401, "UNAUTHORIZED", "Authenticated user has no primary email.");
      }

      return {
        clerkUserId,
        email,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined
      } satisfies AuthenticatedUser;
    }
  };
}

export function extractBearerToken(authorizationHeader: string | undefined): string {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();

  if (!token) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  return token;
}
```

- [ ] **Step 3: Implement admin allowlist check**

Create `apps/account-api/src/modules/auth/admin.ts`:

```ts
import { ApiError } from "../../lib/errors.js";

export function parseAdminEmails(value: string): Set<string> {
  return new Set(
    value
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function assertAdminEmail(email: string, adminEmails: Set<string>) {
  if (!adminEmails.has(email.toLowerCase())) {
    throw new ApiError(403, "FORBIDDEN", "Admin access is required.");
  }
}
```

- [ ] **Step 4: Run typecheck**

Run:

```bash
pnpm --filter @prymeira/account-api typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit auth guards**

Run:

```bash
git add apps/account-api/src/modules/auth
git commit -m "feat: add clerk auth guards"
```

## Task 5: Access Evaluation Domain

**Files:**

- Create: `apps/account-api/src/modules/access/access.types.ts`
- Create: `apps/account-api/src/modules/access/access.service.ts`
- Create: `apps/account-api/src/modules/access/access.service.test.ts`

- [ ] **Step 1: Write failing access evaluation tests**

Create `apps/account-api/src/modules/access/access.service.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { evaluateEntitlementAccess } from "./access.service.js";
import type { AccessProduct, AccessEntitlement } from "./access.types.js";

const now = new Date("2026-05-16T12:00:00.000Z");

const product: AccessProduct = {
  productKey: "operis",
  status: "active",
  marketingUrl: "https://primeiradigital.com.br/operis"
};

function entitlement(overrides: Partial<AccessEntitlement>): AccessEntitlement {
  return {
    productKey: "operis",
    status: "active",
    plan: "pro",
    source: "manual",
    endsAt: null,
    trialEndsAt: null,
    currentPeriodEndsAt: null,
    limits: { ai_requests_month: 1000 },
    ...overrides
  };
}

describe("evaluateEntitlementAccess", () => {
  it("denies when the customer is missing", () => {
    const result = evaluateEntitlementAccess({ hasCustomer: false, product, entitlement: null, now });
    expect(result).toMatchObject({ allowed: false, reason: "no_customer" });
  });

  it("denies when the product is missing", () => {
    const result = evaluateEntitlementAccess({ hasCustomer: true, product: null, entitlement: null, now });
    expect(result).toMatchObject({ allowed: false, reason: "no_product" });
  });

  it("denies when the product is inactive", () => {
    const result = evaluateEntitlementAccess({
      hasCustomer: true,
      product: { ...product, status: "inactive" },
      entitlement: null,
      now
    });
    expect(result).toMatchObject({ allowed: false, reason: "inactive_product" });
  });

  it("allows active entitlement", () => {
    const result = evaluateEntitlementAccess({ hasCustomer: true, product, entitlement: entitlement({}), now });
    expect(result).toMatchObject({ allowed: true, reason: "active_entitlement", plan: "pro" });
  });

  it("allows internal entitlement", () => {
    const result = evaluateEntitlementAccess({
      hasCustomer: true,
      product,
      entitlement: entitlement({ status: "internal", plan: "internal", source: "internal" }),
      now
    });
    expect(result).toMatchObject({ allowed: true, reason: "internal_access" });
  });

  it("allows valid trial", () => {
    const result = evaluateEntitlementAccess({
      hasCustomer: true,
      product,
      entitlement: entitlement({ status: "trial", trialEndsAt: new Date("2026-05-20T00:00:00.000Z") }),
      now
    });
    expect(result).toMatchObject({ allowed: true, reason: "active_entitlement", status: "trial" });
  });

  it("denies expired trial", () => {
    const result = evaluateEntitlementAccess({
      hasCustomer: true,
      product,
      entitlement: entitlement({ status: "trial", trialEndsAt: new Date("2026-05-01T00:00:00.000Z") }),
      now
    });
    expect(result).toMatchObject({ allowed: false, reason: "trial_expired" });
  });

  it("denies blocked entitlement", () => {
    const result = evaluateEntitlementAccess({
      hasCustomer: true,
      product,
      entitlement: entitlement({ status: "blocked" }),
      now
    });
    expect(result).toMatchObject({ allowed: false, reason: "blocked" });
  });

  it("denies cancelled entitlement immediately", () => {
    const result = evaluateEntitlementAccess({
      hasCustomer: true,
      product,
      entitlement: entitlement({ status: "cancelled" }),
      now
    });
    expect(result).toMatchObject({ allowed: false, reason: "cancelled" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @prymeira/account-api vitest run src/modules/access/access.service.test.ts
```

Expected: FAIL because `access.service.ts` and `access.types.ts` do not exist.

- [ ] **Step 3: Add access types and evaluator**

Create `apps/account-api/src/modules/access/access.types.ts`:

```ts
export type AccessReason =
  | "no_customer"
  | "no_product"
  | "inactive_product"
  | "no_entitlement"
  | "expired"
  | "blocked"
  | "cancelled"
  | "trial_expired"
  | "active_entitlement"
  | "internal_access";

export type AccessProduct = {
  productKey: string;
  status: string;
  marketingUrl: string | null;
};

export type AccessEntitlement = {
  productKey: string;
  status: string;
  plan: string;
  source: string;
  endsAt: Date | null;
  trialEndsAt: Date | null;
  currentPeriodEndsAt: Date | null;
  limits: unknown;
};

export type AccessDecision = {
  allowed: boolean;
  product_key: string;
  status: string;
  plan?: string;
  source?: string;
  limits?: unknown;
  reason: AccessReason;
  upgrade_url?: string;
};
```

Create `apps/account-api/src/modules/access/access.service.ts`:

```ts
import type { AccessDecision, AccessEntitlement, AccessProduct } from "./access.types.js";

type EvaluateAccessInput = {
  hasCustomer: boolean;
  product: AccessProduct | null;
  entitlement: AccessEntitlement | null;
  now: Date;
};

export function evaluateEntitlementAccess(input: EvaluateAccessInput): AccessDecision {
  const productKey = input.product?.productKey ?? input.entitlement?.productKey ?? "unknown";

  if (!input.hasCustomer) {
    return deny(productKey, "locked", "no_customer", input.product?.marketingUrl);
  }

  if (!input.product) {
    return deny(productKey, "locked", "no_product");
  }

  if (input.product.status !== "active") {
    return deny(input.product.productKey, input.product.status, "inactive_product", input.product.marketingUrl);
  }

  if (!input.entitlement) {
    return deny(input.product.productKey, "locked", "no_entitlement", input.product.marketingUrl);
  }

  const entitlement = input.entitlement;

  if (entitlement.status === "blocked") {
    return denyWithEntitlement(entitlement, "blocked", input.product.marketingUrl);
  }

  if (entitlement.status === "cancelled") {
    return denyWithEntitlement(entitlement, "cancelled", input.product.marketingUrl);
  }

  if (entitlement.status === "expired") {
    return denyWithEntitlement(entitlement, "expired", input.product.marketingUrl);
  }

  if (entitlement.endsAt && entitlement.endsAt <= input.now) {
    return denyWithEntitlement(entitlement, "expired", input.product.marketingUrl);
  }

  if (entitlement.status === "trial") {
    if (!entitlement.trialEndsAt || entitlement.trialEndsAt <= input.now) {
      return denyWithEntitlement(entitlement, "trial_expired", input.product.marketingUrl);
    }

    return allow(entitlement, "active_entitlement");
  }

  if (entitlement.status === "internal") {
    return allow(entitlement, "internal_access");
  }

  if (entitlement.status === "active") {
    return allow(entitlement, "active_entitlement");
  }

  return denyWithEntitlement(entitlement, "expired", input.product.marketingUrl);
}

function allow(entitlement: AccessEntitlement, reason: AccessDecision["reason"]): AccessDecision {
  return {
    allowed: true,
    product_key: entitlement.productKey,
    status: entitlement.status,
    plan: entitlement.plan,
    source: entitlement.source,
    limits: entitlement.limits,
    reason
  };
}

function deny(
  productKey: string,
  status: string,
  reason: AccessDecision["reason"],
  upgradeUrl?: string | null
): AccessDecision {
  return {
    allowed: false,
    product_key: productKey,
    status,
    reason,
    ...(upgradeUrl ? { upgrade_url: upgradeUrl } : {})
  };
}

function denyWithEntitlement(
  entitlement: AccessEntitlement,
  reason: AccessDecision["reason"],
  upgradeUrl?: string | null
): AccessDecision {
  return {
    allowed: false,
    product_key: entitlement.productKey,
    status: entitlement.status,
    plan: entitlement.plan,
    source: entitlement.source,
    limits: entitlement.limits,
    reason,
    ...(upgradeUrl ? { upgrade_url: upgradeUrl } : {})
  };
}
```

- [ ] **Step 4: Run access tests**

Run:

```bash
pnpm --filter @prymeira/account-api vitest run src/modules/access/access.service.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit access domain**

Run:

```bash
git add apps/account-api/src/modules/access
git commit -m "feat: add entitlement access evaluation"
```

## Task 6: Customer Sync and Access Routes

**Files:**

- Create: `apps/account-api/src/modules/customers/customers.schemas.ts`
- Create: `apps/account-api/src/modules/customers/customers.service.ts`
- Create: `apps/account-api/src/modules/customers/customers.routes.ts`
- Create: `apps/account-api/src/modules/products/products.service.ts`
- Create: `apps/account-api/src/modules/access/access.routes.ts`
- Modify: `apps/account-api/src/app.ts`
- Create: `apps/account-api/test/auth-fixtures.ts`
- Create: `apps/account-api/test/build-app.ts`

- [ ] **Step 1: Add route test helpers**

Create `apps/account-api/test/auth-fixtures.ts`:

```ts
import type { AuthVerifier, AuthenticatedUser } from "../src/modules/auth/types.js";

export function createStaticAuthVerifier(user: AuthenticatedUser): AuthVerifier {
  return {
    async verifyBearerToken() {
      return user;
    }
  };
}
```

Create `apps/account-api/test/build-app.ts`:

```ts
import { buildApp } from "../src/app.js";
import type { AuthVerifier } from "../src/modules/auth/types.js";

export async function buildTestApp(authVerifier: AuthVerifier) {
  return buildApp({ authVerifier });
}
```

- [ ] **Step 2: Modify app builder for injectable auth**

Replace `apps/account-api/src/app.ts` with:

```ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import { ApiError, sendApiError } from "./lib/errors.js";
import { prismaPlugin } from "./plugins/prisma.js";
import { createClerkAuthVerifier } from "./modules/auth/clerk.js";
import type { AuthVerifier } from "./modules/auth/types.js";
import { customersRoutes } from "./modules/customers/customers.routes.js";
import { accessRoutes } from "./modules/access/access.routes.js";

declare module "fastify" {
  interface FastifyInstance {
    authVerifier: AuthVerifier;
  }
}

type BuildAppOptions = {
  authVerifier?: AuthVerifier;
};

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "test" ? "silent" : "info"
    }
  });

  app.decorate("authVerifier", options.authVerifier ?? createClerkAuthVerifier());

  await app.register(cors, { origin: true });
  await app.register(prismaPlugin);
  await app.register(customersRoutes);
  await app.register(accessRoutes);

  app.get("/health", async () => ({ ok: true }));

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ApiError) {
      return sendApiError(reply, error);
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: error.issues.map((issue) => issue.message).join("; ")
        }
      });
    }

    app.log.error(error);
    return reply.status(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected server error."
      }
    });
  });

  return app;
}
```

- [ ] **Step 3: Add customer schema and service**

Create `apps/account-api/src/modules/customers/customers.schemas.ts`:

```ts
import { z } from "zod";

export const syncCustomerSchema = z.object({
  clerk_user_id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1).optional()
});
```

Create `apps/account-api/src/modules/customers/customers.service.ts`:

```ts
import type { PrismaClient } from "@prisma/client";
import { ApiError } from "../../lib/errors.js";
import type { AuthenticatedUser } from "../auth/types.js";

export async function syncCustomer(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  input: { clerk_user_id: string; email: string; name?: string }
) {
  if (input.clerk_user_id !== user.clerkUserId) {
    throw new ApiError(403, "FORBIDDEN", "Cannot sync a different Clerk user.");
  }

  return prisma.customer.upsert({
    where: { clerkUserId: user.clerkUserId },
    update: {
      email: input.email,
      name: input.name ?? user.name
    },
    create: {
      clerkUserId: user.clerkUserId,
      email: input.email,
      name: input.name ?? user.name
    }
  });
}

export async function findCustomerByClerkUserId(prisma: PrismaClient, clerkUserId: string) {
  return prisma.customer.findUnique({
    where: { clerkUserId }
  });
}
```

- [ ] **Step 4: Add customer routes**

Create `apps/account-api/src/modules/customers/customers.routes.ts`:

```ts
import type { FastifyPluginAsync } from "fastify";
import { syncCustomerSchema } from "./customers.schemas.js";
import { syncCustomer } from "./customers.service.js";

export const customersRoutes: FastifyPluginAsync = async (app) => {
  app.post("/customers/sync", async (request) => {
    const user = await app.authVerifier.verifyBearerToken(request.headers.authorization);
    const input = syncCustomerSchema.parse(request.body);
    const customer = await syncCustomer(app.prisma, user, input);

    return {
      customer_id: customer.id,
      clerk_user_id: customer.clerkUserId,
      email: customer.email
    };
  });
};
```

- [ ] **Step 5: Add product service and access route**

Create `apps/account-api/src/modules/products/products.service.ts`:

```ts
import type { PrismaClient } from "@prisma/client";

export async function listActiveProducts(prisma: PrismaClient) {
  return prisma.product.findMany({
    where: { status: "active" },
    orderBy: { name: "asc" }
  });
}

export async function findProductByKey(prisma: PrismaClient, productKey: string) {
  return prisma.product.findUnique({
    where: { productKey }
  });
}
```

Create `apps/account-api/src/modules/access/access.routes.ts`:

```ts
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { findCustomerByClerkUserId } from "../customers/customers.service.js";
import { findProductByKey, listActiveProducts } from "../products/products.service.js";
import { evaluateEntitlementAccess } from "./access.service.js";
import type { AccessEntitlement, AccessProduct } from "./access.types.js";

const accessCheckQuerySchema = z.object({
  product_key: z.string().min(1)
});

export const accessRoutes: FastifyPluginAsync = async (app) => {
  app.get("/access-check", async (request) => {
    const user = await app.authVerifier.verifyBearerToken(request.headers.authorization);
    const query = accessCheckQuerySchema.parse(request.query);
    const customer = await findCustomerByClerkUserId(app.prisma, user.clerkUserId);
    const product = await findProductByKey(app.prisma, query.product_key);
    const entitlement = customer
      ? await app.prisma.entitlement.findUnique({
          where: {
            customerId_productKey: {
              customerId: customer.id,
              productKey: query.product_key
            }
          }
        })
      : null;

    return evaluateEntitlementAccess({
      hasCustomer: Boolean(customer),
      product: product ? toAccessProduct(product) : null,
      entitlement: entitlement ? toAccessEntitlement(entitlement) : null,
      now: new Date()
    });
  });

  app.get("/me/products", async (request) => {
    const user = await app.authVerifier.verifyBearerToken(request.headers.authorization);
    const customer = await findCustomerByClerkUserId(app.prisma, user.clerkUserId);
    const products = await listActiveProducts(app.prisma);
    const entitlements = customer
      ? await app.prisma.entitlement.findMany({ where: { customerId: customer.id } })
      : [];

    return {
      customer: customer
        ? { id: customer.id, email: customer.email, name: customer.name }
        : null,
      products: products.map((product) => {
        const entitlement = entitlements.find((item) => item.productKey === product.productKey);
        const decision = evaluateEntitlementAccess({
          hasCustomer: Boolean(customer),
          product: toAccessProduct(product),
          entitlement: entitlement ? toAccessEntitlement(entitlement) : null,
          now: new Date()
        });

        return {
          product_key: product.productKey,
          name: product.name,
          description: product.description,
          app_url: product.appUrl,
          marketing_url: product.marketingUrl,
          status: decision.allowed ? decision.status : "locked",
          plan: decision.plan,
          allowed: decision.allowed,
          reason: decision.reason
        };
      })
    };
  });
};

function toAccessProduct(product: {
  productKey: string;
  status: string;
  marketingUrl: string | null;
}): AccessProduct {
  return {
    productKey: product.productKey,
    status: product.status,
    marketingUrl: product.marketingUrl
  };
}

function toAccessEntitlement(entitlement: {
  productKey: string;
  status: string;
  plan: string;
  source: string;
  endsAt: Date | null;
  trialEndsAt: Date | null;
  currentPeriodEndsAt: Date | null;
  limits: unknown;
}): AccessEntitlement {
  return {
    productKey: entitlement.productKey,
    status: entitlement.status,
    plan: entitlement.plan,
    source: entitlement.source,
    endsAt: entitlement.endsAt,
    trialEndsAt: entitlement.trialEndsAt,
    currentPeriodEndsAt: entitlement.currentPeriodEndsAt,
    limits: entitlement.limits
  };
}
```

- [ ] **Step 6: Run typecheck**

Run:

```bash
pnpm --filter @prymeira/account-api typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit user access routes**

Run:

```bash
git add apps/account-api/src apps/account-api/test
git commit -m "feat: add customer sync and access routes"
```

## Task 7: Admin Entitlement API

**Files:**

- Create: `apps/account-api/src/modules/admin/admin.schemas.ts`
- Create: `apps/account-api/src/modules/admin/admin.routes.ts`
- Create: `apps/account-api/src/modules/entitlements/entitlements.service.ts`
- Modify: `apps/account-api/src/app.ts`

- [ ] **Step 1: Add admin request schemas**

Create `apps/account-api/src/modules/admin/admin.schemas.ts`:

```ts
import { z } from "zod";

const jsonRecordSchema = z.record(z.unknown()).default({});

export const listCustomersQuerySchema = z.object({
  search: z.string().min(1).optional()
});

export const customerParamsSchema = z.object({
  id: z.string().uuid()
});

export const upsertEntitlementSchema = z.object({
  customer_id: z.string().uuid(),
  product_key: z.string().min(1),
  status: z.enum(["active", "trial", "expired", "blocked", "cancelled", "internal"]),
  plan: z.string().min(1).default("free"),
  source: z.enum(["manual", "trial", "payment", "internal", "admin", "migration"]),
  ends_at: z.string().datetime().nullable().optional(),
  trial_ends_at: z.string().datetime().nullable().optional(),
  current_period_ends_at: z.string().datetime().nullable().optional(),
  limits: jsonRecordSchema,
  metadata: jsonRecordSchema
});

export const blockEntitlementSchema = z.object({
  customer_id: z.string().uuid(),
  product_key: z.string().min(1),
  reason: z.string().min(1).default("manual_block")
});

export const trialEntitlementSchema = z.object({
  customer_id: z.string().uuid(),
  product_key: z.string().min(1),
  plan: z.string().min(1).default("trial"),
  trial_days: z.number().int().positive().max(365)
});
```

- [ ] **Step 2: Add entitlement mutation service**

Create `apps/account-api/src/modules/entitlements/entitlements.service.ts`:

```ts
import type { PrismaClient, Prisma } from "@prisma/client";
import { addDays } from "../../lib/time.js";

type AuditActor = {
  clerkUserId: string;
};

export async function upsertEntitlement(
  prisma: PrismaClient,
  actor: AuditActor,
  input: {
    customerId: string;
    productKey: string;
    status: string;
    plan: string;
    source: string;
    endsAt?: Date | null;
    trialEndsAt?: Date | null;
    currentPeriodEndsAt?: Date | null;
    limits: Prisma.InputJsonValue;
    metadata: Prisma.InputJsonValue;
  }
) {
  const before = await prisma.entitlement.findUnique({
    where: { customerId_productKey: { customerId: input.customerId, productKey: input.productKey } }
  });

  const entitlement = await prisma.entitlement.upsert({
    where: { customerId_productKey: { customerId: input.customerId, productKey: input.productKey } },
    update: {
      status: input.status,
      plan: input.plan,
      source: input.source,
      endsAt: input.endsAt,
      trialEndsAt: input.trialEndsAt,
      currentPeriodEndsAt: input.currentPeriodEndsAt,
      limits: input.limits,
      metadata: input.metadata
    },
    create: {
      customerId: input.customerId,
      productKey: input.productKey,
      status: input.status,
      plan: input.plan,
      source: input.source,
      endsAt: input.endsAt,
      trialEndsAt: input.trialEndsAt,
      currentPeriodEndsAt: input.currentPeriodEndsAt,
      limits: input.limits,
      metadata: input.metadata
    }
  });

  await prisma.auditLog.create({
    data: {
      actorClerkUserId: actor.clerkUserId,
      action: "entitlement.upsert",
      targetType: "entitlement",
      targetId: entitlement.id,
      before: before ? JSON.parse(JSON.stringify(before)) : undefined,
      after: JSON.parse(JSON.stringify(entitlement))
    }
  });

  return entitlement;
}

export async function blockEntitlement(
  prisma: PrismaClient,
  actor: AuditActor,
  input: { customerId: string; productKey: string; reason: string }
) {
  return upsertEntitlement(prisma, actor, {
    customerId: input.customerId,
    productKey: input.productKey,
    status: "blocked",
    plan: "blocked",
    source: "admin",
    limits: {},
    metadata: { reason: input.reason },
    endsAt: null,
    trialEndsAt: null,
    currentPeriodEndsAt: null
  });
}

export async function grantTrialEntitlement(
  prisma: PrismaClient,
  actor: AuditActor,
  input: { customerId: string; productKey: string; plan: string; trialDays: number; now?: Date }
) {
  const now = input.now ?? new Date();

  return upsertEntitlement(prisma, actor, {
    customerId: input.customerId,
    productKey: input.productKey,
    status: "trial",
    plan: input.plan,
    source: "trial",
    trialEndsAt: addDays(now, input.trialDays),
    endsAt: null,
    currentPeriodEndsAt: null,
    limits: {},
    metadata: { trial_days: input.trialDays }
  });
}
```

- [ ] **Step 3: Add admin routes**

Create `apps/account-api/src/modules/admin/admin.routes.ts`:

```ts
import type { FastifyPluginAsync } from "fastify";
import { loadEnv } from "../../env.js";
import { assertAdminEmail, parseAdminEmails } from "../auth/admin.js";
import {
  blockEntitlementSchema,
  customerParamsSchema,
  listCustomersQuerySchema,
  trialEntitlementSchema,
  upsertEntitlementSchema
} from "./admin.schemas.js";
import {
  blockEntitlement,
  grantTrialEntitlement,
  upsertEntitlement
} from "../entitlements/entitlements.service.js";

export const adminRoutes: FastifyPluginAsync = async (app) => {
  const adminEmails = parseAdminEmails(loadEnv().ADMIN_EMAILS);

  async function requireAdmin(authorization: string | undefined) {
    const user = await app.authVerifier.verifyBearerToken(authorization);
    assertAdminEmail(user.email, adminEmails);
    return user;
  }

  app.get("/admin/customers", async (request) => {
    await requireAdmin(request.headers.authorization);
    const query = listCustomersQuerySchema.parse(request.query);

    const customers = await app.prisma.customer.findMany({
      where: query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: "insensitive" } },
              { name: { contains: query.search, mode: "insensitive" } }
            ]
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return { customers };
  });

  app.get("/admin/customers/:id", async (request) => {
    await requireAdmin(request.headers.authorization);
    const params = customerParamsSchema.parse(request.params);

    const customer = await app.prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        entitlements: true,
        subscriptions: true
      }
    });

    const audit_logs = await app.prisma.auditLog.findMany({
      where: { targetId: params.id },
      orderBy: { createdAt: "desc" },
      take: 25
    });

    return { customer, audit_logs };
  });

  app.post("/admin/entitlements", async (request) => {
    const user = await requireAdmin(request.headers.authorization);
    const input = upsertEntitlementSchema.parse(request.body);

    const entitlement = await upsertEntitlement(app.prisma, user, {
      customerId: input.customer_id,
      productKey: input.product_key,
      status: input.status,
      plan: input.plan,
      source: input.source,
      endsAt: input.ends_at ? new Date(input.ends_at) : null,
      trialEndsAt: input.trial_ends_at ? new Date(input.trial_ends_at) : null,
      currentPeriodEndsAt: input.current_period_ends_at ? new Date(input.current_period_ends_at) : null,
      limits: input.limits,
      metadata: input.metadata
    });

    return { entitlement };
  });

  app.post("/admin/entitlements/block", async (request) => {
    const user = await requireAdmin(request.headers.authorization);
    const input = blockEntitlementSchema.parse(request.body);
    const entitlement = await blockEntitlement(app.prisma, user, {
      customerId: input.customer_id,
      productKey: input.product_key,
      reason: input.reason
    });

    return { entitlement };
  });

  app.post("/admin/entitlements/trial", async (request) => {
    const user = await requireAdmin(request.headers.authorization);
    const input = trialEntitlementSchema.parse(request.body);
    const entitlement = await grantTrialEntitlement(app.prisma, user, {
      customerId: input.customer_id,
      productKey: input.product_key,
      plan: input.plan,
      trialDays: input.trial_days
    });

    return { entitlement };
  });
};
```

- [ ] **Step 4: Register admin routes**

In `apps/account-api/src/app.ts`, add:

```ts
import { adminRoutes } from "./modules/admin/admin.routes.js";
```

Then register after access routes:

```ts
await app.register(adminRoutes);
```

- [ ] **Step 5: Run typecheck**

Run:

```bash
pnpm --filter @prymeira/account-api typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit admin API**

Run:

```bash
git add apps/account-api/src
git commit -m "feat: add admin entitlement api"
```

## Task 8: `@prymeira/auth` Package

**Files:**

- Create: `packages/auth/src/types.ts`
- Create: `packages/auth/src/errors.ts`
- Create: `packages/auth/src/client.ts`
- Create: `packages/auth/src/server.ts`
- Create: `packages/auth/src/index.ts`
- Create: `packages/auth/src/client.test.ts`

- [ ] **Step 1: Write failing package client tests**

Create `packages/auth/src/client.test.ts`:

```ts
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
```

- [ ] **Step 2: Run package test to verify it fails**

Run:

```bash
pnpm --filter @prymeira/auth vitest run src/client.test.ts
```

Expected: FAIL because source files do not exist.

- [ ] **Step 3: Add package types and errors**

Create `packages/auth/src/types.ts`:

```ts
export type AccessReason =
  | "no_customer"
  | "no_product"
  | "inactive_product"
  | "no_entitlement"
  | "expired"
  | "blocked"
  | "cancelled"
  | "trial_expired"
  | "active_entitlement"
  | "internal_access";

export type AccessDecision = {
  allowed: boolean;
  product_key: string;
  status: string;
  plan?: string;
  source?: string;
  limits?: Record<string, unknown>;
  reason: AccessReason;
  upgrade_url?: string;
};

export type CurrentCustomerResponse = {
  customer: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  products: Array<{
    product_key: string;
    name: string;
    description: string | null;
    app_url: string;
    marketing_url: string | null;
    status: string;
    plan?: string;
    allowed: boolean;
    reason: AccessReason;
  }>;
};

export type PrymeiraAuthClientOptions = {
  accountApiUrl: string;
  fetch?: typeof fetch;
  upgradeUrl?: string;
};

export type PrymeiraAuthContext = {
  getToken: () => Promise<string | null> | string | null;
  redirect?: (url: string) => never | Response | void;
};
```

Create `packages/auth/src/errors.ts`:

```ts
import type { AccessDecision } from "./types.js";

export class PrymeiraAuthError extends Error {}

export class MissingAuthTokenError extends PrymeiraAuthError {
  constructor() {
    super("Authentication token is required.");
  }
}

export class ProductAccessDeniedError extends PrymeiraAuthError {
  constructor(public readonly decision: AccessDecision) {
    super(`Access denied for product ${decision.product_key}: ${decision.reason}`);
  }
}
```

- [ ] **Step 4: Add package client and server helpers**

Create `packages/auth/src/client.ts`:

```ts
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
```

Create `packages/auth/src/server.ts`:

```ts
import { createPrymeiraAuthClient } from "./client.js";
import { MissingAuthTokenError, ProductAccessDeniedError } from "./errors.js";
import type { AccessDecision, PrymeiraAuthClientOptions, PrymeiraAuthContext } from "./types.js";

export async function requireAuth(context: PrymeiraAuthContext): Promise<string> {
  const token = await context.getToken();

  if (!token) {
    throw new MissingAuthTokenError();
  }

  return token;
}

export async function requireProductAccess(
  productKey: string,
  context: PrymeiraAuthContext,
  options: PrymeiraAuthClientOptions
) {
  const token = await requireAuth(context);
  const client = createPrymeiraAuthClient(options);

  try {
    return await client.requireProductAccess(productKey, token);
  } catch (error) {
    if (error instanceof ProductAccessDeniedError && context.redirect) {
      const target = error.decision.upgrade_url ?? options.upgradeUrl;
      if (target) {
        return context.redirect(target);
      }
    }

    throw error;
  }
}

export async function getCurrentCustomer(context: PrymeiraAuthContext, options: PrymeiraAuthClientOptions) {
  const token = await requireAuth(context);
  return createPrymeiraAuthClient(options).getCurrentCustomer(token);
}

export function checkPlanLimit(decision: AccessDecision, limitKey: string, requestedAmount: number): boolean {
  const value = decision.limits?.[limitKey];

  if (typeof value !== "number") {
    return true;
  }

  return requestedAmount <= value;
}
```

Create `packages/auth/src/index.ts`:

```ts
export * from "./client.js";
export * from "./errors.js";
export * from "./server.js";
export * from "./types.js";
```

- [ ] **Step 5: Run package tests and build**

Run:

```bash
pnpm --filter @prymeira/auth test
pnpm --filter @prymeira/auth build
```

Expected: both commands PASS.

- [ ] **Step 6: Commit auth package**

Run:

```bash
git add packages/auth
git commit -m "feat: add prymeira auth package"
```

## Task 9: Integration Verification and Documentation

**Files:**

- Create: `README.md`
- Modify: `.env.example`

- [ ] **Step 1: Add README with local setup and API contracts**

Create `README.md`:

```md
# Prymeira Account

Central account infrastructure for the Prymeira Digital multi-app ecosystem.

## Packages

- `apps/account-api`: Fastify API that owns customers, products, entitlements, admin mutations, and access checks.
- `packages/auth`: reusable `@prymeira/auth` package for product apps.

## Local Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create `.env` from `.env.example` and set real values.

3. Run Prisma:

```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

4. Start the API:

```bash
pnpm dev
```

The API starts on `http://localhost:3001`.

## Health

```bash
curl http://localhost:3001/health
```

Expected:

```json
{ "ok": true }
```

## Product Access Contract

Product apps authenticate with Clerk, get a Clerk session token, and call:

```http
GET /access-check?product_key=operis
Authorization: Bearer <clerk_token>
```

The API returns `allowed: true` or `allowed: false`. Product apps must enforce the response on backend routes and APIs.

## Operis Backend Example

```ts
import { requireProductAccess } from "@prymeira/auth";

await requireProductAccess(
  "operis",
  {
    getToken: () => clerkSessionToken
  },
  {
    accountApiUrl: process.env.PRYMEIRA_ACCOUNT_API_URL!
  }
);
```

## Guiding Rule

Clerk authenticates.
Account API authorizes.
Gateway charges in a future integration.
Admin controls.
Each app obeys.
```

- [ ] **Step 2: Run full verification**

Run:

```bash
pnpm typecheck
pnpm test
pnpm build
```

Expected: all commands PASS.

- [ ] **Step 3: Verify health route manually**

Run in one terminal:

```bash
pnpm dev
```

Run in another terminal:

```bash
curl http://localhost:3001/health
```

Expected:

```json
{"ok":true}
```

Stop the dev server after the check.

- [ ] **Step 4: Commit docs and final verification**

Run:

```bash
git add README.md .env.example
git commit -m "docs: add account api setup guide"
```

## Self-Review Notes

Spec coverage:

- Account API shell: Tasks 1, 3.
- Prisma tables and seed products: Task 2.
- Clerk validation: Task 4.
- `/customers/sync`: Task 6.
- `/access-check`: Tasks 5 and 6.
- `/me/products`: Task 6.
- Admin customer and entitlement endpoints: Task 7.
- `@prymeira/auth`: Task 8.
- Backend-first security and Operis contract: Tasks 6, 8, 9.
- Testing expectations: Tasks 5, 8, 9.

Vague-marker scan:

- No vague implementation markers are present in this plan.
- Future billing and UI are intentionally excluded and not required for this plan.

Type consistency:

- Public API response fields use snake_case to match the external contract.
- Internal Prisma field names use camelCase generated by Prisma mapping.
- Auth package types mirror Account API access response fields.
