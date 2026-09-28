import { describe, expect, it } from 'vitest';
import type { Field, Item } from '@/domain/types';
import {
  fieldStoresSecret,
  itemHasProtectedSecrets,
  pocketDeleteRequiresAuth,
  pocketHasProtectedSecrets,
} from './protectedContent';

const item = (patch: Partial<Item>): Item =>
  ({
    id: 'i1',
    pocketId: 'p1',
    protected: false,
    tagIds: [],
    ...patch,
  }) as Item;

const field = (patch: Partial<Field>): Field =>
  ({
    id: 'f1',
    itemId: 'i1',
    name: 'Secret',
    kind: 'text',
    protected: true,
    value: null,
    encrypted: { v: 1, iv: 'a', ct: 'b' },
    sortOrder: 0,
    ...patch,
  }) as Field;

describe('protectedContent', () => {
  it('detects protected secrets on items and pockets', () => {
    expect(fieldStoresSecret(field({}), false)).toBe(true);
    expect(itemHasProtectedSecrets(item({ protected: true }), [field({ protected: false })])).toBe(true);
    expect(
      pocketHasProtectedSecrets([item({})], { i1: [field({})] }, 'p1'),
    ).toBe(true);
  });

  it('requires auth to delete pocket with items or protected data', () => {
    const items = [item({})];
    const fieldsByItem = { i1: [field({ protected: false, encrypted: null, value: 'x' })] };
    expect(pocketDeleteRequiresAuth(items, fieldsByItem, 'p1', { moveTo: 'p2' })).toBe(false);
    expect(pocketDeleteRequiresAuth(items, fieldsByItem, 'p1', 'delete-items')).toBe(true);
    expect(pocketDeleteRequiresAuth(items, { i1: [field({})] }, 'p1', { moveTo: 'p2' })).toBe(true);
  });
});
