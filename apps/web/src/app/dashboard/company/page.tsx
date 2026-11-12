import type { Metadata } from 'next';
import { CompanyForm } from '@/components/dash/CompanyForm';
import { dash } from '@/lib/dash';

export const metadata: Metadata = { title: 'Company profile' };

export default async function CompanyPage() {
  const company = await dash.company();
  return (
    <>
      <div className="sec-head"><h1 style={{ fontSize: 24, color: 'var(--navy)' }}>{company ? 'Company profile' : 'Create your company'}</h1></div>
      <CompanyForm company={company} />
    </>
  );
}
