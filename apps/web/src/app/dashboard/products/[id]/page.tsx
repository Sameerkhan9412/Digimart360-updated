import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductForm } from '@/components/dash/ProductForm';
import { api } from '@/lib/api';
import { dash } from '@/lib/dash';

export const metadata: Metadata = { title: 'Edit product' };

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [company, product, categories] = await Promise.all([dash.company(), dash.product(id), api.categories()]);
  if (!company || !product) notFound();
  return (
    <>
      <div className="sec-head"><h1 style={{ fontSize: 24, color: 'var(--navy)' }}>Edit product</h1></div>
      <ProductForm product={product} categories={categories} trusted={company.trustSeal} />
    </>
  );
}
