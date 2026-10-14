# Delivshop Backend API Documentation

Base URL: `http://localhost:5000/api`

All requests and responses use JSON. Sensitive endpoints require a standard `Authorization: Bearer <token>` header.

---

## 1. System Endpoints

### Health Check
- **Endpoint**: `GET /api/health`
- **Auth**: None (Public)
- **Response**:
  ```json
  {
    "success": true,
    "status": "HEALTHY",
    "timestamp": "2026-03-10T14:00:00.000Z",
    "uptimeSeconds": 340,
    "components": {
      "api": "UP",
      "database": "UP",
      "latencyMs": 4
    }
  }
  ```

---

## 2. Authentication (`/api/auth`)

### Register User
- **Endpoint**: `POST /api/auth/register`
- **Auth**: None
- **Rate Limit**: 10 requests / 15 minutes
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!",
    "name": "Jane Doe",
    "role": "SHOP",
    "phone": "+1-555-0199"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "uuid",
        "email": "user@example.com",
        "name": "Jane Doe",
        "role": "SHOP"
      },
      "tokens": {
        "accessToken": "eyJhbGciOi...",
        "refreshToken": "eyJhbGciOi...",
        "expiresIn": 900
      }
    }
  }
  ```

### Login
- **Endpoint**: `POST /api/auth/login`
- **Auth**: None
- **Rate Limit**: 10 requests / 15 minutes
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!"
  }
  ```

### Current User Profile
- **Endpoint**: `GET /api/auth/me`
- **Auth**: `Bearer <token>`

---

## 3. Shops (`/api/shops`)

### Get Shop Details
- **Endpoint**: `GET /api/shops/:shopId`
- **Auth**: None

### List Shop Products
- **Endpoint**: `GET /api/shops/:shopId/products`
- **Auth**: None

### Shop Analytics & Stats
- **Endpoint**: `GET /api/shops/:shopId/stats`
- **Auth**: `Bearer <token>` (Role: `SHOP`, `ADMIN`)

---

## 4. Orders (`/api/orders`)

### Get Order by ID
- **Endpoint**: `GET /api/orders/:orderId`
- **Auth**: `Bearer <token>` (Roles: `SHOP`, `DRIVER`, `ADMIN`)
- **Ownership**: Shop users can only access orders for their own shop; drivers can only access orders for deliveries assigned to them.

### Update Order Status
- **Endpoint**: `PATCH /api/orders/:orderId/status`
- **Auth**: `Bearer <token>` (Roles: `SHOP`, `ADMIN`)
- **Body**:
  ```json
  {
    "status": "PREPARING"
  }
  ```

---

## 5. Deliveries (`/api/deliveries`)

### Get Driver Assigned Deliveries
- **Endpoint**: `GET /api/deliveries/assigned`
- **Auth**: `Bearer <token>` (Roles: `DRIVER`, `ADMIN`)

### Update Delivery Status
- **Endpoint**: `PATCH /api/deliveries/:deliveryId/status`
- **Auth**: `Bearer <token>` (Roles: `DRIVER`, `ADMIN`)
- **Assignment Check**: Driver must be assigned to this delivery.
- **Body**:
  ```json
  {
    "status": "PICKED_UP",
    "currentLatitude": 40.7128,
    "currentLongitude": -74.0060,
    "notes": "Package safely loaded in vehicle"
  }
  ```

---

## 6. Security & Authorization Matrix

| Endpoint | Roles Allowed | Resource Ownership Enforced |
|---|---|---|
| `GET /api/health` | Public | No |
| `POST /api/auth/*` | Public (Rate Limited) | No |
| `GET /api/shops/:id` | Public | No |
| `GET /api/shops/:id/stats` | `SHOP`, `ADMIN` | Yes (`shop.owner_id`) |
| `GET /api/orders/:id` | `SHOP`, `DRIVER`, `ADMIN` | Yes (`shop.owner_id` or `delivery.driver_id`) |
| `PATCH /api/orders/:id/status` | `SHOP`, `ADMIN` | Yes (`shop.owner_id`) |
| `GET /api/deliveries/assigned`| `DRIVER`, `ADMIN` | Filtered by driver's authenticated user ID |
| `PATCH /api/deliveries/:id/status`| `DRIVER`, `ADMIN` | Yes (`delivery.driver_id`) |
