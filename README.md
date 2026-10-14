# Delivshop Multi-Application Workspace

Welcome to the **Delivshop** platform workspace. This workspace contains three completely independent projects communicating exclusively via standard HTTP/JSON APIs:

```text
Delivshop_Workspace/
│
├── Delivshop/                 # Independent React Native / Expo Mobile Client
│   ├── app/                   # Expo Router screens (Auth, Shop, Driver)
│   ├── src/                   # Components, API client, types, storage
│   ├── assets/                # App assets
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
├── Delivshop_Backend/         # Independent Node.js + Express API Server
│   ├── src/                   # Auth, Middleware, Controllers, Database
│   ├── database/migrations/   # PostgreSQL schema & constraints
│   ├── tests/                 # Unit, Integration, & Security tests
│   ├── docs/API.md            # Documented REST Endpoints
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
└── Delivshop_frontend/        # Independent React + Vite Web Portal
    ├── src/                   # Admin & Merchant Web Dashboard
    ├── public/
    ├── .env.example
    ├── package.json
    └── README.md
```

---

## Architecture & Communication Rules

```text
Delivshop Mobile App ─────┐
                          │ HTTPS + JSON API
Delivshop Web Frontend ───┼──────────────► Delivshop Backend
                          │                       │
                          │                       ▼
                          │                  PostgreSQL
```

1. **Strict Decoupling**:
   - The three projects are not merged into a monorepo.
   - Each project has its own `package.json`, `node_modules`, `tsconfig.json`, `.gitignore`, and `.env.example`.
   - Projects do not share filesystem code dependencies or import from each other's directories.

2. **API-Only Communication**:
   - Mobile and Web frontends communicate **only** with the Backend API over HTTP.
   - No direct database access from either frontend.
   - Database credentials and signing secrets reside exclusively in backend environment variables.

3. **Server-Side Security Authority**:
   - The backend validates all requests with Zod schemas.
   - Role-based authorization (`ADMIN`, `SUPPLIER`, `SHOP`, `DRIVER`) and resource ownership (shop orders, driver deliveries) are enforced server-side.
   - Password hashing uses bcrypt with configurable work factors.

---

## Quick Start Guide

### 1. Backend Server (`Delivshop_Backend`)
```bash
cd Delivshop_Backend
npm install
cp .env.example .env
npm run dev
```
Health endpoint: `http://localhost:5000/api/health`

### 2. Web Frontend (`Delivshop_frontend`)
```bash
cd Delivshop_frontend
npm install
cp .env.example .env
npm run dev
```
Local portal: `http://localhost:5173`

### 3. Mobile Application (`Delivshop`)
```bash
cd Delivshop
npm install
cp .env.example .env
npm start
```
Run on iOS simulator (`npm run ios`), Android emulator (`npm run android`), or web (`npm run web`).
