import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import { LeadButton } from '@/components/LeadButton';
import { MegaMenu } from '@/components/MegaMenu';
import { SearchBox } from '@/components/SearchBox';
import { api } from '@/lib/api';
import { isSignedIn } from '@/lib/dash';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import type { CategoryNode } from '@/lib/types';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-jakarta', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} · India's verified B2B marketplace`, template: `%s | ${SITE_NAME}` },
  description:
    'Buy direct from GST-verified Indian manufacturers, exporters and wholesalers. Compare prices and MOQ, and get quotes from matched suppliers.',
  applicationName: SITE_NAME,
  openGraph: { type: 'website', siteName: SITE_NAME, locale: 'en_IN' },
  twitter: { card: 'summary_large_image' },
  formatDetection: { telephone: false },
};

/**
 * Render on each request; API responses are cached in Next's data cache for 1–5 minutes
 * (see lib/api.ts). Builds then don't need the API, and pages stay fresh without rebuilds.
 */
export const dynamic = 'force-dynamic';

export const viewport: Viewport = { themeColor: '#1A3C5E', width: 'device-width', initialScale: 1 };

/** The header still renders if the API is briefly unavailable. */
async function categoryTree(): Promise<CategoryNode[]> {
  try {
    return await api.categories();
  } catch {
    return [];
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [tree, signedIn] = await Promise.all([categoryTree(), isSignedIn()]);
  const quick = tree.flatMap((g) => g.children).sort((a, b) => b.productCount - a.productCount).slice(0, 9);

  return (
    <html lang="en-IN" className={jakarta.variable}>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <div className="util">
          <div className="wrap">
            <span>India&apos;s verified B2B marketplace · every supplier GST-checked</span>
            <nav aria-label="Utility">
              <Link href="/sell">Sell on DIGI MART</Link>
              {signedIn ? <Link href="/dashboard">My dashboard</Link> : <Link href="/signin">Supplier sign in</Link>}
            </nav>
          </div>
        </div>

        <header className="mh">
          <div className="wrap">
            <Link className="logo" href="/" aria-label={`${SITE_NAME} home`}>
              <Image src="/logo.png" alt={SITE_NAME} width={120} height={40} priority />
            </Link>
            <SearchBox />
            <div className="acts">
              <LeadButton label="Post Requirement" title="Tell us what you need" />
            </div>
          </div>
        </header>

        <nav className="catbar" aria-label="Categories">
          <div className="wrap">
            <MegaMenu tree={tree} />
            {quick.map((c) => (
              <Link key={c.id} href={`/c/${c.slug}`}>{c.name}</Link>
            ))}
          </div>
        </nav>

        <main id="main" className="wrap">{children}</main>

        <footer className="mf">
          <div className="wrap cols">
            <div className="brandcol">
              <Image src="/logo.png" alt={SITE_NAME} width={114} height={38} />
              <p>India&apos;s verified B2B marketplace connecting manufacturers, exporters and bulk buyers.</p>
            </div>
            <div>
              <h2>Top categories</h2>
              <ul>{tree.slice(0, 5).map((g) => <li key={g.id}><Link href={`/c/${g.slug}`}>{g.name}</Link></li>)}</ul>
            </div>
            <div>
              <h2>For suppliers</h2>
              <ul><li><Link href="/sell">Start selling</Link></li><li><Link href="/sell#why">Your own website</Link></li></ul>
            </div>
            <div>
              <h2>Marketplace</h2>
              <ul><li><Link href="/search?sort=newest">New products</Link></li><li><Link href="/search?trusted=1">DM Trusted suppliers</Link></li></ul>
            </div>
          </div>
          <div className="wrap legal">
            <span>© {new Date().getFullYear()} DIGI MART 360 Technologies Pvt Ltd</span>
            <span>Prices are indicative; confirm with the supplier before ordering.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
