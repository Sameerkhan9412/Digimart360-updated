import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SignInForm } from '@/components/dash/SignInForm';
import { isSignedIn } from '@/lib/dash';
import { safeNext } from '@/lib/session-shared';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false, follow: false } };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await isSignedIn()) redirect(next);
  const buyer = /^\/(rfq|account)/.test(next);
  return (
    <section className="band panel auth">
      <h1>{buyer ? 'Sign in to post your requirement' : 'Sign in to sell on DIGI MART 360'}</h1>
      <p>No password needed. We email you a one-time code. New here? The same code creates your account.</p>
      <SignInForm next={next} role={buyer ? 'BUYER' : 'SUPPLIER'} />
    </section>
  );
}
