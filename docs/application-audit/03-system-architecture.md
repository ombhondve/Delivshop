# 03 — System Architecture & Workflow Sequences

## 1. High-Level Architecture Diagram

```mermaid
graph TD
    subgraph Mobile_Clients["Mobile Clients (React Native / Expo Router)"]
        ShopApp["Shop Mobile App<br/>(Store Replenishment)"]
        DriverApp["Driver Mobile App<br/>(Run Execution & Drop-offs)"]
    end

    subgraph Web_Client["Web Dashboard (React 19 / Vite)"]
        AdminDashboard["Admin Central Operations<br/>(Dispatch, Routes, Billing, Fleet)"]
    end

    subgraph API_Gateway["Node.js / Express REST API (Port 5000)"]
        AuthMiddleware["Auth & RBAC Middleware<br/>(JWT Bearer Token / Role Guards)"]
        OrderController["Order Controller<br/>(/api/orders)"]
        SchedController["Scheduling Controller<br/>(/api/orders/:id/schedule)"]
        DeliveryController["Delivery Controller<br/>(/api/deliveries)"]
        RouteController["Route Controller<br/>(/api/routes)"]
        AssignmentController["Assignment Controller<br/>(/api/assignments)"]
        CompanyController["Company Controller<br/>(/api/companies)"]
        Sanitizer["Shop Security Sanitizer<br/>(sanitizeOrderForShop)"]
    end

    subgraph Domain_Services["Domain Service Layer"]
        OrderService["Order Service"]
        SchedService["Scheduling Engine"]
        DeliveryService["Delivery Service"]
        RouteService["Route Service"]
        BillingService["Supplier Billing Service"]
    end

    subgraph Data_Layer["Neon PostgreSQL Relational Database"]
        DB_Users[("users<br/>(ADMIN, DRIVER, SHOP)")]
        DB_Shops[("shops & route_stops")]
        DB_Orders[("orders & order_items")]
        DB_Runs[("delivery_runs & stops")]
        DB_Deliveries[("deliveries & proof")]
        DB_Vehicles[("vehicles & documents")]
        DB_Audit[("order_scheduling_history")]
    end

    ShopApp -->|Bearer JWT| AuthMiddleware
    DriverApp -->|Bearer JWT| AuthMiddleware
    AdminDashboard -->|Bearer JWT| AuthMiddleware

    AuthMiddleware --> OrderController
    AuthMiddleware --> SchedController
    AuthMiddleware --> DeliveryController
    AuthMiddleware --> RouteController
    AuthMiddleware --> AssignmentController
    AuthMiddleware --> CompanyController

    OrderController --> OrderService
    SchedController --> SchedService
    DeliveryController --> DeliveryService
    RouteController --> RouteService

    OrderService --> DB_Orders
    OrderService --> Sanitizer
    SchedService --> DB_Runs
    SchedService --> DB_Audit
    DeliveryService --> DB_Deliveries
    RouteService --> DB_Shops
```

---

## 2. Sequence Diagrams

### 2.1 Sequence 1: User Login & Session Bootstrap
```mermaid
sequenceDiagram
    autonumber
    actor User as Shop Owner / Driver / Admin
    participant Client as Mobile App / Web Frontend
    participant AuthAPI as Auth Controller (/api/auth/login)
    participant AuthService as Auth Service
    participant UserRepo as User Repository
    participant DB as PostgreSQL (users table)

    User->>Client: Enters Email / Shop ID and Password
    Client->>AuthAPI: POST /api/auth/login (email, password)
    AuthAPI->>AuthService: authenticate(email, password)
    AuthService->>UserRepo: findByEmail(email)
    UserRepo->>DB: SELECT * FROM users WHERE email = $1 AND is_active = true
    DB-->>UserRepo: User Record (id, password_hash, role, shop_id)
    AuthService->>AuthService: bcrypt.compare(password, password_hash)
    alt Password Invalid
        AuthService-->>AuthAPI: throw UnauthorizedError(401)
        AuthAPI-->>Client: 401 Unauthorized ("Invalid credentials")
    else Password Valid
        AuthService->>AuthService: generateTokens(user.id, role, shop_id)
        AuthService-->>AuthAPI: { accessToken, refreshToken, user }
        AuthAPI-->>Client: 200 OK + JWT payload
        Client->>Client: Store token in SecureStore / localStorage
        Client->>Client: Navigate to (shop), (driver), or /admin
    end
```

---

