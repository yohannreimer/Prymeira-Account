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
- `CORS_ORIGINS` is a comma-separated list of browser origins allowed to call the API. It controls browser requests that include an `Origin` header, so include every browser app URL that calls the API. Server-to-server and curl requests without an `Origin` header are allowed by the current CORS handling.
- `PRYMEIRA_ACCOUNT_API_URL` is used by product apps and `@prymeira/auth` to call the account API.
- `PRYMEIRA_PRODUCT_KEY` is the default product key used by product app integrations. The `.env.example` default is `operis` for the first integration.

## Health

```bash
curl http://localhost:3001/health
```

Expected:

```json
{ "ok": true }
```

## Verification Notes

Final `typecheck`, `test`, and `build` checks passed for this task. Manual `/health` verification requires a reachable PostgreSQL database because Prisma connects during app startup. In this environment, manual `/health` verification was blocked by missing PostgreSQL at `localhost:5432`.

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
