# DIGI MART 360 API

The one backend for DIGI MART 360. The web app and the future Android and iOS apps all call this same API, so business rules, data and accounts live in one place.

```
 Web app (browser) ─┐
 Android app ───────┼──►  DIGI MART 360 API  (/api/v1)  ──►  PostgreSQL
 iOS app ───────────┘     NestJS · TypeScript · Prisma
```

**Stack:** Node.js 24 · NestJS 11 · PostgreSQL 17 · Prisma 6 · JWT auth · OpenAPI (Swagger) docs

## What's in this skeleton

| Area | What it does |
|---|---|
| Sign-in | Email OTP (6-digit code), Google ID token, refresh, logout, logout from all devices. First sign-in creates the account. |
| Roles | `BUYER`, `SUPPLIER`, `ADMIN`. Restrict any route with `@Roles(Role.SUPPLIER)` |
| Users | `GET /users/me`, `PATCH /users/me` (name, phone) |
| Health | `GET /health` checks the API and the database |
| API docs | Interactive docs at `/api/docs`, raw OpenAPI JSON at `/api/docs-json` |
| Safety | Input validation, rate limiting (10/min per IP on auth routes; 1 code/min and 5 codes/hour per address), Helmet headers, CORS allow-list |

Marketplace modules (categories, products, suppliers, RFQs, quotes, admin moderation) are not built yet. See **Adding a module** below.

## Run it locally

You need Node.js 22+ and a PostgreSQL 17 database.

```bash
npm install                   # from the repository root (npm workspaces)
cp .env.example .env          # then set DATABASE_URL and JWT_ACCESS_SECRET
npm run db:deploy             # creates the tables
npm run db:seed               # creates the admin account (SEED_ADMIN_EMAIL)
npm run start:dev             # http://localhost:3000/api/v1 · docs at /api/docs
```

Other scripts: `npm test` (unit tests), `npm run lint` (type check), `npm run build`, `npm run db:migrate` (create a new migration after editing `prisma/schema.prisma`), `npm run db:studio` (browse data).

> On this Windows Server machine PostgreSQL 17 runs natively as the `postgresql-17` service. `npm run db:up` (Docker) is for machines with Docker.

> **Creating a migration** (non-interactive shells): edit `prisma/schema.prisma`, then `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url <a scratch DB URL> --script > prisma/migrations/<timestamp>_<name>/migration.sql` and `npm run db:deploy`. In an interactive terminal `npm run db:migrate -- --name <name>` does both.

## API at a glance

All routes are under `/api/v1`. Every route needs `Authorization: Bearer <accessToken>` unless marked public.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/health` | public | API and database status |
| GET | `/auth/config` | public | Which sign-in methods are on (Google, OTP channels) |
| POST | `/auth/otp/email` | public | Email a 6-digit code. Returns `challengeId` |
| POST | `/auth/otp/verify` | public | `challengeId` + `code` → tokens. Creates the account on first sign-in (`name`, `role` optional) |
| POST | `/auth/google` | public | Google `idToken` → tokens. Links to an existing account with the same email |
| POST | `/auth/refresh` | public | Swap a refresh token for a new token pair |
| POST | `/auth/logout` | public | Sign out the device that owns this refresh token |
| POST | `/auth/logout-all` | signed in | Sign out every device |
| GET | `/users/me` | signed in | Current user's profile |
| PATCH | `/users/me` | signed in | Update name or phone (onboarding) |

Errors use NestJS's standard shape: `{ "statusCode": 400, "message": [...], "error": "Bad Request" }`.

## How web and mobile clients should sign in

1. **Ask what's available:** `GET /auth/config` tells the app whether to show "Continue with Google".
2. **Email OTP:** `POST /auth/otp/email {email}` → show a 6-digit code field → `POST /auth/otp/verify {challengeId, code}`. A code lasts 10 minutes and allows 5 tries; a new code can be requested after 60 s (the response says `resendAfter`).
3. **Google:** get an ID token on the device (Google Identity Services on web, Google Sign-In / Credential Manager on Android, GoogleSignIn on iOS) and send it to `POST /auth/google {idToken}`. Every client ID used must be listed in `GOOGLE_CLIENT_IDS`.
4. **New accounts:** both sign-in calls accept `role` (`BUYER` or `SUPPLIER`) and `deviceName`, used only when the account is created. When the response has `isNewUser: true`, show onboarding and save details with `PATCH /users/me`.
5. **Store the tokens.**
   - Mobile: refresh token in the iOS Keychain / Android Keystore (`expo-secure-store`, `react-native-keychain`, `flutter_secure_storage`); access token in memory.
   - Web: access token in memory; refresh token in an httpOnly cookie set by the Next.js server.
6. **Call the API** with `Authorization: Bearer <accessToken>`. On a `401`, call `/auth/refresh` once, save **both** new tokens, retry. If refresh fails, go to the sign-in screen.
7. **Refresh tokens are single-use.** Reusing an old one signs the user out on every device. Never refresh twice in parallel with the same token.

**WhatsApp OTP later:** implement `OtpSender` for `OtpChannel.WHATSAPP` in `src/notifications/otp-senders.ts`, register it in `NotificationsModule`, and add a `POST /auth/otp/whatsapp` route. Verification, sessions and clients don't change.

Defaults: access tokens last 15 minutes and refresh tokens 30 days (`JWT_ACCESS_TTL`, `REFRESH_TOKEN_TTL_DAYS`).

## Rules that keep mobile apps working

Installed mobile apps can't be updated instantly; old versions stay in use for months. So:

- **Never make a breaking change to `/api/v1`.** Adding fields and endpoints is fine. Renaming or removing fields, changing types, or making optional inputs required is not. When that's unavoidable, add `/api/v2` alongside v1 with `@Version('2')` on the new controller or route.
- **Treat clients as untrusted.** Every rule (prices, permissions, stock) is enforced here, never only in the app.
- **Generate client code from the OpenAPI spec** (`/api/docs-json`), e.g. with `openapi-typescript` for web and React Native, or `openapi-generator` for Kotlin and Swift, so the apps always match the API.

## Project layout

```
backend/
├─ prisma/
│  ├─ schema.prisma          data model (users, sessions, OTP challenges)
│  ├─ migrations/            SQL migrations, applied in order
│  └─ seed.ts                creates the first admin (signs in by email code)
├─ src/
│  ├─ main.ts                bootstrap: /api/v1 prefix, CORS, validation, Swagger
│  ├─ app.module.ts          wires modules and global guards
│  ├─ config/                validated environment variables
│  ├─ prisma/                database client
│  ├─ common/                @Public(), @Roles(), @CurrentUser(), auth and role guards
│  ├─ auth/                  email OTP, Google, refresh, logout (+ unit tests)
│  ├─ notifications/         email sending, pluggable OTP senders (WhatsApp later)
│  ├─ users/                 user profile
│  └─ health/                health check
├─ docker-compose.yml        local PostgreSQL
└─ .env.example              every setting, documented
```

## Adding a module

Example: products.

1. Add the `Product` model to `prisma/schema.prisma` and run `npm run db:migrate -- --name add_products`.
2. Create `src/products/` with `products.module.ts`, `products.controller.ts`, `products.service.ts` and DTOs using `class-validator` decorators. Inject `PrismaService` into the service.
3. Add `ProductsModule` to `imports` in `app.module.ts`.
4. Mark public reads with `@Public()` and protect writes with `@Roles(Role.SUPPLIER)`. Every route is private by default.

Suggested order, following the mockups: categories → supplier profiles → products → RFQs and quotes → supplier leads → admin moderation.
