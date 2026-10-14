# Delivshop Backend API Server

High-performance, secure backend API server for the Delivshop platform built with **Node.js**, **Express**, **TypeScript**, and **PostgreSQL**.

## Architecture & Structure

```text
Delivshop_Backend/
├── src/
│   ├── app.ts                  # Express application setup (helmet, cors, rate limits)
│   ├── server.ts               # HTTP server lifecycle & startup validation
│   ├── config/
│   │   ├── env.ts              # Zod environment variable validation
│   │   └── database.ts         # PostgreSQL connection pool & health checks
│   ├── routes/                 # Express router modules
│   │   ├── index.ts
│   │   ├── health.routes.ts
│   │   ├── auth.routes.ts
│   │   ├── shop.routes.ts
│   │   ├── order.routes.ts
│   │   └── delivery.routes.ts
│   ├── controllers/            # Route controllers
│   ├── services/               # Business logic & domain operations
│   ├── repositories/           # Parameterized database queries
│   ├── middleware/             # Security, auth, validation, rate limiting
│   │   ├── auth.middleware.ts
│   │   ├── role.middleware.ts
│   │   ├── ownership.middleware.ts
│   │   ├── validate.middleware.ts
│   │   ├── rateLimiter.middleware.ts
│   │   └── errorHandler.middleware.ts
│   ├── schemas/                # Zod request validation schemas
│   ├── database/
│   │   ├── connection.ts       # DB pool re-export
│   │   └── migrations/         # PostgreSQL DDL migrations
│   ├── utils/                  # Password hashing, JWT, logging, responses
│   └── types/                  # Typed interfaces & Express Request extensions
├── tests/
│   ├── unit/                   # Password & hashing unit tests
│   ├── integration/            # App creation & route integration tests
│   └── security/               # Token authorization tests
├── docs/
│   └── API.md                  # Detailed API endpoint documentation
├── .env.example                # Sample environment configuration
├── .gitignore                  # Git ignore rules for secrets and builds
├── package.json                # Project dependencies and test scripts
└── tsconfig.json               # TypeScript ES2022 / NodeNext config
```

## Security Controls

1. **Database Isolation**:
   - Only this backend service connects to PostgreSQL.
   - Frontend and mobile applications communicate strictly via HTTP JSON APIs.
   - All queries use parameterized inputs (`$1, $2, ...`) to eliminate SQL injection vulnerabilities.

2. **Authentication & Cryptography**:
   - Passwords hashed using `bcryptjs` with configured work factor salt rounds.
   - Stateless JWT tokens for API access with role and user metadata.
   - Rate limiting on authentication routes prevents brute-force credential stuffing.

3. **Server-Side Authorization**:
   - Roles: `ADMIN`, `SUPPLIER`, `SHOP`, `DRIVER`.
   - Resource ownership middleware (`src/middleware/ownership.middleware.ts`) strictly prevents shops from reading other shops' orders and drivers from reading or mutating other drivers' deliveries.

4. **Information Disclosure Prevention**:
   - Centralized error handler (`src/middleware/errorHandler.middleware.ts`) ensures stack traces, database schema details, and passwords are never returned in HTTP responses.
   - Request bodies limited to `10kb` to thwart Denial-of-Service attacks.

## Setup & Running

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment configuration**:
   ```bash
   cp .env.example .env
   ```
   Fill in your PostgreSQL `DATABASE_URL` and a random `JWT_SECRET`.

3. **Run database migrations**:
   Apply `src/database/migrations/001_initial_schema.sql` to your PostgreSQL database.

4. **Start in development mode**:
   ```bash
   npm run dev
   ```

5. **Typecheck & Tests**:
   ```bash
   npm run typecheck
   npm test
   ```
