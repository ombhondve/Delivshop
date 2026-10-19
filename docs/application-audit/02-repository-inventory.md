# 02 — Repository and File Inventory

## 1. Monorepo Root Structure

```
d:/Delivshop/
├── Delivshop/                     # Expo / React Native mobile application (Shop & Driver)
│   ├── app/                       # Expo Router file-based screen routes
│   │   ├── (auth)/                # Authentication screens (Login, Register, Driver/Shop portals)
│   │   ├── (driver)/              # Driver workflow routes & bottom tabs
│   │   └── (shop)/                # Shopkeeper order & delivery routes
│   ├── src/                       # Shared mobile services, components, types, hooks
│   ├── app.json                   # Expo application manifest
│   └── package.json               # Mobile dependencies & build scripts
├── Delivshop_frontend/            # React 19 / Vite / TypeScript Admin web dashboard
│   ├── src/
│   │   ├── app/                   # App root & router
│   │   ├── components/            # Reusable UI system (Badge, Button, Card, Modal, Table)
│   │   ├── context/               # AuthContext, NavigationContext
│   │   ├── features/              # Feature modules (orders, routes, drivers, vehicles, etc.)
│   │   ├── services/api/          # Central API client & endpoint definitions
│   │   └── types/                 # Shared frontend domain interfaces
│   ├── vite.config.ts             # Vite build & proxy configuration
│   └── package.json               # Web dashboard scripts & dependencies
├── Delivshop_Backend/             # Node.js / Express / TypeScript REST API service
│   ├── src/
│   │   ├── config/                # Database pool & environment configuration
│   │   ├── controllers/           # HTTP controllers handling input/output
│   │   ├── database/migrations/   # 25 idempotent SQL migrations
│   │   ├── middleware/            # Auth, RBAC, Zod validation, error handling
│   │   ├── repositories/          # Raw SQL queries & transaction managers
│   │   ├── routes/                # Express router definitions
│   │   ├── schemas/               # Zod validation schemas
│   │   ├── services/              # Business logic & domain workflows
│   │   ├── types/                 # Express & entity TypeScript types
│   │   └── utils/                 # Token, logger, errors, formatting utilities
│   ├── tests/integration/         # 21 Vitest integration test suites
│   ├── package.json               # Backend dependencies, build & test scripts
│   └── tsconfig.json              # Strict TypeScript compiler options
└── docs/                          # Comprehensive technical architecture & audit documentation
```

---

## 2. Backend Module Inventory (`Delivshop_Backend`)

