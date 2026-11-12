import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductForm } from '@/components/dash/ProductForm';
import { api } from '@/lib/api';
import { dash } from '@/lib/dash';

export const metadata: Metadata = { title: 'Add product' };

export default async function NewProduct() {
  const [company, categories] = await Promise.all([dash.company(), api.categories()]);
  if (!company) {
    return (
      <section className="panel dcard">
        <h1>Create your company first</h1>
        <p>Products belong to a company profile.</p>
        <p><Link className="btn btn-orange" href="/dashboard/company">Create company profile</Link></p>
      </section>
    );
  }
  return (
    <>
      <div className="sec-head"><h1 style={{ fontSize: 24, color: 'var(--navy)' }}>Add a product</h1></div>
      <ProductForm categories={categories} trusted={company.trustSeal} />
    </>
  );
}
