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

## Environment Notes

- `DATABASE_URL` must point to a running PostgreSQL database before starting the API.
- `CORS_ORIGINS` is a comma-separated list of browser origins allowed to call the API.
- `PRYMEIRA_ACCOUNT_API_URL` is used by product apps and `@prymeira/auth` to call the account API.

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
