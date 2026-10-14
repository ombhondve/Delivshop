# Delivshop Mobile Application

Mobile client for Delivshop built with **React Native**, **Expo**, and **TypeScript**, utilizing **Expo Router** file-based navigation.

## Architecture & Structure

```text
Delivshop/
├── app/                        # Expo Router routes
│   ├── _layout.tsx             # Root layout with AuthProvider & theme
│   ├── index.tsx               # Home screen with portal navigation
│   ├── (auth)/                 # Authentication screens
│   │   ├── _layout.tsx
│   │   ├── login.tsx           # Login screen
│   │   └── register.tsx        # Registration screen
│   ├── (shop)/                 # Shop owner interface
│   │   ├── _layout.tsx
│   │   ├── index.tsx           # Shop dashboard
│   │   └── orders.tsx          # Order management screen
│   └── (driver)/               # Delivery driver interface
│       ├── _layout.tsx
│       ├── index.tsx           # Driver portal
│       └── deliveries.tsx      # Active delivery management
├── src/
│   ├── components/             # Reusable UI components
│   ├── features/               # Feature domains
│   │   ├── auth/               # Auth state & context
│   │   ├── shop/               # Shop domain logic
│   │   ├── products/           # Product domain logic
│   │   ├── orders/             # Order domain logic
│   │   ├── deliveries/         # Delivery tracking logic
│   │   └── payments/           # Payment logic
│   ├── services/
│   │   └── api/                # Dedicated API client & service endpoints
│   ├── hooks/                  # Custom React hooks
│   ├── constants/              # Styling, colors, layout constants
│   ├── types/                  # Typed models & interfaces
│   ├── utils/                  # Secure storage adapter & formatters
│   └── mock/                   # Isolated mock data for offline testing
├── assets/                     # Images, icons, and assets
├── .env.example                # Example client configuration
├── .gitignore                  # Git ignore rules (env & build files)
├── app.json                    # Expo project configuration
├── package.json                # Dependencies and scripts
└── tsconfig.json               # TypeScript configuration with @/* paths
```

## Security & API Design Principles

1. **API-Only Communication**:
   - The mobile application connects exclusively to `Delivshop_Backend` over HTTP/JSON.
   - It **never** connects directly to PostgreSQL or uses internal database credentials.
   - Base URL is loaded from `process.env.EXPO_PUBLIC_API_URL`.

2. **Credentials & Token Persistence**:
   - No private keys, database passwords, or JWT secrets are stored in this codebase.
   - Authentication tokens are handled via the `SecureTokenStorage` adapter (`src/utils/storage.ts`), backed by secure device storage on native builds.
   - Authorization headers (`Bearer <token>`) are injected by `src/services/api/client.ts`.

3. **Isolated Mock Data**:
   - Sample data resides under `src/mock/mockData.ts` and is strictly isolated from production API client services in `src/services/api/`.

## Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure `EXPO_PUBLIC_API_URL`:
```env
EXPO_PUBLIC_API_URL=http://localhost:5000/api
```

*(For physical device testing, use your machine's LAN IP, e.g., `http://192.168.1.50:5000/api`)*

## Available Scripts

- `npm start` — Start Expo development server
- `npm run android` — Run on Android device/emulator
- `npm run ios` — Run on iOS simulator
- `npm run web` — Run on web browser
- `npx tsc --noEmit` — Type-check TypeScript code
