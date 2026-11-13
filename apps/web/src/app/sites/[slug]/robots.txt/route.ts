/** Supplier websites follow the marketplace's indexing switch (off outside production). */
export function GET() {
  const body = process.env.ALLOW_INDEXING === 'true' ? 'User-agent: *\nAllow: /\n' : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
}
