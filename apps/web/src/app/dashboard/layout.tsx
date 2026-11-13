import type { Metadata } from 'next';
import Link from 'next/link';
import { signOut } from '../signin/actions';

export const metadata: Metadata = { title: { default: 'Supplier dashboard', template: '%s | Supplier dashboard' }, robots: { index: false, follow: false } };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dash">
      <nav className="dnav panel" aria-label="Supplier dashboard">
        <Link href="/dashboard">Overview</Link>
        <Link href="/dashboard/rfqs">Requirements</Link>
        <Link href="/dashboard/products/new">Add product</Link>
        <Link href="/dashboard/company">Company profile</Link>
        <form action={signOut}><button type="submit">Sign out</button></form>
      </nav>
      <div className="dbody">{children}</div>
    </div>
  );
}
