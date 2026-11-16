import type { Metadata } from 'next';
import { ProfileForm } from '@/components/dash/ProfileForm';
import { api } from '@/lib/api';
import { dash } from '@/lib/dash';

export const metadata: Metadata = { title: 'My profile' };

export default async function ProfilePage() {
  const [me, whatsapp] = await Promise.all([
    dash.me(),
    // If the API cannot say, treat WhatsApp as unavailable rather than breaking the page.
    api.authConfig().then((c) => c.otpChannels.includes('WHATSAPP')).catch(() => false),
  ]);
  return (
    <>
      <div className="sec-head"><h1 style={{ fontSize: 24, color: 'var(--navy)' }}>My profile</h1></div>
      <ProfileForm me={me} whatsapp={whatsapp} />
    </>
  );
}
