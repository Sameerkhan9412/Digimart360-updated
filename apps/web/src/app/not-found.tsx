import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="errorbox panel">
      <h1>We couldn&apos;t find that page</h1>
      <p>The product may have been removed by the supplier, or the link is mistyped. Try searching, or browse the categories above.</p>
      <Link className="btn btn-green" href="/">Go to the homepage</Link>
    </section>
  );
}
