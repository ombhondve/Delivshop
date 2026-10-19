# 16 — Application Operations & Deployment Guide

## 1. Environment Prerequisites

Before running the Delivshop platform locally or in a staging environment, verify the following dependencies:
- **Node.js:** `v20.x` or `v22.x` (LTS recommended)
- **Package Manager:** `npm` (v10+)
- **Relational Database:** PostgreSQL 15+ (Local or Neon Serverless Postgres instance)
- **Mobile Development CLI:** Expo CLI (`npm install -g expo-cli` or `npx expo`)
- **Operating System:** Windows, macOS, or Linux

---

## 2. Installation & Setup

### 2.1 Backend API Service (`Delivshop_Backend`)
```powershell
# Navigate to backend directory
cd Delivshop_Backend

# Install dependencies
npm install

# Configure environment variables
Copy-Item .env.example .env
# Edit .env and supply your DATABASE_URL, JWT_SECRET, and JWT_REFRESH_SECRET

# Run database migrations
npm run migrate

# Start development server with hot-reload (Port 5000)
npm run dev
```

### 2.2 Admin Web Dashboard (`Delivshop_frontend`)
```powershell
# Navigate to frontend directory
cd Delivshop_frontend

# Install dependencies
npm install

# Configure environment variables
Copy-Item .env.example .env
# Ensure VITE_API_URL points to http://localhost:5000/api

# Start Vite development server (Port 5173)
npm run dev
```

### 2.3 Shop & Driver Mobile Application (`Delivshop`)
```powershell
# Navigate to mobile directory
cd Delivshop

# Install dependencies
npm install

# Configure environment variables
Copy-Item .env.example .env
# Update EXPO_PUBLIC_API_URL to your local machine's IP (e.g. http://192.168.1.50:5000/api)

# Start Expo Metro bundler
npx expo start
# Press 'a' for Android emulator, 'i' for iOS simulator, or scan QR with Expo Go app
```

---

## 3. Testing & Build Verification Commands

### 3.1 Backend Integration Testing
```powershell
cd Delivshop_Backend

# Run all test suites
npm test

# Run dedicated Route Assignment & Delivery Date Visibility suite
npm test tests/integration/route-assignment-and-delivery-date-visibility.test.ts

# Run Shop Orders & Dispatch suite
npm test tests/integration/shop-order-tracking.test.ts

# Run Products & Inventory suite
npm test tests/integration/product-inventory-management.test.ts
```

### 3.2 Production Builds
```powershell
# 1. Compile Backend API (Outputs to /dist)
cd Delivshop_Backend
npm run build

# 2. Compile Web Dashboard (Outputs to /dist via Vite)
cd ../Delivshop_frontend
npm run build

# 3. Typecheck Mobile App (Zero TypeScript Errors)
cd ../Delivshop
npx tsc --noEmit
```

---

## 4. Troubleshooting & Operational Runbooks

### 4.1 Neon Serverless PostgreSQL Connection Drop / SSL Warning
- **Symptom:** `error: self-signed certificate in certificate chain` or connection timeout during tests.
- **Remedy:** Ensure `ssl: { rejectUnauthorized: false }` is active in `src/config/database.ts` when connecting to remote cloud database endpoints.

### 4.2 Port 5000 Already in Use
- **Symptom:** `EADDRINUSE: address already in use :::5000`.
- **Remedy (PowerShell):**
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force
  ```

### 4.3 Metro Bundler Stale Cache on Mobile App
- **Symptom:** Modified screens not updating on Expo Go device or emulator.
- **Remedy:** Start Metro with cache reset:
  ```powershell
  npx expo start -c
  ```

### 4.4 CORS Origin Block on Web Dashboard
- **Symptom:** Browser console reports: `Access to XMLHttpRequest blocked by CORS policy`.
- **Remedy:** Ensure `CORS_ORIGIN` in `Delivshop_Backend/.env` includes the active Vite dev port (e.g. `http://localhost:5173`).
