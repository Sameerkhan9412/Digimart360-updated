import { CategoryGraph } from './matching.service';

/** The straightforward definition: c is visible if related(c) contains a product category. */
function naiveVisibleTo(graph: CategoryGraph, ids: string[], mine: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const id of ids) {
    for (const x of graph.related(id)) {
      if (mine.has(x)) {
        out.add(id);
        break;
      }
    }
  }
  return out;
}

/** Small deterministic random generator so a failure can be reproduced. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

describe('CategoryGraph.visibleTo', () => {
  it('matches the plain definition on random category trees', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const rand = rng(seed);
      const cats: { id: string; parentId: string | null }[] = [];
      const count = 1 + Math.floor(rand() * 40);
      for (let i = 0; i < count; i++) {
        const parent = cats.length && rand() < 0.85 ? cats[Math.floor(rand() * cats.length)].id : null;
        cats.push({ id: `c${i}`, parentId: parent });
      }
      const graph = new CategoryGraph(cats);
      const ids = cats.map((c) => c.id);
      const mine = new Set(ids.filter(() => rand() < 0.15));
      mine.add('does-not-exist'); // unknown ids are ignored
      expect([...graph.visibleTo(mine)].sort()).toEqual([...naiveVisibleTo(graph, ids, mine)].sort());
    }
  });

  it('shows a seller of a leaf the requirements in its siblings and ancestors, not in unrelated branches', () => {
    const graph = new CategoryGraph([
      { id: 'machinery', parentId: null },
      { id: 'valves', parentId: 'machinery' },
      { id: 'ball', parentId: 'valves' },
      { id: 'gate', parentId: 'valves' },
      { id: 'pumps', parentId: 'machinery' },
      { id: 'textiles', parentId: null },
    ]);
    const seen = graph.visibleTo(new Set(['ball']));
    expect([...seen].sort()).toEqual(['ball', 'gate', 'machinery', 'pumps', 'valves']);
    expect(seen.has('textiles')).toBe(false);
  });
});
