import type { Metadata } from 'next';
import Link from 'next/link';
import { RankedBars, StageBars, StatTile } from '@/components/dash/analytics-bits';
import { ViewsChart } from '@/components/dash/ViewsChart';
import { dash } from '@/lib/dash';

export const metadata: Metadata = { title: 'Analytics' };

const PERIODS = [7, 30, 90] as const;

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const asked = Number((await searchParams).days);
  const days = (PERIODS as readonly number[]).includes(asked) ? asked : 30;

  const company = await dash.company();
  if (!company) {
    return (
      <>
        <div className="sec-head"><h1 style={{ fontSize: 24, color: 'var(--navy)' }}>Analytics</h1></div>
        <div className="panel" style={{ padding: 20 }}>
          <p>Create your company profile first. Once your products are live, you will see here how many people look at them.</p>
          <Link className="btn btn-orange" href="/dashboard/company">Create your company</Link>
        </div>
      </>
    );
  }

  const r = await dash.analytics(days);
  const empty = r.productViews.value + r.profileViews.value + r.siteViews.value === 0;

  return (
    <div className="viz-root">
      <div className="sec-head"><h1 style={{ fontSize: 24, color: 'var(--navy)' }}>Analytics</h1></div>

      <nav className="viz-filter" aria-label="Period">
        {PERIODS.map((p) => (
          <Link key={p} href={`/dashboard/analytics?days=${p}`} aria-current={p === days ? 'true' : undefined}>
            {p === days && <span aria-hidden="true">✓ </span>}Last {p} days
          </Link>
        ))}
      </nav>

      {company.status !== 'ACTIVE' && (
        <p className="notice" role="status">Views are counted once our team approves your company. Until then these numbers stay at zero.</p>
      )}

      <div className="viz-tiles">
        <StatTile label="Product views" metric={r.productViews} series={r.series.map((d) => d.productViews)} color="var(--viz-1)" days={days} />
        <StatTile label="Supplier page views" metric={r.profileViews} series={r.series.map((d) => d.profileViews)} color="var(--viz-2)" days={days} />
        <StatTile label="Website views" metric={r.siteViews} series={r.series.map((d) => d.siteViews)} color="var(--viz-3)" days={days} />
      </div>

      <section className="panel viz-card" aria-labelledby="views-h">
        <h2 id="views-h">Views per day</h2>
        {empty ? (
          <p className="muted">No views in the last {days} days yet. They appear here once visitors open your products, your supplier page or your website.</p>
        ) : (
          <ViewsChart series={r.series} />
        )}
      </section>

      <div className="viz-two">
        <section className="panel viz-card" aria-labelledby="top-h">
          <h2 id="top-h">Most viewed products</h2>
          {r.topProducts.length ? (
            <RankedBars rows={r.topProducts.map((p) => ({ id: p.id, name: p.name, href: `/p/${p.slug}`, value: p.views }))} />
          ) : (
            <p className="muted">No product has been viewed in this period.</p>
          )}
        </section>

        <section className="panel viz-card" aria-labelledby="rfq-h">
          <h2 id="rfq-h">Requirements</h2>
          <StageBars
            stages={[
              { label: 'Matched to you', hint: 'buyers asking for what you sell', value: r.rfq.invited },
              { label: 'Opened by you', hint: '', value: r.rfq.opened },
              { label: 'Quotes you sent', hint: '', value: r.rfq.quoted },
              { label: 'Quotes chosen', hint: 'the buyer picked you', value: r.rfq.won },
            ]}
          />
          <p className="muted">
            {r.rfq.invited > 0
              ? `You opened ${Math.round((r.rfq.opened / r.rfq.invited) * 100)}% of the requirements matched to you.`
              : 'Requirements appear here when buyers post something in your categories.'}{' '}
            <Link href="/dashboard/rfqs">Open requirements</Link>
          </p>
        </section>
      </div>

      <p className="muted viz-note">
        A visitor who opens the same page again within 30 minutes counts once. Search engines, link previews and monitoring tools are not counted. Visits by you and your team are, so a few views may be your own.
      </p>
    </div>
  );
}
