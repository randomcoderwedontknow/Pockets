import { describe, expect, it } from 'vitest';
import type { Field, Item, Pocket, Tag } from '@/domain/types';
import { buildIndex, search } from './searchIndex';

const now = new Date().toISOString();

const pocket: Pocket = {
  id: 'p1',
  vaultId: 'v',
  name: 'Tech',
  icon: 'cpu',
  color: 'blue',
  sortOrder: 0,
  createdAt: now,
  updatedAt: now,
};

const item: Item = {
  id: 'i1',
  vaultId: 'v',
  pocketId: 'p1',
  type: 'device',
  title: 'PC',
  description: 'Home desktop',
  tagIds: ['t1'],
  favourite: false,
  pinned: false,
  protected: false,
  createdAt: now,
  updatedAt: now,
};

const fields: Field[] = [
  { id: 'f1', itemId: 'i1', name: 'GPU', kind: 'text', protected: false, value: 'GTX 970', encrypted: null, sortOrder: 0 },
  {
    id: 'f2',
    itemId: 'i1',
    name: 'License',
    kind: 'text',
    protected: true,
    value: null,
    encrypted: { v: 1, iv: 'aaa', ct: 'THIS-IS-CIPHERTEXT-not-the-secret' },
    sortOrder: 1,
  },
];

const tags: Tag[] = [{ id: 't1', vaultId: 'v', name: 'hardware', createdAt: now }];

describe('search index', () => {
  it('finds public field values and never indexes protected ones', () => {
    const index = buildIndex([item], { i1: fields }, [pocket], tags);
    expect(index[0].fieldValues).toContain('gtx 970');
    expect(index[0].fieldNames).toContain('license');
    expect(JSON.stringify(index)).not.toContain('THIS-IS-CIPHERTEXT');
    expect(JSON.stringify(index)).not.toMatch(/secret/i);

    const gpu = search('970', index, [item]);
    expect(gpu).toHaveLength(1);
    expect(gpu[0].matchedField).toEqual({ name: 'GPU', value: 'GTX 970' });

    const leak = search('THIS-IS-CIPHERTEXT', index, [item]);
    expect(leak).toHaveLength(0);
  });

  it('does not index values when the item itself is protected', () => {
    const locked: Item = { ...item, protected: true };
    const index = buildIndex([locked], { i1: fields }, [pocket], tags);
    expect(index[0].fieldValues).toBe('');
    expect(search('970', index, [locked])).toHaveLength(0);
    expect(search('pc', index, [locked])).toHaveLength(1);
  });
});
