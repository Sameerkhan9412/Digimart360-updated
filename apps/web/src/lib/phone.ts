/** "98220 12345" and "+91 98220 12345" both become +919822012345; other countries need their +code. */
export function toE164(input: string): string | null {
  const s = input.replace(/[\s().-]/g, '');
  if (/^\+[1-9]\d{7,14}$/.test(s)) return s;
  if (/^[6-9]\d{9}$/.test(s)) return '+91' + s;
  if (/^0[6-9]\d{9}$/.test(s)) return '+91' + s.slice(1);
  return null;
}
