import type { KdfParams } from '@/platform/storage/StorageAdapter';

/**
 * Core domain model for Pockets.
 *
 * Conceptually: Vault -> Pockets -> Items -> Fields, with Tags attached to Items.
 * Everything is keyed by ID and linked by foreign keys so the data can later
 * be synced, migrated, or encrypted as a whole.
 */

export type ISODate = string;

export type ItemType = 'important' | 'secure' | 'code' | 'link' | 'note' | 'device';

export type PocketColor =
  | 'lavender'
  | 'green'
  | 'blue'
  | 'purple'
  | 'orange'
  | 'red'
  | 'teal'
  | 'pink'
  | 'slate'
  | 'amber'
  | 'cyan'
  | 'indigo'
  | 'rose'
  | 'lime';

export interface Vault {
  id: string;
  name: string;
  schemaVersion: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Pocket {
  id: string;
  vaultId: string;
  name: string;
  /** Key into the pocket icon registry (see pocketMeta.ts). */
  icon: string;
  color: PocketColor;
  sortOrder: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Item {
  id: string;
  vaultId: string;
  pocketId: string;
  type: ItemType;
  title: string;
  description: string;
  tagIds: string[];
  favourite: boolean;
  pinned: boolean;
  /**
   * When true, every field on this item is treated as protected regardless of
   * the individual field flag. Title and description stay visible so the item
   * can still be found and recognised.
   */
  protected: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type FieldKind = 'text' | 'multiline' | 'url' | 'code';

/** AES-GCM ciphertext, base64 encoded. Never contains plaintext. */
export interface EncryptedValue {
  /** v1 = vault key; v2 = note passcode (see kdf). */
  v: 1 | 2;
  iv: string;
  ct: string;
  /** Present on v2: passcode-derived encryption for this field. */
  kdf?: KdfParams;
}

export interface Field {
  id: string;
  itemId: string;
  name: string;
  kind: FieldKind;
  protected: boolean;
  /** Plaintext value. Always null when the field is protected. */
  value: string | null;
  /** Ciphertext. Always null when the field is not protected. */
  encrypted: EncryptedValue | null;
  /** Escrow for device-owner recovery; never exported. */
  ownerRecovery?: EncryptedValue | null;
  sortOrder: number;
}

export interface Tag {
  id: string;
  vaultId: string;
  name: string;
  createdAt: ISODate;
}

export interface ItemAttachment {
  id: string;
  itemId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: ISODate;
}

/** Input shape for creating/editing a field from the UI (plaintext, pre-encryption). */
export interface FieldDraft {
  id?: string;
  name: string;
  kind: FieldKind;
  protected: boolean;
  /** Plaintext value; null when the user left an existing protected value untouched. */
  value: string | null;
  /** Carried through when a protected value was left untouched. */
  encrypted?: EncryptedValue | null;
  ownerRecovery?: EncryptedValue | null;
  /** Set only while saving: encrypts this field with a note-specific passcode (v2). */
  notePasscode?: string;
}

export interface ItemDraft {
  id?: string;
  pocketId: string;
  type: ItemType;
  title: string;
  description: string;
  tagNames: string[];
  favourite: boolean;
  pinned: boolean;
  protected: boolean;
  fields: FieldDraft[];
}

export interface PocketDraft {
  id?: string;
  name: string;
  icon: string;
  color: PocketColor;
}

/** Item with its fields attached; convenient for UI. */
export interface ItemWithFields extends Item {
  fields: Field[];
}

export const SCHEMA_VERSION = 1;
