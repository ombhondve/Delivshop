# 06 — Admin Web Dashboard Feature Audit

## 1. Application Overview & Architecture

The **Admin Web Dashboard** is located in `/Delivshop_frontend` and is built using **React 19**, **Vite**, **TypeScript**, and **Vanilla CSS** with a custom design system. It operates as the central command cockpit for Delivshop logistics coordinators, warehouse managers, and administrative supervisors.

---

## 2. Navigation Architecture & Route Hierarchy

Navigation is managed via `useNavigation` context and modular feature view swapping:

```
Admin Dashboard Navigation Layout
├── 1. Overview Dashboard (/admin/dashboard)
├── 2. Orders & Operations
│   ├── All Orders List (/admin/orders)
│   ├── Unscheduled Orders Queue (/admin/orders?tab=unscheduled)
│   └── Shop Orders Dispatch Manifest (/admin/shop-orders)
├── 3. Logistics & Fleet
│   ├── Routes Overview & Creation Wizard (/admin/routes)
│   ├── Delivery Run Assignments (/admin/assignments)
│   └── Vehicles & Maintenance Fleet (/admin/vehicles)
├── 4. Personnel & Stakeholders
│   ├── Drivers & Delivery Staff Roster (/admin/drivers)
│   ├── Retail Merchant Stores (/admin/shops)
│   └── Supplier Companies & Dairies (/admin/companies)
├── 5. Catalog & Accounting
│   ├── Dairy Product Catalog (/admin/products)
│   ├── Supplier Collections Ledger (/admin/collections)
│   └── Operational Reports & Analytics (/admin/reports)
└── 6. System Settings & Policies (/admin/settings)
```

---

## 3. Deep-Dive Feature Module Audits

### 3.1 Overview Dashboard (`DashboardPage.tsx`)
- **KPI Metrics:**
  - *Delivered Orders Today:* Confirmed by merchant PIN signature.
  - *Active In-Transit:* Crate volume and pouch counts currently rolling on vans.
  - *Pending Unscheduled Orders:* Orders requiring route assignment or delivery run scheduling.
  - *Active Fleet Vehicles:* Number of vans currently available vs dispatched.
- **Visual Analytics:** Real-time incoming order feed, urgent notification banners for vehicle maintenance or driver shift alerts.

### 3.2 Orders Management & Unscheduled Queue (`OrdersList.tsx`)
- **Dual Operational Tabs:**
  1. **All Orders Tab:** Complete chronological ledger. Filterable by status (`PENDING_CONFIRMATION`, `DISPATCH_PREPARED`, `IN_TRANSIT`, `DELIVERED`, `DISPUTED`, `CANCELLED`).
  2. **Unscheduled Orders Queue Tab:** Displays all orders received from shops that have not yet been assigned to a confirmed delivery run.
- **Three-Tab Scheduling Modal (`ScheduleOrderModal.tsx`):**
  - **Tab 1 — Eligible Existing Runs:** Auto-matches published runs covering the shop's route with remaining crate capacity.
  - **Tab 2 — Create New Run & Schedule:** Multi-field builder to create a new delivery run on the fly (selects route, date, driver, vehicle) with conflict validation, and atomically schedules the order.
  - **Tab 3 — Assign Route Only (Case B Transition):** Enables logistics to route an order without publishing a delivery run. Sets `route_id`, moves shop status from `Pending` to `Scheduling`, while strictly hiding delivery dates until confirmed by a run.
- **Rescheduling Modal (`RescheduleOrderModal.tsx`):** Moves an order from one delivery run to another, requiring a mandatory business reason (e.g. *Shop requested emergency afternoon delivery*, *Van capacity overflow*).
- **Audit Trail Modal (`SchedulingHistoryModal.tsx`):** Displays immutable event history from `order_scheduling_history` showing previous status, new status, actor ID, and timestamps.

