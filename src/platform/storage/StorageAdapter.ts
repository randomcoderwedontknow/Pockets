import type { LocalAccount } from '@/domain/localAccount';
import type { EncryptedValue, Field, Item, ItemAttachment, Pocket, Tag, Vault } from '@/domain/types';

/** Key-derivation parameters stored alongside the wrapped vault key. */
export interface KdfParams {
  name: 'PBKDF2';
  hash: 'SHA-256';
  iterations: number;
  /** base64 */
  salt: string;
}

export interface WebAuthnRecord {
  /** base64url credential id */
  credentialId: string;
  /** Whether the authenticator supports the PRF extension. */
  prfEnabled: boolean;
  /** base64 salt used for PRF evaluation. */
  prfSalt: string | null;
  /** Vault key wrapped with a key derived from the PRF output. */
  prfWrappedKey: EncryptedValue | null;
  createdAt: string;
}

/**
 * Security material. Never contains the passcode or the raw vault key.
 * The vault key can only be recovered by unwrapping with the KEK derived
 * from the passcode (or from a WebAuthn PRF output / native secure storage).
 */
export interface SecurityRecord {
  id: 'primary';
  kdf: KdfParams;
  wrappedKey: EncryptedValue;
  webauthn: WebAuthnRecord | null;
  createdAt: string;
  updatedAt: string;
}

export interface VaultSnapshot {
  vault: Vault | null;
  pockets: Pocket[];
  items: Item[];
  fields: Field[];
  tags: Tag[];
  attachments: ItemAttachment[];
  security: SecurityRecord | null;
}

export interface StorageEstimate {
  usageBytes: number | null;
  quotaBytes: number | null;
  itemCount: number;
  pocketCount: number;
  fieldCount: number;
}

/**
 * Persistence boundary. The web build uses IndexedDB (Dexie). The Android
 * build can swap in an encrypted native store or add a sync layer without
 * touching stores or UI.
 */
export interface StorageAdapter {
  init(): Promise<void>;

  getVault(): Promise<Vault | null>;
  putVault(vault: Vault): Promise<void>;

  listPockets(): Promise<Pocket[]>;
  putPocket(pocket: Pocket): Promise<void>;
  deletePocket(id: string): Promise<void>;

  listItems(): Promise<Item[]>;
  putItem(item: Item): Promise<void>;
  deleteItem(id: string): Promise<void>;
  deleteItemsByPocket(pocketId: string): Promise<string[]>;

  listFields(): Promise<Field[]>;
  listFieldsByItem(itemId: string): Promise<Field[]>;
  replaceFieldsForItem(itemId: string, fields: Field[]): Promise<void>;
  deleteFieldsByItem(itemId: string): Promise<void>;

  listAttachments(): Promise<ItemAttachment[]>;
  listAttachmentsByItem(itemId: string): Promise<ItemAttachment[]>;
  putAttachment(meta: ItemAttachment, data: ArrayBuffer): Promise<void>;
  getAttachmentData(id: string): Promise<ArrayBuffer | null>;
  deleteAttachment(id: string): Promise<void>;
  deleteAttachmentsByItem(itemId: string): Promise<void>;

  listTags(): Promise<Tag[]>;
  putTag(tag: Tag): Promise<void>;
  deleteTag(id: string): Promise<void>;

  getSetting<T>(key: string): Promise<T | undefined>;
  setSetting<T>(key: string, value: T): Promise<void>;

  getLocalAccount(): Promise<LocalAccount | null>;
  putLocalAccount(account: LocalAccount): Promise<void>;

  getSecurity(): Promise<SecurityRecord | null>;
  putSecurity(record: SecurityRecord): Promise<void>;
  deleteSecurity(): Promise<void>;

  snapshot(): Promise<VaultSnapshot>;
  /** Replaces all vault data (used by import). Settings are preserved. */
  restore(snapshot: VaultSnapshot): Promise<void>;
  clearAll(): Promise<void>;
  estimate(): Promise<StorageEstimate>;
}
