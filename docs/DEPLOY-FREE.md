# Free hosting for now: Vercel + Render + Neon

This is a stopgap. Later you can move to the paid VPS setup in `deploy/` (see README).

| Part | Where | Free-plan limits to know |
|---|---|---|
| Website (`apps/web`) | Vercel | none that matter yet |
| API (`apps/api`) | Render, from `render.yaml` | sleeps after ~15 min idle (first visit takes ~30-60 s to wake) |
| Database | Neon | 0.5 GB |
| Photos | Cloudinary | free credits; photos survive restarts |

Render must be able to read your GitHub repository (a public repo, or the Render GitHub app installed on it).

**Not available on this setup:** suppliers' own subdomains and custom domains (they need your own domain and DNS; Vercel's `*.vercel.app` has no wildcard). Supplier pages still work at `/store/<slug>` on the marketplace.

## 1. Database (Neon)

1. Create a free project at neon.tech. In **Connect**, turn **off** "Connection pooling" and copy the **connection string**. It must end with `?sslmode=require` (delete `&channel_binding=require` if it is there). This is the value for `DATABASE_URL`.
2. Nothing else is needed: the API applies its own database migrations when it starts. (Neon Auth and Realtime, if you enabled them, are not used by this app.)

## 2. API (Render)

1. In Render: **New > Blueprint**, pick this GitHub repository. It reads `render.yaml`.
2. The blueprint puts the API in Render's Ohio region, next to Neon's `us-east-2`. Fill the values it asks for:
   - `DATABASE_URL`: the Neon direct string from step 1.
   - The blueprint already sets `MAIL_TRANSPORT=console` together with `ALLOW_CONSOLE_MAIL=true`. Without that opt-in the API refuses to start in production.
   - `SEED_ADMIN_EMAIL`: the email you will sign in with as admin.
   - `WEB_URL` and `CORS_ORIGINS`: your Vercel address, e.g. `https://digimart360.vercel.app` (choose the Vercel project name first; the address is `<name>.vercel.app`).
   - `CLOUDINARY_URL`: from the Cloudinary dashboard, **Settings > API Keys**, copy the "API environment variable" (`cloudinary://KEY:SECRET@CLOUD_NAME`).
3. Deploy. When it is up, `https://<your-api>.onrender.com/api/v1/health` should answer `ok`.
4. Open the service's **Environment** tab and copy the generated `INTERNAL_API_KEY` (the website needs the same value).
5. **Seed the database once, from your computer.** The free instance (512 MB) cannot run the seed scripts, so the API only applies migrations on start. From the repo root, with `DATABASE_URL` set to the same Neon string and `SEED_ADMIN_EMAIL` set to the admin email:

   ```
   cd apps/api
   npx prisma db seed            # creates the admin account
   npx ts-node prisma/seed-demo.ts   # optional: sample suppliers and products
   ```

   Skip the second command for an empty marketplace.
6. Sign-in codes appear in the service's **Logs** while `MAIL_TRANSPORT=console`.
7. The start command is `npm run start:render` (migrate, then start). Render does not run `dockerCommand` through a shell, so do not put `&&` chains or `sh -c '...'` there.
8. If a deploy says "Application exited early" with no app output, run the API locally with `NODE_ENV=production` and the same variables. The startup error (for example an invalid variable) shows up there.
9. The interactive API docs (`/api/docs`) are off in production. Set `ENABLE_API_DOCS=true` to switch them on.
10. **Rate limits:** the website passes each visitor's address to the API (`X-Client-IP`, believed only together with the secret `INTERNAL_API_KEY`), so limits apply per visitor. If you put another proxy between the website and the API, check the visitor address still arrives, or everyone will share one limit. Searches are limited to 40 a minute per visitor.

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

## WhatsApp sign-in codes (Twilio)

People can sign in with a phone number instead of an email: the sign-in page shows an Email / WhatsApp switch once Twilio is configured. A new number creates an account with no email (the person can add one later). Signed-in users can save and verify their number on **My profile** (`/account/profile`); only a verified number can sign in.

1. Create a Twilio account. In the console go to **Messaging > Try it out > Send a WhatsApp message** (the sandbox).
2. Join the sandbox from your phone: send the shown `join <word>` message to the sandbox number. Each tester must do this once (the sandbox only reaches phones that joined).
3. In Render > your service > **Environment**, set:

   | Name | Value |
   |---|---|
   | `TWILIO_ACCOUNT_SID` | `AC…` from the Twilio console home page |
   | `TWILIO_AUTH_TOKEN` | the auth token next to it |
   | `TWILIO_WHATSAPP_FROM` | `whatsapp:+14155238886` (the sandbox number shown in step 1) |

   Save; Render redeploys. `/api/v1/auth/config` then lists `WHATSAPP` under `otpChannels`.
4. **For real users** the sandbox is not enough. Register a WhatsApp sender in Twilio (needs a Meta business account), create an **authentication** message template (Content Template Builder), wait for approval, then set `TWILIO_WHATSAPP_FROM` to your number and `TWILIO_CONTENT_SID` to the template's `HX…` id. Without an approved template WhatsApp refuses business-initiated messages.
5. Each code message is billed by Twilio and WhatsApp. The API still allows one code per minute and five per hour per number.
6. If a code never arrives, the Render **Logs** show `Twilio WhatsApp send failed … (Twilio <code>: …)`. Code 63016 means the number has not joined the sandbox or the template is missing.

## Keeping the free API awake

`.github/workflows/keepalive.yml` pings `/api/v1/health` every 10 minutes (GitHub may delay runs a few minutes). Notes:
- It uses your repository's GitHub Actions minutes: unlimited for a public repo, but a private repo's free allowance (2,000 min/month) would not cover it.
- GitHub pauses scheduled workflows after 60 days without repository activity. Re-enable it in the Actions tab if that happens.
- If you rename the Render service, update the URL in that file. Delete the file when you move to paid hosting.

## Later: real users

- Email: set `MAIL_TRANSPORT=smtp` and `SMTP_URL` (Brevo, Amazon SES or similar) so sign-in codes are emailed.
- Domain: buy one, then use the VPS setup in `deploy/` for supplier subdomains and custom domains.
