/**
 * The visitor's address as our host (Vercel, Caddy) saw it. Both overwrite these headers
 * rather than trusting the browser's copy. Edge-safe: no Node imports, so middleware can use it too.
 * The API only believes it together with the secret internal key, and checks that it is an IP.
 */
export function clientIpFrom(h: Pick<Headers, 'get'>): string | undefined {
  const ip = (h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0] ?? '').trim();
  return ip || undefined;
}

/** Headers for a call to the API on a visitor's behalf, so rate limits apply per visitor. */
export function internalHeaders(h: Pick<Headers, 'get'>): Record<string, string> {
  const ip = clientIpFrom(h);
  return { 'X-Internal-Key': process.env.INTERNAL_API_KEY ?? '', ...(ip && { 'X-Client-IP': ip }) };
}
