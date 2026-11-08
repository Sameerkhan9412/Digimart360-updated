import { randomBytes } from 'node:crypto';

/** "2\" SS304 Flanged Ball Valve, Class 150" → "2-ss304-flanged-ball-valve-class-150" */
export function slugify(text: string, maxLength = 70): string {
  const s = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return (s.slice(0, maxLength).replace(/-+$/, '') || 'item');
}

/** Short random suffix that keeps product URLs unique without a database round-trip. */
export function shortId(length = 5): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export function productSlug(name: string): string {
  return `${slugify(name, 60)}-${shortId()}`;
}
