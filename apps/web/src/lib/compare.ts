/** The shortlist of products being compared is kept in a cookie, so it works without signing in. */
export const COMPARE_COOKIE = 'dm_cmp';
export const MAX_COMPARE = 4;
const SLUG = /^[a-z0-9][a-z0-9-]{0,119}$/;

/** Clean list from a cookie or a link: valid slugs only, no repeats, at most four. */
export function parseSlugs(raw: string | null | undefined): string[] {
  const out: string[] = [];
  for (const s of (raw ?? '').split(',')) {
    const slug = s.trim();
    if (SLUG.test(slug) && !out.includes(slug)) out.push(slug);
    if (out.length === MAX_COMPARE) break;
  }
  return out;
}

export const compareHref = (slugs: string[]) => (slugs.length ? `/compare?p=${slugs.join(',')}` : '/compare');
