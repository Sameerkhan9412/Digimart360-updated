import type { Metadata } from 'next';
import Link from 'next/link';
import { setSaved } from '../actions';
import { Monogram, TrustBadges } from '@/components/bits';
import { LeadButton } from '@/components/LeadButton';
import { saved } from '@/lib/dash';
import { storePath } from '@/lib/seo';

export const metadata: Metadata = { title: 'Saved suppliers' };

export default async function SavedSuppliers() {
  const list = await saved.list();
  return (
    <>
      <div className="sec-head">
        <h1 style={{ fontSize: 24, color: 'var(--navy)' }}>Saved suppliers</h1>
        <Link className="btn btn-line" href="/search">Find suppliers</Link>
      </div>
      {list.length === 0 ? (
        <div className="panel dcard">
          <p>You have not saved any supplier yet. Open a supplier&apos;s page and choose “Save supplier” to keep it here.</p>
        </div>
      ) : (
        <ul className="plist">
          {list.map((c) => (
            <li key={c.id} className="panel srow">
              <Monogram name={c.name} />
              <div className="pmain">
                <Link href={storePath(c.slug)}><b>{c.name}</b></Link>
                <span className="muted">{c.city}, {c.state}</span>
                <TrustBadges c={c} />
              </div>
              <div className="srow-act">
                <LeadButton label="Contact" companyId={c.id} supplier={c.name} className="btn btn-orange" title={`Send your requirement to ${c.name}`} />
                <form action={setSaved.bind(null, c.id, false)}>
                  <button type="submit" className="btn btn-line" aria-label={`Remove ${c.name} from saved suppliers`}>Remove</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
