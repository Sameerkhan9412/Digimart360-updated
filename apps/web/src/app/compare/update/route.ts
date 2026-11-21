import { NextRequest, NextResponse } from 'next/server';
import { COMPARE_COOKIE, MAX_COMPARE, parseSlugs } from '@/lib/compare';
import { safeNext } from '@/lib/session-shared';

/**
 * Add, remove or clear products in the comparison. Plain form posts, so the buttons work without JavaScript
 * and nothing changes just because a link was prefetched.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const op = String(form.get('op') ?? '');
  const slug = parseSlugs(String(form.get('slug') ?? ''))[0];
  let list = parseSlugs(req.cookies.get(COMPARE_COOKIE)?.value);
  // Starting from a shared link (?p=...) keeps what that page showed.
  const from = form.get('from');
  if (typeof from === 'string' && from) list = parseSlugs(from);

  let full = false;
  if (op === 'add' && slug && !list.includes(slug)) {
    if (list.length >= MAX_COMPARE) full = true;
    else list = [...list, slug];
  } else if (op === 'remove' && slug) list = list.filter((s) => s !== slug);
  else if (op === 'clear') list = [];

  const back = form.get('back');
  const to = op === 'add' || typeof back !== 'string' ? '/compare' + (full ? '?full=1' : '') : safeNext(back, '/compare');
  const res = NextResponse.redirect(new URL(to, req.url), 303);
  res.cookies.set({ name: COMPARE_COOKIE, value: list.join(','), path: '/', maxAge: 30 * 24 * 3600, sameSite: 'lax', secure: req.nextUrl.protocol === 'https:' });
  return res;
}
