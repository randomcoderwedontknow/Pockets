import { describe, expect, it } from 'vitest';
import { EMPTY_ITEM_ATTACHMENTS, selectItemAttachments } from './vaultStore';

describe('selectItemAttachments', () => {
  const state = {
    attachmentsByItem: {},
  } as Parameters<typeof selectItemAttachments>[0];

  it('returns a stable empty array when there is no item id', () => {
    expect(selectItemAttachments(state, undefined)).toBe(EMPTY_ITEM_ATTACHMENTS);
    expect(selectItemAttachments(state, '')).toBe(EMPTY_ITEM_ATTACHMENTS);
  });

  it('returns a stable empty array when the item has no attachments', () => {
    expect(selectItemAttachments(state, 'missing')).toBe(EMPTY_ITEM_ATTACHMENTS);
  });
});
