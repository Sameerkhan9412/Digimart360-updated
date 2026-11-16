import { RecentViews } from './analytics.service';

describe('RecentViews', () => {
  it('counts a visitor once per page within the window, then again after it', () => {
    const r = new RecentViews();
    const t0 = 1_000_000;
    expect(r.firstSight('a|product|x', t0)).toBe(true);
    expect(r.firstSight('a|product|x', t0 + 29 * 60_000)).toBe(false);
    expect(r.firstSight('a|product|x', t0 + 31 * 60_000)).toBe(true);
  });

  it('treats other visitors and other pages separately', () => {
    const r = new RecentViews();
    expect(r.firstSight('a|product|x')).toBe(true);
    expect(r.firstSight('b|product|x')).toBe(true);
    expect(r.firstSight('a|product|y')).toBe(true);
    expect(r.firstSight('a|site|x')).toBe(true);
  });
});
