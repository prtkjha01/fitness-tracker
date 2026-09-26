import { removeById, upsertById } from '@/lib/optimistic';

describe('optimistic list helpers', () => {
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

  it('inserts, replaces and keeps order', () => {
    const list = [{ id: '1', name: 'b' }];
    expect(upsertById(list, { id: '2', name: 'a' }, byName).map((x) => x.id)).toEqual(['2', '1']);
    expect(upsertById(list, { id: '1', name: 'c' })).toEqual([{ id: '1', name: 'c' }]);
    expect(upsertById(undefined, { id: '1', name: 'a' })).toHaveLength(1);
  });

  it('removes by id and tolerates a missing list', () => {
    expect(removeById([{ id: '1' }, { id: '2' }], '1')).toEqual([{ id: '2' }]);
    expect(removeById(undefined, '1')).toEqual([]);
  });
});
