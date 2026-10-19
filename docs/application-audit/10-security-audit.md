# 10 — Authentication, Authorization & Cybersecurity Audit

## 1. Threat Model & Security Posture Overview

Delivshop processes daily commercial orders, cold-chain logistics schedules, driver payroll documents, and merchant credit balances. The platform enforces defense-in-depth across the network, application, database, and client layers.

```
+----------------------------------------------------------------------------------------------------+
|                                    SECURITY DEFENSE LAYERS                                         |
+--------------------------+----------------------------+--------------------------------------------+
| 1. Transport & Network   | 2. Identity & Tokens       | 3. Authorization & Data Isolation          |
| - TLS 1.3 / HTTPS        | - bcrypt Password Hashing  | - Strict RBAC (ADMIN, SUPPLIER, SHOP, DRV) |
| - Strict CORS Policy     | - Short-Lived JWT Tokens   | - Tenant Isolation (shopId verification)   |
| - Rate Limiting          | - Cryptographic Salts      | - Server-Side Sanitization Transformer     |
+--------------------------+----------------------------+--------------------------------------------+
```

---

## 2. Authentication & Credential Architecture

### 2.1 Password Security
- **Hashing Algorithm:** `bcrypt` with 10 salt rounds (`src/utils/tokens.ts` & `auth.service.ts`).
- **Plaintext Passwords:** Never persisted to disk or emitted in console logs.
- **Credential Storage:** `password_hash` column in `users` table is excluded by default from query projections.

### 2.2 JWT Tokens & Session Lifecycle
- **Access Tokens:** Signed using `HS256` with environment secret `JWT_SECRET`. Expiry: 15–60 minutes.
- **Refresh Tokens:** Signed using `JWT_REFRESH_SECRET`. Expiry: 7 days. Stored in memory/SecureStore and verified on `/api/auth/refresh-token`.
- **Token Invalidation:** Logout purges tokens on client side; server supports token revocation via user active standing checks (`is_active = FALSE`).

### 2.3 Rate Limiting & Abuse Prevention
- Implemented via `express-rate-limit`:
  - Login endpoints (`/api/auth/login`, `/api/shop-portal/login`): 10 requests per 15-minute window per IP.
  - General API endpoints: 100 requests per minute per IP.
  - Standard headers returned: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`.

---

## 3. Role-Based Access Control (RBAC) & Route Protection

Enforced via `authenticate` and `authorizeRoles` middlewares (`src/middleware/auth.middleware.ts`):

| Role | Permitted Actions | Prohibited Actions |
| :--- | :--- | :--- |
| **`ADMIN`** | Full access to all modules, fleet, routes, pricing, billing, and system settings. | None. |
| **`SUPPLIER`** | Can manage company products, view assigned collection runs, and view settlement statements. | Cannot delete fleet vehicles, manage driver credentials, or alter system settings. |
| **`SHOP`** | Can place orders for own store, view own order history, and track confirmed deliveries. | **Cannot select or edit delivery dates**, cannot assign routes, cannot view other shops' orders, cannot see internal dispatch codes. |
| **`DRIVER`** | Can view assigned runs, update dropoff stop statuses, upload proof of delivery, report incidents. | Cannot alter product pricing, modify customer order quantities, or access financial ledgers. |

---

## 4. Object-Level Authorization & Tenant Isolation

### 4.1 Shop Order Isolation (`order.service.ts`)
- When a caller with role `SHOP` invokes `getOrder(orderId, role, userShopId)`:
  ```typescript
  if (role === 'SHOP') {
    if (order.shop_id !== userShopId) {
      throw new AppError('Unauthorized: Access to this order is restricted', 403);
    }
  }
  ```
- Any attempt by Shop A to inspect Shop B's order using order UUID returns `403 Forbidden`.

### 4.2 Driver Stop Isolation (`delivery.service.ts`)
- Drivers cannot submit proof of delivery for runs assigned to another driver. The backend verifies `delivery.driver_id === req.user.id`.

---

## 5. Prevention of Client Date Tampering & Data Leakage

### 5.1 Defense Against Parameter Tampering on Checkout
- Even if a malicious shop owner modifies the mobile request payload to include `requestedDeliveryDate` or `deliveryRunId`:
  - `src/controllers/order.controller.ts` automatically detects `req.user?.role === 'SHOP'`.
  - Statically strips `requestedDeliveryDate: undefined`, `deliveryRunId: undefined`, and `deliveryWindow: undefined`.
  - The order is created strictly in Case A or Case B with `confirmed_delivery_date = NULL`.

### 5.2 Server-Side Sanitization Transformer (`sanitizeOrderForShop`)
- The backend never sends internal operational metadata and relies on client UI to hide it.
- In `src/repositories/order.repository.ts`, `sanitizeOrderForShop` strips:
  - `route_name` (e.g. `Route Service: nashik`)
  - `route_code` (e.g. `RT-001`)
  - `route_id`, `delivery_run_id`, `run_code`
  - `scheduling_notes`, `scheduled_by`, `scheduled_at`
  - `delivery_status: 'PENDING_ASSIGNMENT'`
- Ensures `confirmed_delivery_date` is `null` unless both `route_id` and `delivery_run_id` are confirmed.

---

## 6. Input Validation & Injection Defenses

### 6.1 Parameterized SQL Queries
- All database queries use PostgreSQL positional parameters (`$1, $2, $3...`) via `pg` / `pg-pool`.
- Zero instances of dynamic string interpolation or raw SQL concatenation were found in repositories.

### 6.2 Zod Schema Validation
- All request bodies and query parameters pass through strict Zod schemas (`src/schemas/`) via `validateRequest` middleware.
- Extra unexpected properties are stripped; malformed UUIDs fail fast with `422 Unprocessable Entity`.

---

## 7. Security Audit Findings & Remediations Completed

| Finding ID | Severity | Description | Resolution Status |
| :--- | :--- | :--- | :--- |
| **SEC-01** | **High** | Shop API responses previously included internal route names (`Route Service: nashik`) and raw dispatch codes (`PENDING_ASSIGNMENT`). | **Resolved:** Implemented `sanitizeOrderForShop` across `order.repository.ts`, `shop.repository.ts`, and `order.service.ts`. |
| **SEC-02** | **High** | `createOrder` endpoint previously accepted client-supplied delivery dates from shopkeepers. | **Resolved:** Enforced server-side parameter stripping for `SHOP` role in `order.controller.ts`. |
| **SEC-03** | **Medium** | Missing tenant isolation check on `GET /api/orders/:orderId`. | **Resolved:** Added `userShopId === order.shop_id` verification throwing 403 Forbidden on mismatch. |
| **SEC-04** | **Low** | Absence of standalone route assignment endpoint required full scheduling transaction. | **Resolved:** Added `POST /api/orders/:orderId/assign-route` restricted to `ADMIN` and `SUPPLIER`. |
