# Prymeira Account API and Auth Package Design

Date: 2026-05-16

## 1. Goal

Build the first infrastructure slice for the Prymeira Digital modular ecosystem: a central Account API and a reusable `@prymeira/auth` package.

This first slice centralizes identity lookup and product access decisions while keeping existing apps independent. Clerk authenticates users. The Account API authorizes product access. Future payment gateways will update the Account API, but will not grant direct app access.

The MVP does not include visual Hub or Admin web apps. It includes the backend contracts needed for manual access management and for integrating the first product, Operis.

## 2. Scope

### Included

- TypeScript monorepo structure.
- `apps/account-api` using Node.js, Fastify, Prisma, and PostgreSQL.
- `packages/auth` published internally as `@prymeira/auth`.
- Central database models for customers, products, entitlements, subscriptions, and audit logs.
- Clerk token validation for protected user and admin endpoints.
- Product access evaluation through `/access-check`.
- Admin API endpoints for listing customers and managing entitlements.
- Seed data for initial products:
  - `operis`
  - `orquestrador`
  - `financeiro`
  - `media`
  - `ads`
  - `commerce`
- Security validation on backend APIs, not only frontend helpers.
- Basic automated tests around entitlement evaluation and critical API behavior.

### Excluded

- Hub visual frontend.
- Admin visual frontend.
- Real payment gateway integration.
- Payment webhooks.
- Full Operis migration.
- Clerk organization billing or Clerk as the billing source of truth.

## 3. Architecture

The repository will start as a small TypeScript monorepo:

```txt
apps/
  account-api/
    prisma/
      schema.prisma
      seed.ts
    src/
      modules/
        access/
        admin/
        customers/
        entitlements/
        products/
      env.ts
      server.ts
      app.ts

packages/
  auth/
    src/
      client.ts
      errors.ts
      server.ts
      types.ts
      index.ts
```

The Account API owns the central authorization rules and database. Product apps do not duplicate entitlement rules. They call the Account API through `@prymeira/auth` and obey the response.

## 4. Responsibilities

### Clerk

Clerk is responsible for:

- signup
- login
- logout
- password recovery
- sessions
- Clerk user id
- email and display name

Clerk is not the billing or entitlement source of truth.

### Account API

The Account API is responsible for:

- internal customer records
- mapping `clerk_user_id` to `customer`
- products
- entitlements
- trial status
- manual access
- internal access
- blocked, expired, and cancelled states
- future subscription records
- audit logs for admin actions

### `@prymeira/auth`

The auth package is responsible for:

- standardizing calls from product apps to the Account API
- checking product access with a Clerk token
- returning typed access decisions
- offering backend helpers such as `requireProductAccess(productKey)`
- offering basic limit checks against entitlement limits

It does not own product access rules. The Account API remains the source of truth.

## 5. Data Model

The initial Prisma schema will represent these tables.

### `customers`

- `id`
- `clerk_user_id`
- `email`
- `name`
- `gateway_customer_id`
- `created_at`
- `updated_at`

`clerk_user_id` is unique. `gateway_customer_id` is nullable until payment integration exists.

### `products`

- `id`
- `product_key`
- `name`
- `description`
- `app_url`
- `marketing_url`
- `status`
- `created_at`
- `updated_at`

`product_key` is unique and is the stable public key used by apps.

### `entitlements`

- `id`
- `customer_id`
- `product_key`
- `status`
- `plan`
- `source`
- `starts_at`
- `ends_at`
- `trial_ends_at`
- `current_period_ends_at`
- `limits`
- `metadata`
- `created_at`
- `updated_at`

The unique key is `(customer_id, product_key)`.

Initial statuses:

- `active`
- `trial`
- `expired`
- `blocked`
- `cancelled`
- `internal`

Initial sources:

- `manual`
- `trial`
- `payment`
- `internal`
- `admin`
- `migration`

### `subscriptions`

Subscription records are prepared for future billing but are not used for access decisions in the MVP.

Fields include gateway, gateway ids, status, plan, amount, currency, current period dates, cancellation flag, metadata, and timestamps.

### `audit_logs`

Admin mutations create audit records with:

- actor Clerk user id
- action
- target type
- target id
- before state
- after state
- timestamp

## 6. Access Evaluation

The access rules live in a pure function, for example:

```ts
evaluateEntitlementAccess(input: {
  entitlement: Entitlement | null
  product: Product | null
  now: Date
}): AccessDecision
```

The function returns:

- `allowed`
- `product_key`
- `status`
- `plan`
- `source`
- `limits`
- `reason`
- optional `upgrade_url`

Rules:

- Missing customer returns `allowed: false`, `reason: "no_customer"`.
- Missing product returns `allowed: false`, `reason: "no_product"`.
- Inactive product returns `allowed: false`, `reason: "inactive_product"`.
- Missing entitlement returns `allowed: false`, `reason: "no_entitlement"`.
- `internal` allows access unless the entitlement has an `ends_at` in the past.
- `active` allows access unless `ends_at` is in the past.
- `trial` allows access until `trial_ends_at`.
- `blocked` denies access.
- `expired` denies access.
- `cancelled` denies access immediately in the MVP.

The cancelled behavior can be changed later when a real billing gateway introduces access through the end of a paid period.

## 7. Account API Endpoints

### `GET /health`

Returns:

```json
{ "ok": true }
```

### `POST /customers/sync`

Protected by Clerk token.

Creates or updates the customer associated with the authenticated Clerk user. The API must not trust a body `clerk_user_id` that differs from the token subject.

Body:

