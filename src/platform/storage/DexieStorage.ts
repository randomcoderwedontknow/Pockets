import Dexie, { type Table } from 'dexie';
import type { LocalAccount } from '@/domain/localAccount';
import type { Field, Item, Pocket, Tag, Vault } from '@/domain/types';
import type { SecurityRecord, StorageAdapter, StorageEstimate, VaultSnapshot } from './StorageAdapter';

interface SettingRow {
  key: string;
  value: unknown;
}

class PocketsDB extends Dexie {
  vault!: Table<Vault, string>;
  pockets!: Table<Pocket, string>;
  items!: Table<Item, string>;
  fields!: Table<Field, string>;
  tags!: Table<Tag, string>;
  settings!: Table<SettingRow, string>;
  security!: Table<SecurityRecord, string>;
  localAccount!: Table<LocalAccount, string>;

  constructor(name = 'pockets') {
    super(name);
    this.version(1).stores({
      vault: 'id',
      pockets: 'id, vaultId, sortOrder',
      items: 'id, vaultId, pocketId, type, updatedAt',
      fields: 'id, itemId',
      tags: 'id, vaultId, name',
      settings: 'key',
      security: 'id',
    });
    this.version(2).stores({
      localAccount: 'id',
    });
  }
}

export class DexieStorage implements StorageAdapter {
  private db: PocketsDB;

  constructor(name?: string) {
    this.db = new PocketsDB(name);
  }

  async init(): Promise<void> {
    await this.db.open();
  }

  getVault() {
    return this.db.vault.toCollection().first().then((v) => v ?? null);
  }
  async putVault(vault: Vault) {
    await this.db.vault.put(vault);
  }

  listPockets() {
    return this.db.pockets.orderBy('sortOrder').toArray();
  }
  async putPocket(pocket: Pocket) {
    await this.db.pockets.put(pocket);
  }
  async deletePocket(id: string) {
    await this.db.pockets.delete(id);
  }

  listItems() {
    return this.db.items.toArray();
  }
  async putItem(item: Item) {
    await this.db.items.put(item);
  }
  async deleteItem(id: string) {
    await this.db.transaction('rw', this.db.items, this.db.fields, async () => {
      await this.db.fields.where('itemId').equals(id).delete();
      await this.db.items.delete(id);
    });
  }
  async deleteItemsByPocket(pocketId: string) {
    return this.db.transaction('rw', this.db.items, this.db.fields, async () => {
      const ids = await this.db.items.where('pocketId').equals(pocketId).primaryKeys();
      if (ids.length) {
        await this.db.fields.where('itemId').anyOf(ids).delete();
        await this.db.items.bulkDelete(ids);
      }
      return ids;
    });
  }

  listFields() {
    return this.db.fields.toArray();
  }
  listFieldsByItem(itemId: string) {
    return this.db.fields.where('itemId').equals(itemId).sortBy('sortOrder');
  }
  async replaceFieldsForItem(itemId: string, fields: Field[]) {
    await this.db.transaction('rw', this.db.fields, async () => {
      await this.db.fields.where('itemId').equals(itemId).delete();
      if (fields.length) await this.db.fields.bulkPut(fields);
    });
  }
  async deleteFieldsByItem(itemId: string) {
    await this.db.fields.where('itemId').equals(itemId).delete();
  }

  listTags() {
    return this.db.tags.toArray();
  }
  async putTag(tag: Tag) {
    await this.db.tags.put(tag);
  }
  async deleteTag(id: string) {
    await this.db.tags.delete(id);
  }

  async getSetting<T>(key: string): Promise<T | undefined> {
    const row = await this.db.settings.get(key);
    return row?.value as T | undefined;
  }
  async setSetting<T>(key: string, value: T) {
    await this.db.settings.put({ key, value });
  }

  getLocalAccount() {
    return this.db.localAccount.get('local').then((a) => a ?? null);
  }
  async putLocalAccount(account: LocalAccount) {
    await this.db.localAccount.put(account);
  }

  getSecurity() {
    return this.db.security.get('primary').then((s) => s ?? null);
  }
  async putSecurity(record: SecurityRecord) {
    await this.db.security.put(record);
  }
  async deleteSecurity() {
    await this.db.security.delete('primary');
  }

  async snapshot(): Promise<VaultSnapshot> {
    const [vault, pockets, items, fields, tags, security] = await Promise.all([
      this.getVault(),
      this.listPockets(),
      this.listItems(),
      this.listFields(),
      this.listTags(),
      this.getSecurity(),
    ]);
    return { vault, pockets, items, fields, tags, security };
  }

  async restore(snapshot: VaultSnapshot) {
    const { vault, pockets, items, fields, tags, security } = this.db;
    await this.db.transaction('rw', [vault, pockets, items, fields, tags, security], async () => {
      await Promise.all([vault.clear(), pockets.clear(), items.clear(), fields.clear(), tags.clear(), security.clear()]);
      if (snapshot.vault) await vault.put(snapshot.vault);
      await pockets.bulkPut(snapshot.pockets);
      await items.bulkPut(snapshot.items);
      await fields.bulkPut(snapshot.fields);
      await tags.bulkPut(snapshot.tags);
      if (snapshot.security) await security.put(snapshot.security);
    });
  }

  async clearAll() {
    const tables = this.db.tables;
    await this.db.transaction('rw', tables, async () => {
      await Promise.all(tables.map((t) => t.clear()));
    });
  }

  async estimate(): Promise<StorageEstimate> {
    let usageBytes: number | null = null;
    let quotaBytes: number | null = null;
    try {
      if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
        const est = await navigator.storage.estimate();
        usageBytes = est.usage ?? null;
        quotaBytes = est.quota ?? null;
      }
    } catch {
      /* unsupported */
    }
    const [itemCount, pocketCount, fieldCount] = await Promise.all([
      this.db.items.count(),
      this.db.pockets.count(),
      this.db.fields.count(),
    ]);
    return { usageBytes, quotaBytes, itemCount, pocketCount, fieldCount };
  }
}
