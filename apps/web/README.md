# DIGI MART 360 · Website

The public marketplace, built with Next.js 15 (App Router) and rendered on the server so search engines see full pages. All data comes from the API in `apps/api`.

| URL | Page | Indexed by search engines |
|---|---|---|
| `/` | Homepage: categories, new products, category showcases, trusted suppliers, cities | Yes |
| `/c/<category>` | Category listing with filters, sorting, pagination, city chips | Yes |
| `/c/<category>?city=<City>` | City landing page, e.g. "Ball Valves in Ahmedabad" | Yes (own title and canonical) |
| `/c/<category>?<other filters>` | Filtered views | No (`noindex, follow`) |
| `/p/<product>` | Product page with specs, supplier card, more from supplier, related | Yes |
| `/store/<supplier>` | Supplier profile and catalogue (replaced by themed storefronts later) | Yes |
| `/search?q=` | Search results | No |
| `/sell` | How selling works | Yes |
| `/sitemap.xml`, `/robots.txt` | Generated from live data | — |

## Run it

```bash
cp .env.example .env.local      # set INTERNAL_API_KEY to the API's value
npm run dev -w @digimart/web     # http://localhost:3001 (start the API first: npm run dev:api)
npm run build -w @digimart/web && npm run start -w @digimart/web
```

## SEO

- **Titles and descriptions** per page: category pages use the API's `seoTitle`/`seoDescription`; product titles include the price ("… at ₹2,500/Piece").
- **Canonical URLs** on every page. Only clean category URLs, city variants and page numbers are indexable; other filter combinations, search and out-of-range pages are not (no thin or duplicate pages).
- **Structured data (JSON-LD):** `Product` with `Offer`/`AggregateOffer` in INR and specs; `BreadcrumbList`; `ItemList` on categories; `Organization` on suppliers; `WebSite` + `SearchAction` on the homepage. Supplier ratings are not put on products, per Google's rules.
- **Crawlable filters:** every filter, city chip, sort and page is a normal link or GET form, so it works without JavaScript too.
- **Robots:** `robots.txt` blocks everything unless `ALLOW_INDEXING=true`, so staging never gets indexed. Set it only in production.

## How it fetches data

- `src/lib/api.ts` calls the API from the server with `X-Internal-Key`, so per-IP rate limits apply to visitors, not to this server. Responses are cached for 1–5 minutes.
- Pages render on each request (`dynamic = 'force-dynamic'`), so builds don't need the API and pages stay fresh without rebuilding.
- The only browser-to-API call is search suggestions (`NEXT_PUBLIC_API_URL`).

## Accessibility

Text and button colours meet WCAG AA contrast (4.5:1). The search box is an ARIA combobox with keyboard navigation; menus and dialogs close with Escape and return focus; there is a "Skip to content" link; filters collapse on phones without JavaScript.

## Not yet connected

- **Get Best Price / Send Inquiry / Post Requirement** open the requirement form, but sending is switched on with the RFQ API (next phases). The form says so.
- Product photos: suppliers can't upload yet, so pages show line drawings by product type.
- Sign-in and the supplier dashboard come with the supplier-dashboard phase.