```json
{
  "clerk_user_id": "user_abc123",
  "email": "cliente@email.com",
  "name": "Cliente"
}
```

Response:

```json
{
  "customer_id": "uuid",
  "clerk_user_id": "user_abc123",
  "email": "cliente@email.com"
}
```

### `GET /access-check?product_key=operis`

Protected by Clerk token.

Flow:

1. Validate Clerk token.
2. Extract `clerk_user_id`.
3. Find customer.
4. Find product.
5. Find entitlement.
6. Evaluate access.
7. Return a typed access decision.

Allowed response:

```json
{
  "allowed": true,
  "product_key": "operis",
  "status": "active",
  "plan": "pro",
  "source": "manual",
  "limits": {
    "ai_requests_month": 1000,
    "storage_gb": 10
  },
  "reason": "active_entitlement"
}
```

Denied response:

```json
{
  "allowed": false,
  "product_key": "operis",
  "status": "blocked",
  "reason": "no_entitlement",
  "upgrade_url": "https://primeiradigital.com.br/operis"
}
```

Reasons:

- `no_customer`
- `no_product`
- `inactive_product`
- `no_entitlement`
- `expired`
- `blocked`
- `cancelled`
- `trial_expired`
- `active_entitlement`
- `internal_access`

### `GET /me/products`

Protected by Clerk token.

Returns all active products with the current customer's effective access state.

Products without entitlement are returned as locked so the future Hub can show available products.

### `GET /admin/customers`

Protected by Clerk token and admin check.

Supports optional search by email or name.

### `GET /admin/customers/:id`

Protected by Clerk token and admin check.

Returns customer, entitlements, subscriptions, and recent audit logs.

### `POST /admin/entitlements`

Protected by Clerk token and admin check.

Creates or updates an entitlement. Writes an audit log.

### `POST /admin/entitlements/block`

Protected by Clerk token and admin check.

Sets an entitlement to `blocked`. If the entitlement does not exist, creates a blocked entitlement so the block is explicit. Writes an audit log.

### `POST /admin/entitlements/trial`

Protected by Clerk token and admin check.

Creates or updates a trial entitlement with `trial_ends_at = now + trial_days`. Writes an audit log.

## 8. Admin Authorization

Admin endpoints are protected by a simple MVP allowlist:

```txt
ADMIN_EMAILS=owner@primeiradigital.com.br,admin@primeiradigital.com.br
```

The API validates the Clerk token, reads the authenticated email, and permits admin access only when the email is in the allowlist.

Later this can move to Clerk metadata or a central roles table without changing public admin endpoint contracts.

## 9. `@prymeira/auth` API

The package exposes:

```ts
createPrymeiraAuthClient(options)
requireAuth(context)
requireProductAccess(productKey, context)
getCurrentCustomer(context)
checkPlanLimit(accessDecision, limitKey, requestedAmount)
```

The exact context type should stay small and framework-neutral:

```ts
type PrymeiraAuthContext = {
  getToken: () => Promise<string | null> | string | null
  redirect?: (url: string) => never | Response | void
}
```

The default client accepts:

```ts
type PrymeiraAuthClientOptions = {
  accountApiUrl: string
  fetch?: typeof fetch
  upgradeUrl?: string
}
```

Product apps can use the package from backend routes, middleware, server actions, or framework-specific adapters added later.

## 10. Environment Variables

Account API:

```txt
DATABASE_URL=
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=
ADMIN_EMAILS=
PORT=3001
NODE_ENV=development
```

Auth package consumers:

```txt
PRYMEIRA_ACCOUNT_API_URL=
PRYMEIRA_PRODUCT_KEY=
```

## 11. Error Handling

The API returns structured JSON errors:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication is required."
  }
}
```

Expected codes include:

- `UNAUTHORIZED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `CONFLICT`
- `INTERNAL_ERROR`

Access denials are not API errors. `/access-check` returns `200` with `allowed: false` when authentication succeeds but access is denied.

## 12. Testing

Initial tests should cover:

- entitlement evaluation for active, internal, valid trial, expired trial, blocked, expired, cancelled, no customer, no entitlement
- `/customers/sync` upsert behavior
- `/access-check` denial when customer is missing
- `/access-check` allow when entitlement is active
- admin endpoint denial for non-admin users
- admin entitlement update audit log creation

Clerk verification should be wrapped behind an internal service so tests can stub authenticated users without calling Clerk.

## 13. First Operis Integration Contract

Operis should eventually:

1. Replace hardcoded login with Clerk login.
2. Use Clerk session token on backend requests.
3. Call `requireProductAccess("operis")` in protected backend paths.
4. Redirect unauthenticated users to:

```txt
https://account.primeiradigital.com.br/login?redirect_url=<operis-url>
```

5. Show an upgrade or blocked screen when access is denied.
6. Protect internal backend APIs, not only page navigation.

## 14. Acceptance Criteria

The first implementation is acceptable when:

- Account API starts locally.
- Prisma schema creates the required tables.
- Seed creates the six initial products.
- `/health` returns `{ "ok": true }`.
- `/customers/sync` upserts the authenticated Clerk user into customers.
- Admin can create an active entitlement for Operis.
- `/access-check?product_key=operis` returns `allowed: true` for an active entitlement.
- `/access-check?product_key=operis` returns `allowed: false` when entitlement is missing.
- Trial access expires after `trial_ends_at`.
- Internal access works without payment.
- Blocked access denies immediately.
- `@prymeira/auth` can call the Account API and enforce product access from a backend integration point.

## 15. Guiding Rule

Clerk authenticates.
Account API authorizes.
Gateway charges later.
Admin controls.
Each app obeys.