### 3.3 Route Management & Creation Wizard (`RoutesOverview.tsx` & `RouteCreationWizard.tsx`)
- **Corridor Planning:** Creation of regional delivery corridors (e.g., `RT-PUN-01 Kothrud Morning`, `RT-PUN-02 Shivajinagar Express`, `RT-NAS-01 Nashik Industrial`).
- **Interactive Map Coordinate Picker:** Embedded OpenStreetMap picker to locate waypoints and pinpoint merchant storefronts.
- **Stop Sequencing:** Drag-and-drop or sequential stop reordering (`stop_sequence: 1, 2, 3...`) with calculated driving distances and estimated transit durations.
- **Route Details Drawer (`RouteDetailsDrawer.tsx`):** Shows shop stops, active store orders, historical runs, and assigned drivers.

### 3.4 Assignments & Daily Run Operations (`AssignmentsOverview.tsx`)
- **Run Creation Wizard (`AssignmentWizardModal.tsx`):**
  - Step 1: Select Route Corridor.
  - Step 2: Select Delivery Date (enforces minimum lead days and advance booking window).
  - Step 3: Select Eligible Vehicle (checks `capacity_crates`, RC book validity, insurance expiry, maintenance standing).
  - Step 4: Select Qualified Driver (checks driving license expiry, active duty status, shift conflict prevention).
  - Step 5: Real-time conflict validation calling `POST /api/assignments/validate`.
- **Publication Engine:** Unscheduled runs remain in `DRAFT`. Clicking "Publish Run" locks the route stops snapshot and notifies drivers and merchants.
- **Safe Run Deletion (`DeleteAssignmentModal.tsx`):** Strict verification preventing deletion of runs that have active store deliveries in progress.

### 3.5 Driver & Personnel Management (`DriversRoster.tsx` & `DriverDetailPage.tsx`)
- **Roster Grid:** Active drivers, duty status (`OFF_DUTY`, `INSPECTING`, `EN_ROUTE`, `COMPLETED`), contact info, assigned van registration.
- **Driver Documents (`DriverDocumentModal.tsx`):** Upload, storage, and verification of driver commercial licenses, Aadhaar identity cards, and police verification reports.
- **Driver Salary & Payroll (`DriverSalaryModal.tsx`):** Monthly base salary, per-drop completion incentives, fuel allowance, and overtime logs.
- **Security:** In-app administrative password reset modal (`ResetPasswordModal.tsx`).

### 3.6 Vehicle Fleet Operations (`VehiclesOverview.tsx` & `VehicleDetailPage.tsx`)
- **Fleet Metrics:** Total Vans, Available, Assigned to Run, Under Maintenance, Inactive.
- **Vehicle Document Tracking (`AddVehicleDocumentModal.tsx`):**
  - Mandatory Registration Certificate (RC Book).
  - Commercial Vehicle Insurance (with automated expiry warning alerts).
  - PUC Pollution Under Control Certificate.
  - State Fitness Certificate.
- **Maintenance Logger (`AddMaintenanceModal.tsx`):** Records service logs (oil changes, refrigeration chiller gas refills, brake pad replacements) with service cost and garage notes.

### 3.7 Supplier Company Management (`CompanyOverview.tsx` & `CompanyDetailPage.tsx`)
- **Dairy Contracts:** Katraj Dairy, Chitale Bandhu, Govind Milk, Rajhans Dairy.
- **Pickup Fulfillment:** Tracks percentage of supplier pickup commitments fulfilled on time.
- **Billing & Challans:** Generation of weekly collection settlement statements and automated PDF payment challans.

### 3.8 Dairy Product Catalog (`ProductCatalog.tsx`)
- **Product Parameters:** SKU, Brand Name, Packaging Type (`Pouch`, `Cup`, `Pack`, `Tin`), Package Size (`1 L`, `500 ml`, `200 g`, `1 kg`), Unit Price (₹), Tax Rate (GST), and Supplier Dairy Association.
- **Stock & Status:** Activation/deactivation toggle (`is_active`).
