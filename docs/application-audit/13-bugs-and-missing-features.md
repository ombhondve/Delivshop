# 13 — Bugs, Defect Log & Missing Features Inventory

## 1. Defect Classification & Priority Standards

Defects and gaps are classified under standard enterprise priority tiers:
- **P0 (Critical):** Data loss, security breach, unauthorized order mutation, or application crash.
- **P1 (High):** Core business logistics workflow blocked, status inconsistency, or broken state machine.
- **P2 (Medium):** Important usability defect, missing secondary validation, or performance degradation.
- **P3 (Low):** Minor UI styling inconsistency, formatting glitch, or cosmetic imperfection.
- **P4 (Enhancement):** Planned optimization or non-blocking operational convenience.

---

## 2. Confirmed Defect Log & Resolution Status

### DEF-01: Order Remains in `AWAITING SCHEDULING` & `PENDING_ASSIGNMENT` After Route Assignment
- **Priority:** **P1 (High)**
- **Subsystem:** Backend API (`order.repository.ts`, `order.service.ts`) & Mobile Frontend (`orders.tsx`).
- **Symptom:** When an Admin assigned a route, the shop app continued displaying `AWAITING SCHEDULING` and raw internal dispatch status `PENDING_ASSIGNMENT`.
- **Root Cause:**
  1. Conflation between geographic route assignment and delivery run confirmation.
  2. Direct projection of internal database columns (`d.status`, `r.name`) into the shop API response.
  3. Lack of a dedicated route assignment endpoint (`/assign-route`) separate from `/schedule`.
- **Resolution:**
  - Added `POST /api/orders/:orderId/assign-route` endpoint with RBAC (`ADMIN`, `SUPPLIER`).
  - Added server-side `sanitizeOrderForShop` transformer that calculates `customer_delivery_status` (`Pending`, `Scheduling`, or confirmed date) and deletes internal route names and dispatch codes.
  - Updated mobile app `orders.tsx` and `deliveries.tsx` to consume the sanitized status.
- **Status:** **VERIFIED FIXED (Covered by Integration Test Suite)**.

---

### DEF-02: Shop Control Over Delivery Scheduling & Date Leaks
- **Priority:** **P1 (High)**
- **Subsystem:** Shop Mobile App (`create-order.tsx`) & Backend API (`order.controller.ts`).
- **Symptom:** The Shop mobile app contained date pickers and published run selectors, enabling merchants to dictate delivery dates.
- **Root Cause:** Trusting client-supplied `requestedDeliveryDate` and `deliveryRunId` without role-based stripping.
- **Resolution:**
  - Removed all date selection widgets, calendar inputs, and published run cards from `create-order.tsx`.
  - Enforced server-side parameter stripping in `order.controller.ts`: if `req.user?.role === 'SHOP'`, `requestedDeliveryDate`, `deliveryRunId`, and `deliveryWindow` are stripped to `undefined`.
- **Status:** **VERIFIED FIXED (Covered by Integration Test Suite)**.

---

### DEF-03: Cross-Tenant Order Data Access
- **Priority:** **P0 (Critical Security)**
- **Subsystem:** Backend API (`order.service.ts`).
- **Symptom:** A shop user could view another shop's order details if they knew the order UUID.
- **Root Cause:** `orderService.getOrder` lacked shop ownership validation.
- **Resolution:**
  - Added object-level ownership check:
    ```typescript
    if (role === 'SHOP' && order.shop_id !== userShopId) {
      throw new AppError('Unauthorized: Access to this order is restricted', 403);
    }
    ```
- **Status:** **VERIFIED FIXED (Covered by Integration Test Suite)**.

---

### DEF-04: TypeScript Nullability Compilation Errors During Production Build
- **Priority:** **P1 (High)**
- **Subsystem:** Backend Build (`order.controller.ts`, `order.repository.ts`).
- **Symptom:** `npm run build` failed with TypeScript strict mode errors:
  - `req.user is possibly undefined`.
  - `Type 'string | null' is not assignable to type 'string'`.
- **Root Cause:** Missing optional chaining on `req.user?.shopId` and strict type mismatch on `customerDeliveryStatus`.
- **Resolution:**
  - Corrected optional chaining in `order.controller.ts`.
  - Initialized `customerDeliveryStatus = confirmedDate || 'Confirmed'` in `order.repository.ts`.
- **Status:** **VERIFIED FIXED (Production build passes with exit code 0)**.

---

## 3. Partially Implemented & Missing Features Inventory

| Feature Item | Subsystem | Current Implementation State | Missing Components / Required Work | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **Automated Order Cutoff Cron Job** | Backend (`src/services/`) | Settings table exists (`order_cutoff_time = '18:00'`); logic checks cutoff on request. | Background cron daemon (`node-cron` or Cloudflare Worker) to auto-dispatch cutoff reminder notifications at 17:30 daily. | P2 |
| **Driver Offline Dropoff Queue** | Driver Mobile (`app/(driver)/`) | Dropoffs work live via `POST /api/deliveries/:id/proof`. | Persistent SQLite storage (`expo-sqlite`) to buffer signatures and PIN proofs when driving through rural cellular dead zones. | P2 |
| **Admin Frontend Code Splitting** | Admin Web (`Delivshop_frontend`) | Builds cleanly; single vendor bundle is ~1,080 kB. | Configure `build.rollupOptions.output.manualChunks` in `vite.config.ts` to split vendor dependencies into chunks < 500 kB. | P3 |
| **WhatsApp Business API Gateway** | Backend (`notification.service.ts`) | Mock stub and SMS logger implemented. | Active integration with Meta Cloud API or Gupshup for direct PDF challan delivery via WhatsApp. | P3 |
| **Multi-Language Support (Marathi / Hindi)** | Shop & Driver Mobile | Strings are in English. | Add `i18next` localized string dictionaries for regional vernacular adoption among Kirana storekeepers and drivers. | P4 |
