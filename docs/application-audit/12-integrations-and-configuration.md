# 12 — Third-Party Integrations & Environment Configuration

## 1. Third-Party Integrations Inventory

### 1.1 Maps, Geocoding & Navigation
- **Implementation:** `src/services/map-resolver.service.ts` & `src/features/shops/InteractiveMapPicker.tsx`.
- **Provider:** OpenStreetMap / Leaflet / Nominatim Reverse Geocoding.
- **Purpose:** Resolves store addresses to latitude/longitude coordinates and vice versa; powers the interactive store location picker.
- **Driver Navigation:** Employs native deep linking (`geo:latitude,longitude` or `https://www.google.com/maps/dir/?api=1&destination=...`) allowing van drivers to trigger Google Maps or Apple Maps with turn-by-turn routing directly from their active stop screen.

### 1.2 PDF Document Generation
- **Implementation:** `src/services/pdf-generator.service.ts`.
- **Library:** `pdfkit` / headless PDF streaming.
- **Generated Documents:**
  - Delivery Challan (`DELIV-CHALLAN-xxxx.pdf`).
  - Driver Morning Packing & Loading Sheet.
  - Supplier Payment & Collection Statement.

### 1.3 Database Provider & Pooling
- **Implementation:** `src/config/database.ts`.
- **Provider:** PostgreSQL / Neon Serverless Postgres.
- **Connection Engine:** `pg-pool` with SSL enabled (`rejectUnauthorized: false` for managed serverless instances), connection timeouts, and max connection pool bounds (10–20 connections).

### 1.4 Notifications & Alerts
- **Implementation:** `src/services/notification.service.ts`.
- **Mobile Push:** Expo Push Notification API (`expo-server-sdk`) for merchant delivery arrival alerts.
- **SMS / WhatsApp Gateway:** Pluggable notification service prepared for Twilio / Gupshup SMS dispatch.

---

## 2. Safe Environment Variables Inventory

*(No secret values or live credentials are exposed in this document)*

### 2.1 Backend Environment (`Delivshop_Backend/.env`)
| Variable Name | Purpose | Required in Prod | Reference Location |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Application runtime environment (`development`, `production`, `test`) | Yes | `src/config/database.ts` |
| `PORT` | HTTP port for Express API server (Default: `5000`) | Yes | `src/server.ts` |
| `DATABASE_URL` | PostgreSQL connection URI string (`postgresql://user:pass@host/db`) | Yes | `src/config/database.ts` |
| `JWT_SECRET` | Cryptographic secret for signing access tokens | Yes | `src/utils/tokens.ts` |
| `JWT_REFRESH_SECRET` | Cryptographic secret for signing refresh tokens | Yes | `src/utils/tokens.ts` |
| `JWT_EXPIRY` | Short access token lifespan (e.g. `1h`, `15m`) | Optional | `src/utils/tokens.ts` |
| `JWT_REFRESH_EXPIRY` | Refresh token lifespan (e.g. `7d`) | Optional | `src/utils/tokens.ts` |
| `CORS_ORIGIN` | Allowed web dashboard origin (`http://localhost:5173`, production domains) | Yes | `src/app.ts` |
| `LOG_LEVEL` | Winston logging threshold (`info`, `debug`, `warn`) | Optional | `src/utils/logger.ts` |
| `STORAGE_DRIVER` | File storage driver (`local`, `s3`) | Optional | `src/services/file.service.ts` |

### 2.2 Frontend Web Dashboard (`Delivshop_frontend/.env`)
| Variable Name | Purpose | Required in Prod | Reference Location |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | Base HTTP endpoint for backend API (`http://localhost:5000/api`) | Yes | `src/services/api/endpoints.ts` |

### 2.3 Mobile Application (`Delivshop/.env`)
| Variable Name | Purpose | Required in Prod | Reference Location |
| :--- | :--- | :--- | :--- |
| `EXPO_PUBLIC_API_URL` | Network reachable backend API host (`http://192.168.x.x:5000/api`) | Yes | `src/services/api/shopApi.ts` |

---

## 3. Hosting & Deployment Specifications

1. **Backend API (`Delivshop_Backend`):**
   - Configured with `vercel.json` for serverless deployment or containerized Node.js runtime (`node dist/server.js`).
   - Standard build command: `npm run build` (`tsc && node copy-migrations`).
2. **Admin Web Dashboard (`Delivshop_frontend`):**
   - Single-Page Application (SPA) configured for Vercel / Netlify / Cloudflare Pages via `vercel.json` rewrite rules (`/* -> /index.html`).
   - Standard build command: `npm run build` (`tsc -b && vite build`).
3. **Mobile Application (`Delivshop`):**
   - EAS (Expo Application Services) build pipeline for Android APK (`.apk` / `.aab`) and iOS (`.ipa`).
