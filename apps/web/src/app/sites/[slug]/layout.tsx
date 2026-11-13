import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import './site.css';

const FONTS =
  'https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&family=Source+Sans+3:wght@400;600;700&family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500;700' +
  '&family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600&family=Cormorant+Garamond:wght@500;600;700&family=Mulish:wght@400;600;700&display=swap';

/** Supplier websites are only served on the supplier's own host (middleware sets the header), never at /sites/... on the marketplace. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  if (!(await headers()).get('x-site-slug')) notFound();
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={FONTS} />
      {children}
    </>
  );
}
