import { addDays, changePct, eachDay, istDay, istStart, periodEndingToday } from './analytics.dates';

describe('analytics dates', () => {
  it('uses the Indian calendar day, not the UTC one', () => {
    // 20:00 UTC on 15 Nov is already 01:30 on 16 Nov in India.
    expect(istDay(new Date('2026-11-15T20:00:00Z'))).toBe('2026-11-16');
    expect(istDay(new Date('2026-11-15T18:29:00Z'))).toBe('2026-11-15');
    expect(istDay(new Date('2026-11-15T18:30:00Z'))).toBe('2026-11-16');
  });

  it('moves days across month and year ends', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(eachDay('2026-02-27', '2026-03-02')).toEqual(['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02']);
  });

  it('starts an Indian day at +05:30', () => {
    expect(istStart('2026-11-16').toISOString()).toBe('2026-11-15T18:30:00.000Z');
  });

  it('builds a period ending today plus an equal one before it', () => {
    const p = periodEndingToday(7, new Date('2026-11-16T06:00:00Z'));
    expect(p).toEqual({ days: 7, from: '2026-11-10', to: '2026-11-16', prevFrom: '2026-11-03', prevTo: '2026-11-09' });
    expect(eachDay(p.from, p.to)).toHaveLength(7);
  });

  it('reports percentage change only when there is something to compare with', () => {
    expect(changePct(150, 100)).toBe(50);
    expect(changePct(50, 100)).toBe(-50);
    expect(changePct(10, 0)).toBeNull();
    expect(changePct(0, 0)).toBeNull();
  });
});
