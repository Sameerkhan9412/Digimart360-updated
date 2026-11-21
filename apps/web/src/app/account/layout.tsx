import type { Metadata } from 'next';
import Link from 'next/link';
import { signOut } from '../signin/actions';

export const metadata: Metadata = { title: { default: 'My requirements', template: '%s | DIGI MART 360' }, robots: { index: false, follow: false } };

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dash">
      <nav className="dnav panel" aria-label="My account">
        <Link href="/account/rfqs">My requirements</Link>
        <Link href="/account/saved">Saved suppliers</Link>
        <Link href="/rfq/new">Post requirement</Link>
        <Link href="/account/profile">My profile</Link>
        <Link href="/dashboard">Sell on DIGI MART</Link>
        <form action={signOut}><button type="submit">Sign out</button></form>
      </nav>
      <div className="dbody">{children}</div>
    </div>
  );
}
