import type { Metadata } from 'next';
import Link from 'next/link';
import { QuoteStatusPill, RfqStatusPill } from '@/components/dash/bits';
import { rfqs } from '@/lib/dash';
import { dateLabel, inr, timeLeft } from '@/lib/format';
import type { SupplierRfq } from '@/lib/types';

export const metadata: Metadata = { title: 'Requirements' };

export default async function Inbox() {
  const list = await rfqs.inbox();
  if (list === 'not-approved') {
    return (
      <section className="panel dcard">
        <h1>Requirements</h1>
        <p>Buyer requirements appear here once your company profile is created and approved by our team.</p>
        <p><Link className="btn btn-orange" href="/dashboard/company">Go to company profile</Link></p>
      </section>
    );
  }
  const open = list.filter((r) => r.status === 'OPEN' && r.myQuote?.status !== 'SUBMITTED');
  const rest = list.filter((r) => !open.includes(r));

  return (
    <>
      <div className="sec-head">
        <div>
          <h1 style={{ fontSize: 24, color: 'var(--navy)' }}>Requirements</h1>
          <p>Buyers looking for what you sell. Quote quickly: buyers usually pick from the first few replies.</p>
        </div>
      </div>
      <Section title={`Waiting for your quote (${open.length})`} list={open} empty="Nothing waiting right now. We email you when a matching requirement arrives." />
      {rest.length > 0 && <Section title="Your quotes and past requirements" list={rest} />}
    </>
  );
}

function Section({ title, list, empty }: { title: string; list: SupplierRfq[]; empty?: string }) {
  return (
    <section aria-label={title}>
      <h2 style={{ fontSize: 17, color: 'var(--navy)', margin: '6px 0 10px' }}>{title}</h2>
      {list.length === 0 ? (
        <div className="panel dcard"><p>{empty}</p></div>
      ) : (
        <ul className="plist">
          {list.map((r) => (
            <li key={r.id} className="panel rrow">
              <div className="pmain">
                <Link href={`/dashboard/rfqs/${r.id}`}><b>{r.title}</b></Link>
                <span className="muted">
                  {r.number} · {r.quantity.toLocaleString('en-IN')} {r.unit} · {r.buyerLocation}
                  {r.budget != null && ` · Budget ${inr(r.budget)}`} · {r.invited ? 'Sent to you' : 'Open in your categories'} · {dateLabel(r.createdAt)}
                </span>
              </div>
              <span className="muted">{r.status === 'OPEN' ? timeLeft(r.closesAt) : ''}</span>
              {r.myQuote ? <QuoteStatusPill status={r.myQuote.status} /> : <RfqStatusPill status={r.status} />}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
