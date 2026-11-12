import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sell on DIGI MART 360 · Free listing for Indian manufacturers',
  description:
    'List your products free, get buyer requirements, and get your own branded website on your own domain. For manufacturers, exporters and wholesalers.',
  alternates: { canonical: '/sell' },
};

export default function SellPage() {
  return (
    <>
      <section className="band sell panel" aria-labelledby="h">
        <div>
          <h1 id="h" style={{ fontSize: 'clamp(24px,3vw,32px)', color: 'var(--navy)' }}>Sell on DIGI MART 360</h1>
          <p>Your free listing reaches buyers across India and abroad. Every product also appears on your own branded website, on your own domain.</p>
          <p><Link className="btn btn-orange btn-lg" href="/signin">Sign in and start selling</Link></p>
        </div>
        <ol className="steps">
          <li><b>Sign in</b><span>With your email (one-time code) or Google account.</span></li>
          <li><b>Add your company</b><span>GSTIN, business type and location. We verify the GSTIN and show a badge.</span></li>
          <li><b>List products</b><span>Prices, MOQ and specs. Live on the marketplace and your own website.</span></li>
        </ol>
      </section>
      <section className="band panel" style={{ padding: 18 }} aria-labelledby="why">
        <div className="sec-head"><h2 id="why">What you get</h2></div>
        <ul className="ticks" style={{ fontSize: 14 }}>
          <li>Buyer requirements matched to your categories</li>
          <li>A &quot;GST verified&quot; badge, and &quot;DM Trusted&quot; after inspection: trusted suppliers&apos; products go live without review</li>
          <li>Your own website with four professional themes and your own domain, free HTTPS</li>
          <li>The same products on the marketplace and your site: edit once, update everywhere</li>
        </ul>
        <p style={{ marginTop: 14 }}><Link className="link-more" href="/">Browse the marketplace →</Link></p>
      </section>
    </>
  );
}
