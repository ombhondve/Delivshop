# 15 — Implementation Roadmap & Prioritized Action Plan

## 1. Roadmap Phasing Strategy

The Delivshop implementation roadmap balances immediate operational stability and cold-chain compliance with scalable feature expansion:

```
+----------------------------------------------------------------------------------------------------+
|                                    DELIVSHOP STRATEGIC ROADMAP                                     |
+--------------------------+----------------------------+--------------------------------------------+
| Phase 1: Core Logistics  | Phase 2: Offline Van Ops   | Phase 3: Automation & Scale                |
| (COMPLETED & VERIFIED)   | (NEAR-TERM FOCUS)          | (STRATEGIC HORIZON)                        |
| - Route assignment split | - SQLite offline buffer    | - Automated cutoff cron daemon             |
| - 3-Case date visibility | - Bluetooth receipt printer| - Multi-tenant distributor accounts        |
| - Zero Shop date control | - Turn-by-turn routing HUD | - Dynamic AI route optimization            |
| - Tenant 403 isolation   | - Cold-chain temp sensors  | - Regional vernacular (Marathi / Hindi)    |
+--------------------------+----------------------------+--------------------------------------------+
```

---

## 2. Phase 1: Core Logistics & Security Hardening *(COMPLETED & VERIFIED)*

### 1.1 Separation of Route Assignment from Delivery Run Scheduling
- **Objective:** Fix the critical defect where routed orders remained stuck in `AWAITING SCHEDULING` or leaked `PENDING_ASSIGNMENT`.
- **Affected Files:**
  - `Delivshop_Backend/src/repositories/order.repository.ts`
  - `Delivshop_Backend/src/services/order.service.ts`
  - `Delivshop_Backend/src/controllers/order.controller.ts`
  - `Delivshop_Backend/src/routes/order.routes.ts`
  - `Delivshop_frontend/src/features/orders/ScheduleOrderModal.tsx`
- **Delivered Output:** Dedicated `POST /api/orders/:orderId/assign-route` endpoint and 3rd tab in Admin Schedule modal. Full integration test coverage.

### 1.2 Authoritative 3-Case Delivery Date Visibility Engine
- **Objective:** Strictly enforce that the Shop never selects or edits delivery dates, and only views dates when confirmed.
- **Affected Files:**
  - `Delivshop/app/(shop)/create-order.tsx` (Removed date picker, calendar, and published runs selectors).
  - `Delivshop/app/(shop)/orders.tsx` (Implemented `getShopOrderVisibility`).
  - `Delivshop_Backend/src/repositories/order.repository.ts` (`sanitizeOrderForShop`).
- **Delivered Output:** Case A (`Pending`), Case B (`Scheduling`), Case C (`[Confirmed Date]`, read-only).

### 1.3 Strict Tenant Isolation & Object-Level Security
- **Objective:** Prevent Shop owners from inspecting or tampering with another store's orders.
- **Affected Files:**
  - `Delivshop_Backend/src/services/order.service.ts` (Added 403 ownership check).
  - `Delivshop_Backend/src/controllers/order.controller.ts` (Strips dates and verifies `shopId`).
- **Delivered Output:** Zero cross-tenant leaks; automated test verification.

---

## 3. Phase 2: Driver Van Offline Capabilities *(Near-Term Focus)*

### 2.1 Persistent Offline Stop Buffer for Rural Delivery Zones
- **Problem:** When delivery vans travel along rural highway corridors between Pune and Nashik, cellular network connectivity can drop to zero, preventing immediate API submissions.
- **Target Implementation:**
  - Integrate `expo-sqlite` into `Delivshop/app/(driver)/delivery/[id].tsx`.
  - Buffer PIN verifications, digital signature base64 strings, and damaged pouch logs in local SQLite storage.
  - Implement a background synchronization task (`NetInfo` listener) that flushes queued dropoffs to `POST /api/deliveries/:id/proof` upon network re-establishment.
- **Affected Files:**
  - `Delivshop/src/services/offlineSync.ts` (New module)
  - `Delivshop/app/(driver)/delivery/[id].tsx`
- **Target Priority:** **P2**

### 2.2 Bluetooth Mobile Thermal Printer Integration
- **Objective:** Enable drivers to issue on-the-spot printed physical receipts (2-inch thermal paper) for kirana merchants requiring physical paper slips for cash records.
- **Target Implementation:**
  - Connect via Bluetooth ESC/POS printer protocol.
  - Print order number, delivered crates count, pouch count, store name, and timestamp.
- **Target Priority:** **P3**

---

## 4. Phase 3: Automation & Operational Scale *(Strategic Horizon)*

### 3.1 Automated Evening Order Cutoff Cron Daemon
- **Objective:** Eliminate manual trigger requirements for merchant daily cutoff alerts.
- **Target Implementation:**
  - Implement `src/workers/cutoff-scheduler.worker.ts` using `node-cron` or Cloudflare Cron Triggers.
  - At 17:30 daily (30 minutes before 18:00 cutoff): queries all active shops without an order for tomorrow and dispatches push reminders via `notification.service.ts`.
  - At 18:00 daily: locks order placement for next morning's early runs.
- **Affected Files:**
  - `Delivshop_Backend/src/server.ts`
  - `Delivshop_Backend/src/services/notification.service.ts`
- **Target Priority:** **P2**

### 3.2 Dynamic Route Optimization Engine
- **Objective:** Automatically sequence 15–20 shop stops along a route corridor to minimize vehicle diesel consumption and delivery transit time.
- **Target Implementation:**
  - Integrate Open Source Routing Machine (OSRM) or Google Routes Optimization API.
  - Calculate Traveling Salesperson Problem (TSP) matrix using latitude/longitude coordinates from `shops` table.
- **Target Priority:** **P4**
