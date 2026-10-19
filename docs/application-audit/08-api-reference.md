# 08 — Complete API Reference & Endpoint Inventory

## 1. Authentication & Session Management (`/api/auth`)

### 1.1 POST `/api/auth/login`
- **Purpose:** Central login for Admin, Driver, and Shop users.
- **Auth:** Public.
- **Request Body:**
  ```json
  {
    "email": "admin@delivshop.internal",
    "password": "StrongPassword123!"
  }
  ```
- **Validation:** `loginSchema` (valid email/username, min 6 characters password).
- **Service & Controller:** `auth.controller.ts` -> `auth.service.ts`.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1...",
      "refreshToken": "eyJhbGciOiJIUzI1...",
      "user": {
        "id": "uuid",
        "email": "admin@delivshop.internal",
        "name": "Super Admin",
        "role": "ADMIN",
        "shopId": null
      }
    }
  }
  ```
- **Frontend Consumer:** `Delivshop_frontend` (`LoginPage.tsx`), `Delivshop` (`app/(auth)/login.tsx`).

### 1.2 POST `/api/auth/refresh-token`
- **Purpose:** Rotates expired access tokens using valid refresh tokens.
- **Auth:** Public (requires valid Bearer refresh token or body `refreshToken`).
- **Response (200 OK):** `{ "accessToken": "new_jwt..." }`.

---

## 2. Shop Portal & Self-Service Management (`/api/shop-portal` & `/api/shops`)

### 2.1 POST `/api/shop-portal/register`
- **Purpose:** New retail merchant account onboarding.
- **Auth:** Public.
- **Body:** `{ "name": "Krishna Dairy", "ownerName": "Ramesh", "email": "krishna@store.com", "phone": "+91 98220 12345", "address": "Kothrud, Pune", "city": "Pune" }`.
- **Response (201 Created):** `{ "shop": { "id": "uuid", "shopId": "SH-PUN-019", ... } }`.

### 2.2 GET `/api/shop/delivery-availability`
- **Purpose:** Checks route coverage, operational policy, and delivery availability for a shop.
- **Auth:** Roles: `ADMIN`, `SUPPLIER`, `SHOP`.
- **Query Params:** `?shopId=<uuid>&crates=10`.
- **Shop Sanitization Filter:** For role `SHOP`, `availableDates: []` is strictly returned with clean policy notices. Internal route codes and unpublished run IDs are stripped.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "shopId": "uuid",
      "shopName": "Krishna Dairy",
      "hasRouteCoverage": true,
      "allowUnscheduledOrders": true,
      "policyMessage": "Orders are received for supplier review. Delivery route and date will be scheduled and confirmed by logistics.",
      "defaultDeliveryWindow": "06:00 AM - 09:00 AM",
      "availableDates": []
    }
  }
  ```

---

## 3. Order Placement & Route Scheduling (`/api/orders`)

### 3.1 POST `/api/orders`
- **Purpose:** Creates a fresh replenishment order.
- **Auth:** Roles: `SHOP`, `ADMIN`, `SUPPLIER`.
- **Request Body:**
  ```json
  {
    "shopId": "uuid",
    "items": [
      { "productId": "uuid", "quantity": 12 }
    ],
    "deliveryAddress": {
      "street": "123 Market Yard",
      "city": "Pune",
      "postalCode": "411037",
      "notes": "Rear gate"
    }
  }
  ```
- **Security Guard:** If caller has role `SHOP`, `requestedDeliveryDate`, `deliveryRunId`, and `deliveryWindow` are ignored and stripped on the server.
- **Response (201 Created):** Sanitized Order object with `customer_delivery_status` (`Pending` or `Scheduling`) and `confirmed_delivery_date: null`.

### 3.2 GET `/api/orders` & GET `/api/orders/:orderId`
- **Purpose:** Retrieves orders list or specific order details.
- **Auth:** Roles: `ADMIN`, `SUPPLIER`, `SHOP`.
- **Tenant Isolation:** For role `SHOP`, `GET /api/orders` returns only orders belonging to `req.user.shopId`. `GET /api/orders/:orderId` verifies shop ownership and throws `403 Forbidden` if mismatched.
- **Shop Sanitization:** Output is piped through `sanitizeOrderForShop`.

### 3.3 POST `/api/orders/:orderId/assign-route`
- **Purpose:** Standalone route assignment for an order without scheduling a delivery run (Case B transition).
- **Auth:** Roles: `ADMIN`, `SUPPLIER`.
- **Body:** `{ "routeId": "uuid" }`.
- **Database Action:** Updates `orders.route_id`, inserts shop into `route_stops`, audits `ROUTE_ASSIGNED`, keeps `confirmed_delivery_date = null`.
- **Response (200 OK):** `{ "success": true, "data": { "route_id": "uuid", "confirmed_delivery_date": null } }`.

### 3.4 POST `/api/orders/:orderId/schedule`
- **Purpose:** Allocates an order to an active delivery run and confirms delivery schedule (Case C transition).
- **Auth:** Roles: `ADMIN`, `SUPPLIER`.
- **Body:**
  ```json
  {
    "deliveryRunId": "uuid",
    "deliveryWindow": "06:00 AM - 08:30 AM",
    "notes": "Prioritized morning drop"
  }
  ```
- **Validations:** Vehicle crate capacity check, driver active duty check, published run verification.
- **Response (200 OK):** `{ "success": true, "data": { "confirmedDeliveryDate": "2026-10-22", "schedulingStatus": "SCHEDULED" } }`.

