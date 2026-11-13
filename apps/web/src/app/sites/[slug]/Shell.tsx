import type { CSSProperties, ReactNode } from 'react';
import { monogram } from '@/lib/format';
import { SITE_URL } from '@/lib/seo';
import type { CompanyProfile, PublicStorefront } from '@/lib/types';

/** Pick readable text for a supplier's brand colour. */
function inkOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return lum > 0.6 ? '#111111' : '#ffffff';
}

/** Link to the requirement form on the marketplace (sign-in cookies don't carry over to supplier domains). */
export function quoteUrl(c: CompanyProfile, extra: Record<string, string> = {}): string {
  const qs = new URLSearchParams({ company: c.id, supplier: c.name, ...extra });
  return `${SITE_URL}/rfq/new?${qs}`;
}

/** Header, theme and footer shared by every page of a supplier's website. */
export function Shell({ c, s, children }: { c: CompanyProfile; s: PublicStorefront; children: ReactNode }) {
  const style: CSSProperties & Record<string, string> = s.accent ? { '--brand': s.accent, '--brand-ink': inkOn(s.accent) } : {};
  const nav = [
    s.showAbout && ['About', '/#about'],
    s.showProducts && ['Products', '/products'],
    s.showCertificates && s.certificates.length > 0 && ['Certificates', '/#certificates'],
    s.showContact && ['Contact', '/#contact'],
  ].filter(Boolean) as [string, string][];

  return (
    <div className="sf" data-theme={s.theme} style={style}>
      <header className="sf-head">
        <div className="sf-wrap">
          <a className="sf-brand" href="/">
            {c.logoUrl ? <img src={c.logoUrl} alt="" /> : <span className="sf-mono" aria-hidden="true">{monogram(c.name)}</span>}
            <span>{c.name}</span>
          </a>
          <nav className="sf-nav" aria-label="Sections">
            {nav.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
            <a className="sf-btn" href={quoteUrl(c)}>Get a quote</a>
          </nav>
        </div>
      </header>
      <main id="top">{children}</main>
      <footer className="sf-foot">
        <div className="sf-wrap">
          <span>© {new Date().getFullYear()} {c.name}</span>
          <span>Verified on <a href={`${SITE_URL}/store/${c.slug}`}>DIGI MART 360</a></span>
        </div>
      </footer>
    </div>
  );
}
