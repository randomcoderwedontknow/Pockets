import { create } from 'zustand';
import type { Field, Item, ItemAttachment, ItemDraft, ItemWithFields, Pocket, PocketDraft, Tag, Vault } from '@/domain/types';
import { MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS_PER_ITEM } from '@/domain/attachments';
import { SCHEMA_VERSION } from '@/domain/types';
import { newId, nowISO } from '@/domain/ids';
import { getStorage } from '@/platform/storage';
import { materialiseFields } from '@/security/securityService';

interface VaultState {
  loaded: boolean;
  vault: Vault | null;
  pockets: Pocket[];
  items: Item[];
  /** Fields grouped by item id. */
  fieldsByItem: Record<string, Field[]>;
  attachmentsByItem: Record<string, ItemAttachment[]>;
  tags: Tag[];

  load(): Promise<void>;
  reload(): Promise<void>;

  createPocket(draft: PocketDraft): Promise<Pocket>;
  updatePocket(id: string, draft: Partial<PocketDraft>): Promise<void>;
  deletePocket(id: string, mode: 'delete-items' | { moveTo: string }): Promise<void>;
  reorderPockets(ids: string[]): Promise<void>;

  saveItem(draft: ItemDraft): Promise<Item>;
  deleteItem(id: string): Promise<void>;
  addAttachment(itemId: string, file: File): Promise<ItemAttachment>;
  deleteAttachment(id: string): Promise<void>;
  getAttachmentBlob(id: string): Promise<ArrayBuffer | null>;
  togglePinned(id: string): Promise<void>;
  toggleFavourite(id: string): Promise<void>;

  deleteTag(id: string): Promise<void>;
}