### 3.5 POST `/api/orders/:orderId/reschedule`
- **Purpose:** Moves an order to a different delivery run or date.
- **Auth:** Roles: `ADMIN`, `SUPPLIER`.
- **Body:** `{ "newDeliveryRunId": "uuid", "reason": "Van chiller issue; reassigned to backup run" }`.

---

## 4. Route Planning & Stop Management (`/api/routes`)

### 4.1 GET `/api/routes` & POST `/api/routes`
- **Purpose:** Lists all logistics corridors or creates a new delivery corridor.
- **Auth:** Roles: `ADMIN`, `SUPPLIER`.
- **Body:** `{ "code": "RT-PUN-05", "name": "Hadapsar Express", "city": "Pune", "estimatedDurationMins": 90 }`.

### 4.2 POST `/api/routes/:id/stops`
- **Purpose:** Adds sequenced shop stops to a route.
- **Auth:** Roles: `ADMIN`, `SUPPLIER`.
- **Body:** `{ "shopId": "uuid", "stopSequence": 4 }`.

---

## 5. Daily Delivery Run Dispatches (`/api/assignments`)

### 5.1 POST `/api/assignments`
- **Purpose:** Creates a planned delivery run.
- **Auth:** Roles: `ADMIN`, `SUPPLIER`.
- **Body:** `{ "routeId": "uuid", "driverId": "uuid", "vehicleId": "uuid", "deliveryDate": "2026-10-22" }`.

### 5.2 POST `/api/assignments/validate`
- **Purpose:** Real-time conflict validation before creating a run.
- **Auth:** Roles: `ADMIN`, `SUPPLIER`.
- **Checks:** Driver license expiry, vehicle RC/insurance status, vehicle capacity, driver multi-run schedule conflicts on the same date.
- **Response (200 OK):** `{ "isValid": true, "errors": [], "warnings": [] }`.

### 5.3 POST `/api/assignments/:id/publish`
- **Purpose:** Finalizes a draft run and publishes it to drivers and merchants.

---

## 6. Driver Delivery Dispatches & Proof of Delivery (`/api/deliveries`)

### 6.1 GET `/api/deliveries/driver/active`
- **Purpose:** Retrieves the current active delivery run stops for the calling driver.
- **Auth:** Role: `DRIVER`.
- **Response (200 OK):** List of stops ordered by `stop_sequence` with store coordinates, drop quantities, and contact numbers.

### 6.2 POST `/api/deliveries/:deliveryId/proof`
- **Purpose:** Completes a stop dropoff with proof-of-delivery verification.
- **Auth:** Roles: `DRIVER`, `ADMIN`.
- **Body:**
  ```json
  {
    "deliveredCrates": 12,
    "damagedQuantity": 0,
    "verificationPin": "4819",
    "signatureData": "data:image/png;base64,..."
  }
  ```
- **Response (200 OK):** `{ "success": true, "status": "DELIVERED" }`.

---

## 7. Supplier Companies & Collection Ledger (`/api/companies` & `/api/collections`)

### 7.1 GET `/api/companies` & POST `/api/companies`
- **Purpose:** Manages contracted dairy supplier companies.
- **Auth:** Roles: `ADMIN`, `SUPPLIER`.

### 7.2 POST `/api/collections/verify`
- **Purpose:** Driver verifies dairy collection before morning dispatch.
- **Auth:** Role: `DRIVER`.
- **Body:** `{ "runId": "uuid", "companyId": "uuid", "cratesCollected": 80, "temperatureCelsius": 3.8, "batchCode": "KAT-BATCH-99" }`.

---

## 8. Endpoint-to-Screen Mapping

| Screen / Component | Application | Endpoint(s) Invoked |
| :--- | :--- | :--- |
| `app/(shop)/index.tsx` | Shop Mobile | `GET /api/orders`, `GET /api/shop/delivery-availability` |
| `app/(shop)/create-order.tsx` | Shop Mobile | `GET /api/products`, `POST /api/orders` |
| `app/(shop)/orders.tsx` | Shop Mobile | `GET /api/orders`, `GET /api/orders/:id` |
| `app/(shop)/deliveries.tsx` | Shop Mobile | `GET /api/orders` |
| `app/(driver)/(tabs)/index.tsx` | Driver Mobile | `GET /api/deliveries/driver/active` |
| `app/(driver)/(tabs)/collections.tsx` | Driver Mobile | `GET /api/collections/run/:runId`, `POST /api/collections/verify` |
| `app/(driver)/delivery/[id].tsx` | Driver Mobile | `POST /api/deliveries/:id/proof`, `PATCH /api/deliveries/:id/status` |
| `OrdersList.tsx` | Admin Web | `GET /api/orders`, `GET /api/orders/unscheduled` |
| `ScheduleOrderModal.tsx` | Admin Web | `POST /api/orders/:id/assign-route`, `POST /api/orders/:id/schedule` |
| `RescheduleOrderModal.tsx` | Admin Web | `POST /api/orders/:id/reschedule` |
| `RoutesOverview.tsx` | Admin Web | `GET /api/routes`, `POST /api/routes` |
| `AssignmentsOverview.tsx` | Admin Web | `GET /api/assignments`, `POST /api/assignments/validate`, `POST /api/assignments/:id/publish` |
| `DriversRoster.tsx` | Admin Web | `GET /api/deliveries/drivers`, `POST /api/drivers/:id/reset-password` |
| `VehiclesOverview.tsx` | Admin Web | `GET /api/vehicles`, `POST /api/vehicles` |
