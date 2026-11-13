import type { BusinessType, Price } from './types';

/** ₹2,500 · ₹38,000 · ₹2.4 lakh · ₹1.2 Cr (Indian grouping and units). */
export function inr(n: number): string {
  if (n >= 1_00_00_000) return `₹${trim(n / 1_00_00_000)} Cr`;
  if (n >= 1_00_000) return `₹${trim(n / 1_00_000)} lakh`;
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}
const trim = (x: number) => x.toFixed(x % 1 === 0 ? 0 : 1);

/** "₹1,150 – ₹6,800", "₹2,500" or null for "Ask for price". */
export function priceRange(p: Price): string | null {
  if (p.min == null && p.max == null) return null;
  const lo = p.min ?? p.max!;
  const hi = p.max ?? p.min!;
  return lo === hi ? inr(lo) : `${inr(lo)} – ${inr(hi)}`;
}

export function plural(n: number, one: string, many = one + 's'): string {
  return `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`;
}

const TYPE_LABELS: Record<BusinessType, string> = {
  MANUFACTURER: 'Manufacturer',
  EXPORTER: 'Exporter',
  WHOLESALER: 'Wholesaler',
  TRADER: 'Trader',
  RETAILER: 'Retailer',
  SERVICE_PROVIDER: 'Service provider',
};
export const businessTypeLabel = (t: BusinessType) => TYPE_LABELS[t] ?? t;
export const BUSINESS_TYPES = Object.keys(TYPE_LABELS) as BusinessType[];

export function replyTime(hours: number | null): string | null {
  if (hours == null) return null;
  if (hours <= 1) return 'Replies in about 1 hr';
  if (hours < 24) return `Replies in about ${hours} hrs`;
  return 'Replies in about 1 day';
}

/** Two-letter monogram for suppliers without a logo. */
export function monogram(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? words[0]?.[1] ?? '')).toUpperCase();
}

/** Stable colour per supplier for monogram tiles. */
export function monogramColor(seed: string): string {
  const palette = ['#1A3C5E', '#14693A', '#9a4f12', '#5b3d8a', '#0e6b6b', '#7a1f2b', '#2d5d8a', '#4a5d23'];
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}

const DATE = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const dateLabel = (iso: string | Date) => DATE.format(new Date(iso));

/** "3 days left", "closes today", or "closed". */
export function timeLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "closed";
  const days = Math.floor(ms / 86_400_000);
  return days >= 1 ? `${plural(days, "day")} left` : "closes today";
}
