import type { Metadata } from 'next';
import { RfqForm } from '@/components/dash/RfqForm';
import { api } from '@/lib/api';

export const metadata: Metadata = { title: 'Post a requirement', robots: { index: false, follow: false } };

export default async function NewRfq({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const categories = await api.categories();
  return (
    <section className="band">
      <div className="sec-head">
        <div>
          <h1 style={{ fontSize: 24, color: 'var(--navy)' }}>Post your requirement</h1>
          <p>Tell us what you need. Matching verified suppliers send you quotes, and you compare them side by side.</p>
        </div>
      </div>
      <RfqForm
        categories={categories}
        supplier={q.supplier}
        defaults={{ title: q.title, categoryId: q.category, productId: q.product, companyId: q.company }}
      />
    </section>
  );
}