### 2.2 Sequence 2: Shop Placing an Order (Zero Date Control)
```mermaid
sequenceDiagram
    autonumber
    actor Shop as Shop Owner
    participant App as Shop Mobile App
    participant OrderAPI as Order Controller (/api/orders)
    participant OrderService as Order Service
    participant OrderRepo as Order Repository
    participant DB as PostgreSQL

    Shop->>App: Selects milk crates & clicks "Confirm Order"
    Note over App: App sends ONLY shopId, items, deliveryAddress.<br/>Requested dates and runs are excluded.
    App->>OrderAPI: POST /api/orders { shopId, items, deliveryAddress }
    OrderAPI->>OrderAPI: Strip any client-supplied requested dates or run IDs
    OrderAPI->>OrderService: createOrder(payload, isShopRole = true)
    OrderService->>OrderRepo: createOrderTransaction(client, isShopRole = true)
    
    OrderRepo->>DB: Verify shop status & active products price
    OrderRepo->>DB: Check if shop is in route_stops (Default Route)
    alt Shop has assigned route stop
        Note over OrderRepo: Route assigned, but date unconfirmed (Case B)
        OrderRepo->>DB: INSERT INTO orders (route_id = route.id, scheduling_status = 'AWAITING_SCHEDULING', confirmed_delivery_date = NULL)
    else Shop has no route stop
        Note over OrderRepo: Route unassigned (Case A)
        OrderRepo->>DB: INSERT INTO orders (route_id = NULL, scheduling_status = 'AWAITING_SCHEDULING', confirmed_delivery_date = NULL)
    end
    OrderRepo->>DB: INSERT INTO order_items (quantity, unit_price, total_price, volume_litres)
    OrderRepo->>DB: INSERT INTO deliveries (status = 'PENDING_ASSIGNMENT')
    OrderRepo->>DB: INSERT INTO order_scheduling_history (action = 'ORDER_CREATED_AWAITING_SCHEDULING')
    
    OrderRepo->>OrderRepo: sanitizeOrderForShop(order)
    Note over OrderRepo: Strips route codes, dispatch status.<br/>Sets customer_delivery_status = 'Pending' or 'Scheduling'.
    OrderRepo-->>OrderAPI: Sanitized Order Object
    OrderAPI-->>App: 201 Created (customer_delivery_status, confirmed_delivery_date: null)
    App-->>Shop: Displays "Order Placed (Pending Schedule)"
```

---

### 2.3 Sequence 3: Admin Assigning a Route (Case B Transition)
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Central Logistics Admin
    participant Dashboard as Admin Web Dashboard
    participant OrderAPI as Order Controller (/api/orders/:id/assign-route)
    participant OrderService as Order Service
    participant OrderRepo as Order Repository
    participant DB as PostgreSQL

    Admin->>Dashboard: Clicks "Assign Route Only" in Unscheduled Queue
    Dashboard->>OrderAPI: POST /api/orders/:orderId/assign-route { routeId }
    OrderAPI->>OrderService: assignRoute(orderId, routeId, adminId)
    OrderService->>OrderRepo: assignRoute(orderId, routeId, adminId)
    
    OrderRepo->>DB: BEGIN TRANSACTION
    OrderRepo->>DB: SELECT * FROM orders WHERE id = $1 FOR UPDATE
    OrderRepo->>DB: SELECT * FROM routes WHERE id = $1 AND deleted_at IS NULL
    Note over OrderRepo: Route assignment alone MUST NOT confirm delivery date!
    OrderRepo->>DB: UPDATE orders SET route_id = $1, confirmed_delivery_date = NULL WHERE id = $2
    OrderRepo->>DB: INSERT INTO route_stops (route_id, shop_id) ON CONFLICT DO NOTHING
    OrderRepo->>DB: INSERT INTO order_scheduling_history (action = 'ROUTE_ASSIGNED', reason = 'Admin routed order')
    OrderRepo->>DB: COMMIT TRANSACTION
    
    OrderRepo-->>OrderAPI: { success: true, route_id, confirmed_delivery_date: null }
    OrderAPI-->>Dashboard: 200 OK
    Dashboard->>Dashboard: Invalidate orders cache & toast success notification