function sortItems(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

let ensurePromise: Promise<{ vault: Vault; seeded: boolean }> | null = null;

async function ensureVault(): Promise<{ vault: Vault; seeded: boolean }> {
  if (ensurePromise) return ensurePromise;
  ensurePromise = (async () => {
    const storage = getStorage();
    const existing = await storage.getVault();
    if (existing) return { vault: existing, seeded: false };
    const now = nowISO();
    const vault: Vault = { id: newId(), name: 'My Pockets', schemaVersion: SCHEMA_VERSION, createdAt: now, updatedAt: now };
    await storage.putVault(vault);
    return { vault, seeded: true };
  })();
  try {
    return await ensurePromise;
  } catch (e) {
    ensurePromise = null;
    throw e;
  }
}

let loadPromise: Promise<void> | null = null;

/** Test hook: drop in-flight init so a new storage adapter can be used. */
export function resetVaultStoreLocks() {
  ensurePromise = null;
  loadPromise = null;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  loaded: false,
  vault: null,
  pockets: [],
  items: [],
  fieldsByItem: {},
  attachmentsByItem: {},
  tags: [],

  async load() {
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
      const storage = getStorage();
      await storage.init();
      await ensureVault();
      await get().reload();
    })();
    try {
      await loadPromise;
    } catch (e) {
      loadPromise = null;
      throw e;
    }
  },

  async reload() {
    const storage = getStorage();
    const snap = await storage.snapshot();
    const fieldsByItem: Record<string, Field[]> = {};
    for (const f of snap.fields) {
      (fieldsByItem[f.itemId] ??= []).push(f);
    }
    for (const list of Object.values(fieldsByItem)) list.sort((a, b) => a.sortOrder - b.sortOrder);
    const attachmentsByItem: Record<string, ItemAttachment[]> = {};
    for (const a of snap.attachments ?? []) {
      (attachmentsByItem[a.itemId] ??= []).push(a);
    }
    set({
      loaded: true,
      vault: snap.vault,
      pockets: [...snap.pockets].sort((a, b) => a.sortOrder - b.sortOrder),
      items: sortItems(snap.items),
      fieldsByItem,
      attachmentsByItem,
      tags: snap.tags,
    });
  },

  async createPocket(draft) {
    const { vault, pockets } = get();
    const now = nowISO();
    const pocket: Pocket = {
      id: newId(),
      vaultId: vault!.id,
      name: draft.name.trim() || 'Untitled',
      icon: draft.icon,
      color: draft.color,
      sortOrder: pockets.length ? Math.max(...pockets.map((p) => p.sortOrder)) + 1 : 0,
      createdAt: now,
      updatedAt: now,
    };
    await getStorage().putPocket(pocket);
    set({ pockets: [...pockets, pocket] });
    return pocket;
  },

  async updatePocket(id, draft) {
    const pockets = get().pockets;
    const existing = pockets.find((p) => p.id === id);
    if (!existing) return;
    const updated: Pocket = {
      ...existing,
      ...(draft.name !== undefined ? { name: draft.name.trim() || existing.name } : {}),
      ...(draft.icon !== undefined ? { icon: draft.icon } : {}),
      ...(draft.color !== undefined ? { color: draft.color } : {}),
      updatedAt: nowISO(),
    };
    await getStorage().putPocket(updated);
    set({ pockets: pockets.map((p) => (p.id === id ? updated : p)) });
  },

  async deletePocket(id, mode) {
    const storage = getStorage();
    const { items, fieldsByItem, pockets } = get();
    if (mode === 'delete-items') {
      const removed = await storage.deleteItemsByPocket(id);
      const removedSet = new Set(removed);
      const nextFields = { ...fieldsByItem };
      removed.forEach((rid) => delete nextFields[rid]);
      set({ items: items.filter((i) => !removedSet.has(i.id)), fieldsByItem: nextFields });
    } else {
      const now = nowISO();
      const moved = items.map((i) => (i.pocketId === id ? { ...i, pocketId: mode.moveTo, updatedAt: now } : i));
      for (const i of moved) if (i.pocketId === mode.moveTo && items.find((o) => o.id === i.id)?.pocketId === id) await storage.putItem(i);
      set({ items: sortItems(moved) });
    }
    await storage.deletePocket(id);
    set({ pockets: pockets.filter((p) => p.id !== id) });
  },

  async reorderPockets(ids) {
    const storage = getStorage();
    const byId = new Map(get().pockets.map((p) => [p.id, p]));
    const next: Pocket[] = [];
    ids.forEach((id, idx) => {
      const p = byId.get(id);
      if (p) next.push({ ...p, sortOrder: idx });
    });
    for (const p of next) await storage.putPocket(p);
    set({ pockets: next });
  },

  async saveItem(draft) {
    const storage = getStorage();
    const { vault, items, tags, fieldsByItem } = get();
    const now = nowISO();
    const id = draft.id ?? newId();
    const existing = items.find((i) => i.id === id);

    // Upsert tags by name.
    const tagIds: string[] = [];
    const newTags: Tag[] = [];
    for (const raw of draft.tagNames) {
      const name = raw.trim().replace(/^#/, '');
      if (!name) continue;
      let tag = [...tags, ...newTags].find((t) => t.name.toLowerCase() === name.toLowerCase());
      if (!tag) {
        tag = { id: newId(), vaultId: vault!.id, name, createdAt: now };
        newTags.push(tag);
        await storage.putTag(tag);
      }
      if (!tagIds.includes(tag.id)) tagIds.push(tag.id);
    }

    // Encrypt protected values (throws if a passcode is missing or the vault is locked).
    const fields = await materialiseFields(id, draft.fields, draft.protected);

    const item: Item = {
      id,
      vaultId: vault!.id,
      pocketId: draft.pocketId,
      type: draft.type,
      title: draft.title.trim() || 'Untitled',
      description: draft.description.trim(),
      tagIds,
      favourite: draft.favourite,
      pinned: draft.pinned,
      protected: draft.protected,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await storage.putItem(item);
    await storage.replaceFieldsForItem(id, fields);
    await touchPocket(draft.pocketId, now);

    set({
      items: sortItems(existing ? items.map((i) => (i.id === id ? item : i)) : [...items, item]),
      fieldsByItem: { ...fieldsByItem, [id]: fields },
      tags: newTags.length ? [...tags, ...newTags] : tags,
      pockets: get().pockets,
    });
    return item;
  },

  async deleteItem(id) {
    const { items, fieldsByItem, attachmentsByItem } = get();
    await getStorage().deleteItem(id);
    const next = { ...fieldsByItem };
    delete next[id];
    const nextAtt = { ...attachmentsByItem };
    delete nextAtt[id];
    set({ items: items.filter((i) => i.id !== id), fieldsByItem: next, attachmentsByItem: nextAtt });
  },

  async addAttachment(itemId, file) {
    const list = get().attachmentsByItem[itemId] ?? [];
    if (list.length >= MAX_ATTACHMENTS_PER_ITEM) throw new Error(`Maximum ${MAX_ATTACHMENTS_PER_ITEM} attachments per item.`);
    if (file.size > MAX_ATTACHMENT_BYTES) throw new Error('File is too large (max 5 MB).');
    const buf = await file.arrayBuffer();
    const now = nowISO();
    const meta: ItemAttachment = {
      id: newId(),
      itemId,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      createdAt: now,
    };
    await getStorage().putAttachment(meta, buf);
    set({
      attachmentsByItem: { ...get().attachmentsByItem, [itemId]: [...list, meta] },
    });
    return meta;
  },

  async deleteAttachment(id) {
    const storage = getStorage();
    const all = get().attachmentsByItem;
    let itemId: string | null = null;
    for (const [iid, list] of Object.entries(all)) {
      if (list.some((a) => a.id === id)) {
        itemId = iid;
        break;
      }
    }
    await storage.deleteAttachment(id);
    if (!itemId) return;
    set({
      attachmentsByItem: {
        ...all,
        [itemId]: (all[itemId] ?? []).filter((a) => a.id !== id),
      },
    });
  },

  async getAttachmentBlob(id) {
    return getStorage().getAttachmentData(id);
  },

  async togglePinned(id) {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;
    const updated = { ...item, pinned: !item.pinned, updatedAt: nowISO() };
    await getStorage().putItem(updated);
    set({ items: sortItems(get().items.map((i) => (i.id === id ? updated : i))) });
  },

  async toggleFavourite(id) {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;
    const updated = { ...item, favourite: !item.favourite, updatedAt: nowISO() };
    await getStorage().putItem(updated);
    set({ items: sortItems(get().items.map((i) => (i.id === id ? updated : i))) });
  },

  async deleteTag(id) {
    const storage = getStorage();
    const { items, tags } = get();
    const now = nowISO();
    const affected = items.filter((i) => i.tagIds.includes(id));
    for (const i of affected) await storage.putItem({ ...i, tagIds: i.tagIds.filter((t) => t !== id), updatedAt: now });
    await storage.deleteTag(id);
    set({
      tags: tags.filter((t) => t.id !== id),
      items: items.map((i) => (i.tagIds.includes(id) ? { ...i, tagIds: i.tagIds.filter((t) => t !== id) } : i)),
    });
  },
}));

