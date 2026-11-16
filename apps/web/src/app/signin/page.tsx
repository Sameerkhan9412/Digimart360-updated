import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SignInForm } from '@/components/dash/SignInForm';
import { api } from '@/lib/api';
import { isSignedIn } from '@/lib/dash';
import { safeNext } from '@/lib/session-shared';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false, follow: false } };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await isSignedIn()) redirect(next);
  const buyer = /^\/(rfq|account)\b/.test(next);
  // If the API is unreachable, fall back to email only rather than breaking the page.
  const whatsapp = await api.authConfig().then((c) => c.otpChannels.includes('WHATSAPP')).catch(() => false);
  return (
    <section className="band panel auth">
      <h1>{buyer ? 'Sign in to post your requirement' : 'Sign in to sell on DIGI MART 360'}</h1>
      <p>No password needed. We send you a one-time code{whatsapp ? ' by email or WhatsApp' : ' by email'}. New here? The same code creates your account.</p>
      <SignInForm next={next} role={buyer ? 'BUYER' : 'SUPPLIER'} whatsapp={whatsapp} />
    </section>
  );
}
