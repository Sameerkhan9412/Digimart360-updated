import Link from 'next/link';
import { setSaved } from '@/app/account/actions';

/** "Save supplier" / "Saved" for a supplier page. Signed-out visitors are sent to sign in and brought back. */
export function SaveSupplier({ companyId, name, next, state }: { companyId: string; name: string; next: string; state: 'signed-out' | 'saved' | 'unsaved' }) {
  if (state === 'signed-out') {
    return (
      <Link className="btn btn-line" href={`/signin?next=${encodeURIComponent(next)}`}>
        ☆ Save supplier
      </Link>
    );
  }
  const saved = state === 'saved';
  return (
    <form action={setSaved.bind(null, companyId, !saved)}>
      <button type="submit" className="btn btn-line" aria-pressed={saved} aria-label={saved ? `Remove ${name} from saved suppliers` : `Save ${name}`}>
        <span aria-hidden="true">{saved ? '★' : '☆'}</span> {saved ? 'Saved' : 'Save supplier'}
      </button>
    </form>
  );
}