async function touchPocket(pocketId: string, now: string) {
  const { pockets } = useVaultStore.getState();
  const p = pockets.find((x) => x.id === pocketId);
  if (!p) return;
  const updated = { ...p, updatedAt: now };
  await getStorage().putPocket(updated);
  useVaultStore.setState({ pockets: pockets.map((x) => (x.id === pocketId ? updated : x)) });
}

/* --------------------------- Selectors ---------------------------- */

export function selectItemWithFields(state: VaultState, id: string): ItemWithFields | undefined {
  const item = state.items.find((i) => i.id === id);
  if (!item) return undefined;
  return { ...item, fields: state.fieldsByItem[id] ?? [] };
}

export function selectPocketItemCount(state: VaultState, pocketId: string): number {
  let n = 0;
  for (const i of state.items) if (i.pocketId === pocketId) n++;
  return n;
}

/** Stable fallback — never use `[]` inline in zustand selectors (React 19 getSnapshot loop). */
export const EMPTY_ITEM_ATTACHMENTS: ItemAttachment[] = [];

export function selectItemAttachments(state: VaultState, itemId: string | undefined): ItemAttachment[] {
  if (!itemId) return EMPTY_ITEM_ATTACHMENTS;
  return state.attachmentsByItem[itemId] ?? EMPTY_ITEM_ATTACHMENTS;
}
