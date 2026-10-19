# 04 — Shop Mobile Application Feature Audit

## 1. Application Overview & Technology Stack

The **Shop Mobile Application** is built inside the `/Delivshop` root using **React Native 0.76.7**, **Expo 52.0.37**, and **Expo Router 4.0.17** with file-based routing. It provides retail merchants (dairy shops, supermarkets, kirana stores) with an intuitive interface to place morning milk replenishment orders, review order history, and track confirmed delivery dropoffs.

---

## 2. Authentication & Shop Identity (`app/(auth)/`)

### 2.1 Screens & Flows
1. **Welcome Landing (`app/index.tsx`):**
   - Renders animated visual carousel showcasing Delivshop cold-chain benefits.
   - Dual-action entry: "Merchant Portal" vs "Driver Portal".
2. **Shop Login (`app/(auth)/shop-login.tsx` & `app/(auth)/login.tsx`):**
   - Inputs: Shop Identifier or Email, Password.
   - Secure toggle for password visibility.
   - Client-side validation: non-empty checks, email format validation.
   - Session bootstrapping: calls `POST /api/shop-portal/login`.
   - On response: stores JWT `token` in `AsyncStorage` / Expo `SecureStore`, populates auth context, and routes to `(shop)/`.
3. **Shop Registration (`app/(auth)/register.tsx`):**
   - Enables new merchant onboarding with store name, owner name, phone, address, and city (Pune, Nashik).
   - Generates unique store code (e.g. `SH-PUN-042`).
4. **Session Persistence & Token Refresh:**
   - Stored auth state automatically attempts session rehydration via `GET /api/shop-portal/profile`.
   - 401 Unauthorized responses trigger automatic credential purge and navigation back to `(auth)/shop-login`.
5. **Ownership & Tenant Isolation Security:**
   - The Shop client never dictates the `shop_id` query for orders. The backend extracts `req.user.shopId` from the verified JWT.
   - Direct requests to access or modify orders belonging to another shop return `403 Forbidden`.

---

## 3. Shop Dashboard (`app/(shop)/index.tsx`)

### 3.1 Layout & Visual Hierarchy
- **Header:** Merchant store name, verified shop badge, greeting, and notification bell.
- **KPI Summary Grid (3 Cards):**
  - **Active Orders:** Count of orders currently in `PENDING`, `PREPARING`, or `IN_TRANSIT`.
  - **Out for Delivery:** Live count of orders loaded on morning delivery runs.
  - **Delivered Orders:** Historical count of completed dropoffs confirmed by PIN.
- **Quick Action Row:** "New Order" (direct jump to product catalog), "Order History", "Store Details".
- **Recent Orders List:** Preview of the last 3 orders showing order number, crate counts, short status, and total amount.
- **Data Source & Aggregation:**
  - Aggregated via `GET /api/orders` (or shop profile deliveries endpoint).
  - Pull-to-refresh (`RefreshControl`) re-queries the backend and updates cache.

---

## 4. Product Catalog & Checkout (`app/(shop)/create-order.tsx`)

### 4.1 Dairy Unit & Packaging Specs
Products are managed with precise physical dairy packaging attributes:
- **Liquid Products:** Packaged in pouches (1 L pouch, 500 ml pouch, 200 ml pouch).
- **Solid Dairy Products:** Packaged in cups or packs (500 g curd cup, 200 g paneer pack, 1 kg ghee tin).
- **Crate Unit Conversion Rules:**
  - Standard Dairy Milk Crate: holds 12 pouches of 1 L OR 24 pouches of 500 ml (12 Litres total capacity per crate).
  - Paneer/Curd Crate: holds 20–24 retail containers (10–12 kg per crate).
  - Backend and frontend calculate total crates required dynamically based on item packaging types.

### 4.2 Ordering & Cart Flow
1. **Catalog Browsing:** Category filter tabs (`All`, `Milk`, `Curd`, `Paneer`, `Ghee`).
2. **Quantity Selectors:** Increment / decrement counter buttons with direct number input.
3. **Live Totals Bar:** Calculates pouches, total milk volume in Litres, estimated crates, subtotal, and tax in real time.
4. **Checkout & Idempotency:**
   - Generates client UUID idempotency key to prevent double charging or accidental duplicate orders.
   - "Confirm Order" button shows spinner during submission and disables buttons to prevent rapid tapping.

---

## 5. Delivery Date & Route Visibility Rules (Mandatory Business Logic)

The Shop app strictly adheres to the core Delivshop date rules:

```
+---------------------------------------------------------------------------------------------------+
| CASE A: ROUTE NOT ASSIGNED                                                                        |
| - Delivery Date: Completely Hidden (confirmed_delivery_date: null)                                |
| - Display Badge: "Pending"                                                                        |
| - Internal Route Leaks: Zero (no route names, no route codes)                                     |
+---------------------------------------------------------------------------------------------------+
| CASE B: ROUTE ASSIGNED, DATE UNCONFIRMED                                                           |
| - Delivery Date: Completely Hidden (confirmed_delivery_date: null)                                |
| - Display Badge: "Scheduling"                                                                     |
| - Internal Route Leaks: Zero (no internal run codes, no "PENDING_ASSIGNMENT")                     |
+---------------------------------------------------------------------------------------------------+
| CASE C: ROUTE ASSIGNED, DATE CONFIRMED                                                             |
| - Delivery Date: Shows exact confirmed date (e.g., "Wed, 22 Oct 2026")                            |
| - Editing Controls: Completely read-only (no calendar, no date picker, no edit modal)             |
| - Internal Route Leaks: Zero (van route IDs and optimization metadata withheld)                   |
+---------------------------------------------------------------------------------------------------+
```

### 5.1 Verified UI Removal
- Date pickers, calendar widgets, delivery window dropdowns, and requested delivery date fields are **completely removed** from `create-order.tsx` and `orders.tsx`.
- The Shop sees an informative, professional notice:
  > *"Delivery route and scheduled dropoff date are managed directly by central logistics to coordinate cold-chain morning dispatches."*

---

## 6. Order History & Tracking (`app/(shop)/orders.tsx` & `deliveries.tsx`)

### 6.1 Order Record View
- **Order Number:** Formatted code (`ORD-20261018-ZMUS`).
- **Product Breakdown:** List of SKUs, packaging types, quantities ordered, and line total prices.
- **Total Financials:** Subtotal, GST, Delivery Fee (if applicable), and Total Payable in Indian Rupees (₹).
- **Delivery Status Card:**
  - If Case A: Renders amber `Pending` badge.
  - If Case B: Renders blue `Scheduling` badge.
  - If Case C: Renders green `Confirmed Delivery: [Date]` with standard delivery window.
- **Deliveries Screen:**
  - Displays live dropoff status once active run is dispatched (`DISPATCHED`, `OUT_FOR_DELIVERY`, `DELIVERED`).
  - Driver name and contact phone are shown **only after schedule confirmation** (Case C).
