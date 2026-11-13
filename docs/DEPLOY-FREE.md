# Free hosting for now: Vercel + Render + Neon

This is a stopgap. Later you can move to the paid VPS setup in `deploy/` (see README).

| Part | Where | Free-plan limits to know |
|---|---|---|
| Website (`apps/web`) | Vercel | none that matter yet |
| API (`apps/api`) | Render, from `render.yaml` | sleeps after ~15 min idle (first visit takes ~30-60 s to wake); **uploaded photos are lost whenever it restarts or redeploys** |
| Database | Neon | 0.5 GB |

**Not available on this setup:** suppliers' own subdomains and custom domains (they need your own domain and DNS; Vercel's `*.vercel.app` has no wildcard). Supplier pages still work at `/store/<slug>` on the marketplace.

## 1. Database (Neon)

1. Create a free project at neon.tech. In **Connect**, turn **off** "Connection pooling" and copy the **connection string**. It must end with `?sslmode=require` (delete `&channel_binding=require` if it is there). This is the value for `DATABASE_URL`.
2. Nothing else is needed: the API applies its own database migrations when it starts. (Neon Auth and Realtime, if you enabled them, are not used by this app.)

## 2. API (Render)

1. In Render: **New > Blueprint**, pick this GitHub repository. It reads `render.yaml`.
2. The blueprint puts the API in Render's Ohio region, next to Neon's `us-east-2`. Fill the values it asks for:
   - `DATABASE_URL`: the Neon direct string from step 1.
   - `SEED_ADMIN_EMAIL`: the email you will sign in with as admin.
   - `WEB_URL` and `CORS_ORIGINS`: your Vercel address, e.g. `https://digimart360.vercel.app` (choose the Vercel project name first; the address is `<name>.vercel.app`).
   - `MEDIA_BASE_URL`: your Render address plus `/media`, e.g. `https://digimart-api.onrender.com/media`. If you do not know the address yet, leave a placeholder, deploy once, then correct it under Environment.
3. Deploy. When it is up, `https://<your-api>.onrender.com/api/v1/health` should answer `ok`.
4. Open the service's **Environment** tab and copy the generated `INTERNAL_API_KEY` (the website needs the same value).
5. `SEED_DEMO=true` loads the sample suppliers and products. Set it to `false` and redeploy for an empty marketplace.
6. Sign-in codes appear in the service's **Logs** while `MAIL_TRANSPORT=console`.

## 3. Website (Vercel)

1. In Vercel: **Add New > Project**, import the same repository.
2. **Root Directory:** `apps/web`. Keep "Include source files outside of the Root Directory" on. Framework: Next.js.
3. Environment variables:

   | Name | Value |
   |---|---|
   | `SITE_URL` | `https://<project>.vercel.app` |
   | `API_URL` | `https://<your-api>.onrender.com/api/v1` |
   | `NEXT_PUBLIC_API_URL` | the same as `API_URL` |
   | `INTERNAL_API_KEY` | the key copied from Render |
   | `ROOT_DOMAIN` | `localhost` |
   | `ALLOW_INDEXING` | `false` |

4. Deploy. Then open the site, sign in with the admin email at `/signin?next=/admin`, and read the code in Render's logs.

## Later: real users

- Email: set `MAIL_TRANSPORT=smtp` and `SMTP_URL` (Brevo, Amazon SES or similar) so sign-in codes are emailed.
- Photos: move uploads to object storage (Cloudflare R2 or S3). The storage layer is already pluggable, but only local disk is written so far.
- Domain: buy one, then use the VPS setup in `deploy/` for supplier subdomains and custom domains.
