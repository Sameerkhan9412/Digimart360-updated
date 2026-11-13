import type { Metadata } from 'next';
import Link from 'next/link';
import { RfqStatusPill } from '@/components/dash/bits';
import { rfqs } from '@/lib/dash';
import { dateLabel, inr, timeLeft } from '@/lib/format';

export const metadata: Metadata = { title: 'My requirements' };

export default async function MyRfqs() {
  const list = await rfqs.mine();
  return (
    <>
      <div className="sec-head">
        <h1 style={{ fontSize: 24, color: 'var(--navy)' }}>My requirements</h1>
        <Link className="btn btn-orange" href="/rfq/new">+ Post requirement</Link>
      </div>
      {list.length === 0 ? (
        <div className="panel dcard"><p>You have not posted a requirement yet. Tell suppliers what you need and compare their quotes.</p></div>
      ) : (
        <ul className="plist">
          {list.map((r) => (
            <li key={r.id} className="panel rrow">
              <div className="pmain">
                <Link href={`/account/rfqs/${r.id}`}><b>{r.title}</b></Link>
                <span className="muted">
                  {r.number} · {r.quantity.toLocaleString('en-IN')} {r.unit} · {r.city}
                  {r.budget != null && ` · Budget ${inr(r.budget)}`} · Posted {dateLabel(r.createdAt)}
                </span>
              </div>
              <span className="muted">{r.status === 'OPEN' ? timeLeft(r.closesAt) : ''}</span>
              <span className="muted num">{r.quoteCount} {r.quoteCount === 1 ? 'quote' : 'quotes'}</span>
              <RfqStatusPill status={r.status} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
