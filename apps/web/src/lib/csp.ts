/**
 * Content-Security-Policy for the website. Edge-safe (middleware imports it).
 *
 * Scripts: only our own bundle and scripts carrying this response's random nonce (Next adds the nonce
 * to its own scripts when the policy is in the request headers). 'strict-dynamic' lets those scripts
 * load their own chunks. Anything injected into a page cannot run.
 * Styles keep 'unsafe-inline' because React and the supplier themes use style attributes.
 * Images may come from any https address because suppliers link their own product photos.
 */
export function buildCsp(nonce: string, opts: { dev?: boolean; apiOrigin?: string; https?: boolean } = {}): string {
  const dev = !!opts.dev;
  const connect = ["'self'", opts.apiOrigin, dev ? 'ws:' : undefined].filter(Boolean).join(' ');
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // supplier themes load Google Fonts CSS
    `img-src 'self' data: blob: https:${dev ? ' http:' : ''}`,
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src ${connect}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    // Only on https: over plain http (a local build) it would turn the site's own redirects into https and break them.
    ...(opts.https && !dev ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

/** Origin (scheme + host) of an API URL, or undefined if it is not a valid URL. */
export function originOf(url: string | undefined): string | undefined {
  try {
    return url ? new URL(url).origin : undefined;
  } catch {
    return undefined;
  }
}
