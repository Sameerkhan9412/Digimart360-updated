# DIGI MART 360

India's verified B2B marketplace: buyers find manufacturers and post requirements, suppliers get leads and their own branded website on their own domain, admins verify and moderate.

```
                 ┌────────────── one VPS (4 GB) · Docker Compose ───────────────┐
 Browsers ──┐    │  Caddy (HTTPS, incl. automatic certificates for seller domains) │
 Android ───┼──► │     ├─► apps/web   Next.js: marketplace, admin, seller sites    │
 iOS ───────┘    │     └─► apps/api   NestJS REST API /api/v1  ──►  PostgreSQL 17  │
                 └───────────────────────────────────────────────────────────────┘
```

| Path | What it is | Status |
|---|---|---|
| `apps/api` | NestJS + Prisma + PostgreSQL. One API for web and mobile. | Sign-in, catalog, search, supplier self-service, moderation |
| `apps/web` | Next.js marketplace (seller storefronts by domain come later) | Homepage, category listings, product and supplier pages, SEO, supplier sign-in and dashboard |
| `packages/*` | Shared UI, generated API client, config | Next |
| `mockups/` | Approved HTML designs, storefront themes, Theme Studio | Reference for `apps/web` |

## Run it on this machine

Requires Node.js 24 and PostgreSQL 17 (installed here as the Windows service `postgresql-17`; credentials in `C:\PostgreSQL\17\CREDENTIALS.txt`).

```bash
npm install
cp apps/api/.env.example apps/api/.env   # then set DATABASE_URL and JWT_ACCESS_SECRET
npm run db:migrate                         # apply migrations
npm run db:seed                            # create the admin account
npm run db:seed:demo -w @digimart/api      # optional: demo catalog from the mockups
npm run dev:api                            # http://localhost:3000/api/v1 · docs at /api/docs
cp apps/web/.env.example apps/web/.env.local   # set INTERNAL_API_KEY (same as the API's)
npm run dev -w @digimart/web               # http://localhost:3001
```

In development, sign-in codes are printed in the API log instead of being emailed (`MAIL_TRANSPORT=console`).

`npm run lint`, `npm test` and `npm run build` run across all apps; `npm run test:e2e -w @digimart/api` runs the end-to-end tests against a separate test database. GitHub Actions runs all of them on every push, against a real PostgreSQL.

## Decisions so far

- **One API for every client.** Bearer tokens (not cookies), per-device refresh tokens, `/api/v1` versioning so installed mobile apps never break.
- **Sign-in:** email OTP and Google now; WhatsApp OTP later. OTP delivery is pluggable (`apps/api/src/notifications/otp-senders.ts`).
- **Server-rendered website** (Next.js) for SEO: category and product pages must be indexable, with structured data.
- **One web app serves all storefronts.** It reads the request's domain to pick the seller and theme, so a seller's products are the same records on the marketplace and on their own domain.
- **Hosting target:** a single 4 GB VPS with Docker Compose and Caddy. Everything is containerised, so moving to AWS later is possible.

## Roadmap (phase 1)

1. ~~Repository, CI, local database~~ · ~~Sign-in: email OTP + Google~~
2. ~~Catalog API: categories, companies (suppliers), products, search, moderation~~
3. ~~Website: Homepage v2, category listing, product page; SEO (metadata, sitemap, structured data)~~
4. ~~Supplier dashboard: company profile, GST verification request, product management, image uploads~~ (browser walkthrough pending)
5. RFQs: post requirement, matching, quotes, buyer comparison
6. Storefront themes + custom domains (Caddy on-demand TLS, DNS verification, admin approval)
7. Admin: verification queue, moderation, domain approvals
8. Deployment: Docker images, Compose stack, backups, monitoring

## Known follow-ups

- Uploaded photos live in `UPLOAD_DIR` (default `apps/api/uploads`). In Docker, mount it as a volume and back it up; swap `LocalDiskStorage` for S3/R2 if the VPS fills up.
- The dashboard can't clear an optional field once it is set (the API treats a missing field as unchanged).

- Upgrade Next.js to 15.5.29+ (or 16) once the release is two weeks old; postcss is pinned to 8.5.30 via `overrides` until then.

- Upgrade NestJS to 12 before adding file uploads (security fix in its upload handler).
- Migrate Prisma 6 → 7 (security fix in its config tooling).
- Production email provider for OTP (Amazon SES Mumbai, Brevo or Zoho ZeptoMail) and the Google OAuth client IDs.
