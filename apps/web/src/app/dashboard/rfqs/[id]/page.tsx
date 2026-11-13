import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { QuoteForm } from '@/components/dash/QuoteForm';
import { QuoteStatusPill, RfqStatusPill } from '@/components/dash/bits';
import { rfqs } from '@/lib/dash';
import { inr, timeLeft } from '@/lib/format';

export const metadata: Metadata = { title: 'Requirement' };

export default async function InboxItem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await rfqs.inboxItem(id);
  if (!r) notFound();
  const open = r.status === 'OPEN';
  const locked = r.myQuote?.status === 'AWARDED' || r.myQuote?.status === 'NOT_SELECTED';

  return (
    <>
      <div className="sec-head">
        <div>
          <p className="muted">{r.number}</p>
          <h1 style={{ fontSize: 24, color: 'var(--navy)' }}>{r.title}</h1>
          <p>
            {r.quantity.toLocaleString('en-IN')} {r.unit} · deliver to {r.buyerLocation}
            {r.budget != null && ` · budget ${inr(r.budget)}`} · {r.category.name}
          </p>
        </div>
        <div className="pact">
          {r.myQuote ? <QuoteStatusPill status={r.myQuote.status} /> : <RfqStatusPill status={r.status} />}
          {open && <span className="muted">{timeLeft(r.closesAt)}</span>}
        </div>
      </div>

      {r.description && <p className="panel dcard" style={{ whiteSpace: 'pre-wrap' }}>{r.description}</p>}
      <p className="muted">{r.quoteCount} {r.quoteCount === 1 ? 'supplier has' : 'suppliers have'} quoted so far. Other suppliers&apos; prices are not shown.</p>

      {r.buyerContact && (
        <section className="panel dcard" aria-labelledby="won">
          <h2 id="won" style={{ fontSize: 17, color: 'var(--navy)' }}>You won this order 🎉</h2>
          <p>Contact the buyer to confirm the order.</p>
          <ul className="ticks">
            <li>{r.buyerContact.name}</li>
            {r.buyerContact.phone && <li>Phone: <a href={`tel:${r.buyerContact.phone}`}>{r.buyerContact.phone}</a></li>}
            {r.buyerContact.email && <li>Email: <a href={`mailto:${r.buyerContact.email}`}>{r.buyerContact.email}</a></li>}
          </ul>
        </section>
      )}

      {open && !locked && <QuoteForm rfqId={r.id} unit={r.unit} quote={r.myQuote} />}
      {!open && !r.myQuote && <p className="notice" role="note">This requirement is no longer taking quotes.</p>}
      {locked && r.myQuote && (
        <p className="panel dcard">Your quote: <b className="num">{inr(r.myQuote.unitPrice)}</b> per {r.unit} · total {inr(r.myQuote.total)} · {r.myQuote.deliveryDays} days</p>
      )}
      <p><Link className="link-more" href="/dashboard/rfqs">← All requirements</Link></p>
    </>
  );
}
