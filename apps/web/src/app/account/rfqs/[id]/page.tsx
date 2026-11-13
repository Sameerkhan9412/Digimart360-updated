import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Monogram, TrustBadges } from '@/components/bits';
import { RfqStatusPill } from '@/components/dash/bits';
import { rfqs } from '@/lib/dash';
import { dateLabel, inr, timeLeft } from '@/lib/format';
import { storePath } from '@/lib/seo';
import type { BuyerQuote } from '@/lib/types';
import { awardQuote, closeRfq } from '../../actions';

export const metadata: Metadata = { title: 'Requirement' };

export default async function RfqDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ posted?: string }>;
}) {
  const [{ id }, { posted }] = await Promise.all([params, searchParams]);
  const r = await rfqs.get(id);
  if (!r) notFound();
  const open = r.status === 'OPEN';

  return (
    <>
      <div className="sec-head">
        <div>
          <p className="muted">{r.number}</p>
          <h1 style={{ fontSize: 24, color: 'var(--navy)' }}>{r.title}</h1>
          <p>
            {r.quantity.toLocaleString('en-IN')} {r.unit} · deliver to {r.city}, {r.state}
            {r.budget != null && ` · budget ${inr(r.budget)}`} · {r.category.name}
          </p>
        </div>
        <div className="pact">
          <RfqStatusPill status={r.status} />
          {open && (
            <form action={closeRfq.bind(null, r.id)}><button className="btn btn-line btn-sm">Close without choosing</button></form>
          )}
        </div>
      </div>

      {posted && (
        <p className="notice ok" role="status">
          Posted. We told {r.invitedCount} matching {r.invitedCount === 1 ? 'supplier' : 'suppliers'} by email. Quotes will appear here as they arrive.
        </p>
      )}
      {r.description && <p className="panel dcard" style={{ whiteSpace: 'pre-wrap' }}>{r.description}</p>}

      {r.awardedContact && (
        <section className="panel dcard" aria-labelledby="won">
          <h2 id="won" style={{ fontSize: 17, color: 'var(--navy)' }}>You chose {r.awardedContact.name}</h2>
          <p>Contact them directly to confirm the order.</p>
          <ul className="ticks">
            {r.awardedContact.phone && <li>Phone: <a href={`tel:${r.awardedContact.phone}`}>{r.awardedContact.phone}</a></li>}
            {r.awardedContact.email && <li>Email: <a href={`mailto:${r.awardedContact.email}`}>{r.awardedContact.email}</a></li>}
          </ul>
        </section>
      )}

      <section aria-labelledby="q">
        <div className="sec-head">
          <h2 id="q" style={{ fontSize: 18, color: 'var(--navy)' }}>
            Quotes ({r.quotes.length}) <small className="muted">· invited {r.invitedCount} suppliers{open && ` · ${timeLeft(r.closesAt)}`}</small>
          </h2>
        </div>
        {r.quotes.length === 0 ? (
          <div className="panel dcard"><p>{open ? 'No quotes yet. Suppliers usually reply within a day.' : 'No quotes were received.'}</p></div>
        ) : (
          <div className="qgrid">
            {r.quotes.map((q) => <QuoteCard key={q.id} q={q} rfqId={r.id} unit={r.unit} canAward={open} />)}
          </div>
        )}
      </section>
      <p><Link className="link-more" href="/account/rfqs">← All my requirements</Link></p>
    </>
  );
}

function QuoteCard({ q, rfqId, unit, canAward }: { q: BuyerQuote; rfqId: string; unit: string; canAward: boolean }) {
  const rows: [string, string | null][] = [
    ['Delivery', `${q.deliveryDays} ${q.deliveryDays === 1 ? 'day' : 'days'}`],
    ['Material', q.material],
    ['Warranty', q.warranty],
    ['Payment', q.paymentTerms],
    ['Certificates', q.certificates],
    ['Valid until', q.validUntil ? dateLabel(q.validUntil) : null],
  ];
  return (
    <article className={`panel qcard${q.status === 'AWARDED' ? ' won' : ''}`}>
      <header>
        <Monogram name={q.company.name} />
        <div>
          <b><Link href={storePath(q.company.slug)}>{q.company.name}</Link></b>
          <span className="muted">{q.company.city}, {q.company.state}</span>
        </div>
      </header>
      <TrustBadges c={q.company} />
      <p className="qprice num">{inr(q.unitPrice)} <small>/ {unit}</small></p>
      <p className="muted num">
        Total {inr(q.total)}
        {q.withinBudget === true && ' · within budget'}
        {q.withinBudget === false && ' · over budget'}
      </p>
      <div className="badges">
        {q.isLowestPrice && <span className="bdg trust">Lowest price</span>}
        {q.isFastest && <span className="bdg gst">Fastest delivery</span>}
        {q.revision > 1 && <span className="bdg yrs">Revised</span>}
      </div>
      <dl className="qrows">
        {rows.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
      {q.note && <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>{q.note}</p>}
      {canAward && q.status === 'SUBMITTED' && (
        <form action={awardQuote.bind(null, rfqId, q.id)}><button className="btn btn-green btn-block">Choose this supplier</button></form>
      )}
      {q.status === 'AWARDED' && <p className="bdg trust">✓ Chosen</p>}
    </article>
  );
}