```

---

### 2.4 Sequence 4: Admin Confirming a Delivery Schedule (Case C Transition)
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Central Logistics Admin
    participant Dashboard as Admin Web Dashboard
    participant SchedAPI as Scheduling Controller (/api/orders/:id/schedule)
    participant SchedService as Scheduling Engine
    participant DB as PostgreSQL
    participant ShopApp as Shop Mobile App

    Admin->>Dashboard: Selects published run & clicks "Confirm Delivery Schedule"
    Dashboard->>SchedAPI: POST /api/orders/:orderId/schedule { deliveryRunId, deliveryWindow, notes }
    SchedAPI->>SchedService: scheduleOrder(orderId, deliveryRunId, deliveryWindow, adminId)
    
    SchedService->>DB: BEGIN TRANSACTION
    SchedService->>DB: Lock order & delivery_run (FOR UPDATE)
    SchedService->>DB: Verify vehicle capacity (currentCrates + orderCrates <= maxCrates)
    SchedService->>DB: Verify driver is_active & vehicle is AVAILABLE
    SchedService->>DB: INSERT INTO delivery_run_stops (run_id, shop_id) ON CONFLICT DO NOTHING
    SchedService->>DB: UPDATE orders SET delivery_run_id = $1, confirmed_delivery_date = run.delivery_date, scheduling_status = 'SCHEDULED'
    SchedService->>DB: UPDATE deliveries SET driver_id = run.driver_id, status = 'ASSIGNED'
    SchedService->>DB: UPDATE delivery_runs SET total_assigned_crates = ..., total_assigned_orders_count = ...
    SchedService->>DB: INSERT INTO order_scheduling_history (action = 'SCHEDULED', new_delivery_date = run.delivery_date)
    SchedService->>DB: COMMIT TRANSACTION
    
    SchedService-->>SchedAPI: { success: true, confirmedDeliveryDate, schedulingStatus: 'SCHEDULED' }
    SchedAPI-->>Dashboard: 200 OK
    
    Note over ShopApp: Shop App refreshes or opens orders list
    ShopApp->>SchedAPI: GET /api/orders/:orderId
    SchedAPI-->>ShopApp: Sanitized Order (confirmed_delivery_date: '2026-10-22', read-only)
    ShopApp-->>ShopApp: Renders confirmed delivery date badge (Case C)
```

---

### 2.5 Sequence 5: Driver Executing & Completing a Stop
```mermaid
sequenceDiagram
    autonumber
    actor Driver as Van Driver
    participant DriverApp as Driver Mobile App
    participant DeliveryAPI as Delivery Controller (/api/deliveries/:id/proof)
    participant DeliveryService as Delivery Service
    participant DB as PostgreSQL
    actor Shop as Shopkeeper

    Driver->>DriverApp: Arrives at store location & clicks "Complete Stop"
    Driver->>Shop: Unloads crates & asks for verification PIN
    Shop->>Driver: Provides 4-digit PIN (or signature)
    Driver->>DriverApp: Enters delivered crate count, damaged pouches, and PIN
    DriverApp->>DeliveryAPI: POST /api/deliveries/:id/proof { deliveredCrates, verificationPin, signatureData }
    DeliveryAPI->>DeliveryService: completeDelivery(id, payload, driverId)
    
    DeliveryService->>DB: BEGIN TRANSACTION
    DeliveryService->>DB: Verify driver ownership (delivery.driver_id == driverId)
    DeliveryService->>DB: UPDATE deliveries SET status = 'DELIVERED', delivered_at = NOW(), proof_signature = $1
    DeliveryService->>DB: UPDATE orders SET status = 'DELIVERED', updated_at = NOW()
    DeliveryService->>DB: UPDATE delivery_run_stops SET status = 'COMPLETED', completed_at = NOW()
    DeliveryService->>DB: COMMIT TRANSACTION
    
    DeliveryService-->>DeliveryAPI: { success: true, status: 'DELIVERED' }
    DeliveryAPI-->>DriverApp: 200 OK
    DriverApp-->>Driver: Marks stop green & advances to next stop in corridor
```

---

### 2.6 Sequence 6: Failed Request & Centralized Error Handling Flow
```mermaid
sequenceDiagram
    autonumber
    actor Caller as Client (Shop / Driver / Admin)
    participant ClientApp as App Client (Axios / fetch)
    participant AppServer as Express Central Error Handler
    participant Service as Domain Service

    Caller->>ClientApp: Trigger Action (e.g. Schedule run exceeding capacity)
    ClientApp->>AppServer: HTTP POST Request
    AppServer->>Service: Execute Domain Method
    Service->>Service: Capacity Check (currentCrates + newCrates > maxCrates)
    Service-->>AppServer: throw new AppError("Vehicle crate capacity exceeded", 409)
    Note over AppServer: Central errorHandler interceptor catches AppError
    AppServer->>AppServer: logger.error(err.message, stack, correlationId)
    AppServer-->>ClientApp: HTTP 409 Conflict<br/>{ success: false, message: "Vehicle crate capacity exceeded", error: "ConflictError" }
    ClientApp->>ClientApp: Intercept 4xx/5xx in apiClient
    ClientApp-->>Caller: Display localized error toast (No silent success)
```
