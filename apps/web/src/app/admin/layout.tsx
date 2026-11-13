import type { Metadata } from 'next';
import Link from 'next/link';
import { signOut } from '../signin/actions';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s | Admin' }, robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dash">
      <nav className="dnav panel" aria-label="Admin">
        <Link href="/admin?tab=companies">Companies</Link>
        <Link href="/admin?tab=products">Products</Link>
        <form action={signOut}><button type="submit">Sign out</button></form>
      </nav>
      <div className="dbody">{children}</div>
    </div>
  );
}
