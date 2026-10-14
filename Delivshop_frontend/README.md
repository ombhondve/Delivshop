# Delivshop Web Frontend

Independent management and operations portal for Delivshop built with **React**, **TypeScript**, and **Vite**.

## Architecture & Structure

```text
Delivshop_frontend/
├── src/
│   ├── app/
│   │   └── App.tsx             # Root application shell with tabs and auth status
│   ├── components/
│   │   ├── common/             # Reusable UI primitives (Button, Card, Badge, Input)
│   │   └── layout/             # Layout structure (Header, Sidebar, Shell)
│   ├── features/
│   │   ├── auth/               # Auth context & Login page
│   │   ├── dashboard/          # Fleet, merchant & operations dashboard
│   │   ├── shops/              # Merchant directory & status view
│   │   ├── products/           # Product and inventory catalog
│   │   ├── orders/             # Order feed & tracking
│   │   ├── deliveries/         # Driver delivery dispatch & tracking
│   │   └── reports/            # Security audit event viewer
│   ├── services/
│   │   └── api/
│   │       ├── client.ts       # Typed fetch client with Bearer auth injection
│   │       └── endpoints.ts    # Typed API route callers
│   ├── hooks/
│   │   └── useAuth.ts          # Authentication hook
│   ├── types/
│   │   └── index.ts            # Data contracts and API models
│   ├── utils/
│   │   └── formatters.ts       # Currency, date, and status formatting
│   ├── index.css               # Design system & dark mode aesthetics
│   └── main.tsx                # React DOM entrypoint
├── public/
│   └── favicon.svg             # Delivshop portal icon
├── .env.example                # Sample environment configuration
├── .gitignore                  # Git ignore rules for node_modules and .env
├── index.html                  # HTML template with Google Fonts (Inter)
├── package.json                # Project dependencies and build scripts
├── tsconfig.json               # TypeScript frontend config
└── vite.config.ts              # Vite configuration
```

## Security & API Design Principles

1. **API-Only Communication**:
   - The web frontend communicates exclusively with `Delivshop_Backend` via HTTP JSON APIs.
   - It **never** connects directly to PostgreSQL.
   - Base URL is configured via `import.meta.env.VITE_API_URL`.

2. **No Secret Storage**:
   - No database credentials, server private keys, or signing secrets are placed in this frontend bundle.
   - Only public variables prefixed with `VITE_` are exposed to the client.

3. **Server-Side Authorization Authority**:
   - UI elements do not replace server authorization. All sensitive queries and actions are verified on the backend.
   - Session tokens are stored in browser session storage and attached to requests via `Authorization: Bearer <token>`.

## Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure `VITE_API_URL`:
```env
VITE_API_URL=http://localhost:5000/api
```

## Available Scripts

- `npm run dev` — Start Vite development server (`http://localhost:5173`)
- `npm run build` — Build production bundle with TypeScript type-checking
- `npm run preview` — Preview the production build locally
- `npm run typecheck` — Type-check TypeScript code
