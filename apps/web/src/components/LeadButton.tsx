import Link from 'next/link';

/**
 * "Get Best Price" / "Send Inquiry" / "Post Requirement": opens the requirement form,
 * pre-filled with whatever the page knows (product, category, supplier).
 */
export function LeadButton({
  label,
  product,
  productId,
  categoryId,
  companyId,
  supplier,
  className = 'btn btn-orange',
  title,
}: {
  label: string;
  /** Product or topic name, used as the requirement's title. */
  product?: string;
  productId?: string;
  categoryId?: string;
  companyId?: string;
  supplier?: string;
  className?: string;
  title?: string;
}) {
  const qs = new URLSearchParams();
  if (product) qs.set('title', product);
  if (productId) qs.set('product', productId);
  if (categoryId) qs.set('category', categoryId);
  if (companyId) qs.set('company', companyId);
  if (supplier) qs.set('supplier', supplier);
  const q = qs.toString();
  return (
    <Link href={`/rfq/new${q ? `?${q}` : ''}`} className={className} title={title}>
      {label}
    </Link>
  );
}
