import type { Metadata } from 'next';
import Link from 'next/link';
import { DomainPanel } from '@/components/dash/DomainPanel';
import { WebsiteForm } from '@/components/dash/WebsiteForm';
import { dash, site } from '@/lib/dash';
import { ROOT_DOMAIN, siteUrl } from '@/lib/seo';

export const metadata: Metadata = { title: 'My website' };

export default async function Website() {
  const company = await dash.company();
  if (!company) {
    return (
      <section className="panel dcard">
        <h1>My website</h1>
        <p>Create your company profile first. Your own website is built from it.</p>
        <p><Link className="btn btn-orange" href="/dashboard/company">Create company profile</Link></p>
      </section>
    );
  }
  if (company.status !== 'ACTIVE') {
    return (
      <section className="panel dcard">
        <h1>My website</h1>
        <p>Your website goes live once our team approves your company.</p>
      </section>
    );
  }

  const [settings, domain] = await Promise.all([site.settings(), site.domain()]);
  const free = `${company.slug}.${ROOT_DOMAIN}`;
  const live = domain?.status === 'ACTIVE' ? domain.host : free;

  return (
    <>
      <div className="sec-head">
        <div>
          <h1 style={{ fontSize: 24, color: 'var(--navy)' }}>My website</h1>
          <p>Your own website with your products. Address: <a className="link-more" href={siteUrl(live)}>{live}</a></p>
        </div>
        <a className="btn btn-line" href={siteUrl(live)} target="_blank" rel="noopener">View website</a>
      </div>
      <WebsiteForm settings={settings} />
      <DomainPanel domain={domain} />
    </>
  );
}
