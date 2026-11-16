/**
 * Analytics days are Indian calendar days: a supplier looking at "today" at 11 pm in Pune must not
 * see tomorrow's UTC date. Days are plain "YYYY-MM-DD" strings, which sort and compare correctly.
 */
const TZ = 'Asia/Kolkata';
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

/** The Indian calendar day an instant falls on, as YYYY-MM-DD. */
export function istDay(at: Date): string {
  return fmt.format(at);
}

/** `day` moved by `delta` days (negative = earlier). Works on the date alone, so no time-zone surprises. */
export function addDays(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Every day from `from` to `to`, inclusive. */
export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Midnight at the start of an Indian day, as an instant. */
export function istStart(day: string): Date {
  return new Date(`${day}T00:00:00+05:30`);
}

export interface Period {
  days: number;
  from: string;
  to: string;
  /** The period of equal length right before, for "vs previous" comparisons. */
  prevFrom: string;
  prevTo: string;
}

/** The last `days` days ending today (today included), and the same number of days before that. */
export function periodEndingToday(days: number, now = new Date()): Period {
  const to = istDay(now);
  const from = addDays(to, -(days - 1));
  return { days, from, to, prevFrom: addDays(from, -days), prevTo: addDays(from, -1) };
}

/** Percentage change, whole number; null when there is nothing earlier to compare with. */
export function changePct(value: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((value - previous) / previous) * 100);
}