### 2.1 Route Modules (`src/routes/`)
| File Path | Responsibilities | Key Endpoints | Auth / RBAC | Status |
| :--- | :--- | :--- | :--- | :--- |
| `src/routes/auth.routes.ts` | Central user authentication & session management | `POST /login`, `POST /refresh-token`, `POST /logout`, `GET /me` | Public / Bearer Token | Implemented & Working |
| `src/routes/shop-portal.routes.ts` | Shop merchant registration, dedicated login & profile | `POST /register`, `POST /login`, `GET /profile`, `PATCH /profile` | Public / Role: `SHOP` | Implemented & Working |
| `src/routes/order.routes.ts` | Order creation, listing, route assignment & scheduling | `POST /`, `GET /`, `GET /:orderId`, `POST /:orderId/assign-route`, `POST /:orderId/schedule`, `POST /:orderId/reschedule` | Roles: `ADMIN`, `SUPPLIER`, `SHOP` | Implemented & Working |
| `src/routes/route.routes.ts` | Route creation, stops ordering, route activation | `GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `POST /:id/stops`, `DELETE /:id` | Roles: `ADMIN`, `SUPPLIER` | Implemented & Working |
| `src/routes/assignment.routes.ts` | Daily delivery run dispatch planning & conflict validation | `GET /`, `POST /`, `POST /validate`, `POST /:id/publish`, `DELETE /:id` | Roles: `ADMIN`, `SUPPLIER` | Implemented & Working |
| `src/routes/delivery.routes.ts` | Driver delivery dispatches, status updates & proof | `GET /driver/active`, `PATCH /:deliveryId/status`, `POST /:deliveryId/proof` | Roles: `DRIVER`, `ADMIN` | Implemented & Working |
| `src/routes/company.routes.ts` | Supplier company management, contracts & challans | `GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `POST /:id/status` | Roles: `ADMIN`, `SUPPLIER` | Implemented & Working |
| `src/routes/product.routes.ts` | Dairy catalog products, pricing & packaging specs | `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `PATCH /:id/status` | Public (Read) / Role: `ADMIN` | Implemented & Working |
| `src/routes/shop.routes.ts` | Admin shop management & delivery availability lookup | `GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `GET /delivery-availability` | Roles: `ADMIN`, `SUPPLIER`, `SHOP` | Implemented & Working |
| `src/routes/vehicle.routes.ts` | Fleet van management, document uploads & maintenance | `GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `POST /:id/documents` | Roles: `ADMIN` | Implemented & Working |
| `src/routes/collection.routes.ts` | Driver supplier dairy collection & temperature logging | `GET /run/:runId`, `POST /verify`, `GET /summary/:runId` | Roles: `DRIVER`, `ADMIN` | Implemented & Working |
| `src/routes/inventory.routes.ts` | Retired warehouse inward stock handler (redirects to direct fulfillment) | `POST /receipts`, `POST /adjustments` | Retired / Direct Notice (400) | Maintained for backward compatibility |
| `src/routes/health.routes.ts` | Healthcheck and database connectivity ping | `GET /health` | Public | Implemented & Working |

### 2.2 Core Services (`src/services/`)
- `order.service.ts`: Coordinates order creation, shop ownership verification, route assignment, and role-based data sanitization.
- `scheduling.service.ts`: Core logistics engine. Evaluates route coverage, vehicle crate limits (80-120 crates), driver active status, published delivery runs, and maintains atomic schedule audit logs in `order_scheduling_history`.
- `delivery.service.ts`: Driver dispatch lifecycle, stop transition state machines, geofence verification, PIN/signature verification.
- `route.service.ts` & `route-code.service.ts`: Sequential code generation (`RT-001`, `RT-002`), GIS stop sequence optimization, shop stop mapping.
- `supplier-billing.service.ts`: Calculates weekly/monthly supplier settlement statements based on verified collection quantities and agreed contract unit rates.
- `pdf-generator.service.ts`: Generates delivery challans, loading sheets, and supplier payment receipts in PDF format.
- `map-resolver.service.ts`: Resolves latitude/longitude coordinates from address strings and vice versa via OpenStreetMap Nominatim API.

### 2.3 Repositories (`src/repositories/`)
- `order.repository.ts`: Handles raw PostgreSQL transactions for orders, items, deliveries, and scheduling history. Implements `sanitizeOrderForShop` to enforce zero-leak policy.
- `delivery.repository.ts`: Resolves driver active delivery runs, stop completion, and shop delivery receipts.
- `assignment.repository.ts`: Manages `delivery_runs`, stop rollups, planned crate totals, and publication status.
- `route.repository.ts`: Manages `routes` and `route_stops` with strict ordering.
- `vehicle.repository.ts` & `user.repository.ts`: CRUD and validation for vehicles, RC/insurance documents, and driver user credentials.

---

## 3. Web Dashboard Inventory (`Delivshop_frontend`)

### 3.1 Feature Screens & Modals (`src/features/`)
1. **`dashboard/DashboardPage.tsx`**: High-level KPI overview (delivered orders, active transit runs, pending queue, vehicle fleet status).
2. **`orders/`**:
   - `OrdersList.tsx`: Complete orders table with filtering by status, search, and dual-tab layout (All Orders vs Unscheduled Orders Queue).
   - `ScheduleOrderModal.tsx`: Three-tab operational modal (Schedule to Existing Run, Create New Run & Schedule, or Assign Route Only).
   - `RescheduleOrderModal.tsx`: Rescheduling with mandatory reason log.
   - `SchedulingHistoryModal.tsx`: Audit trail displaying every transition, actor, and timestamp.
   - `ShopOrdersDispatchPage.tsx`: Specialized view for store-by-store morning packing manifests.
3. **`routes/`**:
   - `RoutesOverview.tsx`: Route grid, stop counts, active status toggle.
   - `RouteCreationWizard.tsx`: Multi-step route creation with map picker and sequenced shop stop allocation.
   - `RouteDetailsDrawer.tsx`: Route stops, assigned shops, and active run history.
4. **`assignments/`**:
   - `AssignmentsOverview.tsx`: Daily run dispatches, vehicle capacity meters, publication controls.
   - `AssignmentWizardModal.tsx`: Step-by-step driver, vehicle, and route pairing with real-time conflict checking.
   - `AssignmentDetailsDrawer.tsx`: Run stop list, collection status, driver tracking.
5. **`drivers/`**:
   - `DriversRoster.tsx`: Driver roster table with license status, shift status, and quick password resets.
   - `DriverDetailPage.tsx`: Deep-dive into driver payroll, documents (driving license, Aadhaar), and assignment history.
6. **`vehicles/`**:
   - `VehiclesOverview.tsx`: Vehicle cards with maintenance alerts, RC book status, and crate capacity.
   - `VehicleDetailPage.tsx`: Detailed vehicle service logs, insurance expiry countdowns, and active runs.
7. **`companies/`**:
   - `CompanyOverview.tsx`: Supplier dairy contracts, contact persons, bank accounts.
   - `CompanyDetailPage.tsx`: Supplier billing ledger, pickup fulfillment percentages.
8. **`products/`**:
   - `ProductCatalog.tsx`: Dairy product list with package sizes (1 L, 500 ml, 200 g), packaging types (Pouch, Cup, Pack), and unit pricing.

---

## 4. Mobile Application Inventory (`Delivshop`)

### 4.1 Shop Owner Portal (`app/(shop)/`)
- `index.tsx`: Shop Dashboard with metrics (Active Orders, Out for Delivery, Total Delivered), quick action buttons, and recent order snippets.
- `create-order.tsx`: Order placement screen with dairy product catalog, quantity steppers, live subtotal calculations, read-only delivery notice, and zero date-selection inputs.
- `orders.tsx`: Chronological order history with authoritative status badges (`Pending`, `Scheduling`, `Delivered`, etc.) and read-only confirmed delivery date when available.
- `deliveries.tsx`: Live delivery run tracking showing dropoff status and driver details (only visible once delivery run is confirmed).
- `account.tsx`: Store address, contact person, phone number, and logout action.

### 4.2 Driver Portal (`app/(driver)/`)
- `(tabs)/index.tsx`: Driver Dashboard showing assigned route, active vehicle registration, shift start/end status, and today's summary metrics.
- `(tabs)/deliveries.tsx`: Sequenced stop list with shop names, addresses, crate drop counts, and navigation shortcuts.
- `(tabs)/collections.tsx`: Supplier dairy collection tasks requiring temperature logging and crate count verification before departure.
- `(tabs)/profile.tsx`: Driver profile, vehicle info, and account details.
- `shift-start.tsx` & `inspection.tsx`: Pre-trip vehicle inspection checklist (tires, refrigeration unit, cleanliness).
- `delivery/[id].tsx`: Stop detail screen with shop contact details, crate confirmation, and merchant PIN verification.
- `incident.tsx`: Reporting breakdowns, vehicle accidents, or damaged milk pouches with photo attachments.
- `reconciliation.tsx`: Shift-end empty crate returns and undelivered pouch tally.
