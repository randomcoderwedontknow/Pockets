import type { Field, FieldDraft, Item } from '@/domain/types';
import { revealField } from './securityService';

export function isFieldProtected(field: Field, itemProtected: boolean): boolean {
  return field.protected || itemProtected;
}

/** Protected field with ciphertext (or item-level protect with encrypted fields). */
export function fieldStoresSecret(field: Field, itemProtected: boolean): boolean {
  return isFieldProtected(field, itemProtected) && !!field.encrypted;
}

export function itemHasProtectedSecrets(item: Item, fields: Field[] | undefined): boolean {
  if (!fields?.length) return item.protected;
  if (item.protected && fields.some((f) => f.encrypted)) return true;
  return fields.some((f) => fieldStoresSecret(f, item.protected));
}

export function pocketHasProtectedSecrets(
  items: Item[],
  fieldsByItem: Record<string, Field[]>,
  pocketId: string,
): boolean {
  for (const item of items) {
    if (item.pocketId !== pocketId) continue;
    if (itemHasProtectedSecrets(item, fieldsByItem[item.id])) return true;
  }
  return false;
}

export function pocketDeleteRequiresAuth(
  items: Item[],
  fieldsByItem: Record<string, Field[]>,
  pocketId: string,
  mode: 'delete-items' | { moveTo: string },
): boolean {
  const inPocket = items.filter((i) => i.pocketId === pocketId);
  if (inPocket.length === 0) return false;
  if (mode === 'delete-items') return true;
  return pocketHasProtectedSecrets(items, fieldsByItem, pocketId);
}

export class EditRevealCancelledError extends Error {
  constructor() {
    super('Cancelled');
    this.name = 'EditRevealCancelledError';
  }
}

export function fieldsToLockedDrafts(fields: Field[], itemProtected: boolean): FieldDraft[] {
  return fields.map((f) => ({
    id: f.id,
    name: f.name,
    kind: f.kind,
    protected: isFieldProtected(f, itemProtected),
    value: fieldStoresSecret(f, itemProtected) ? null : (f.value ?? ''),
    encrypted: f.encrypted,
    ownerRecovery: f.ownerRecovery,
  }));
}

export function itemNeedsVaultKeyToReveal(fields: Field[], itemProtected: boolean): boolean {
  return fields.some((f) => fieldStoresSecret(f, itemProtected) && f.encrypted?.v !== 2);
}

/** Decrypt protected fields for editing; prompts for note passcodes when needed. */
export async function revealFieldDraftsForEdit(
  fields: Field[],
  itemProtected: boolean,
  askNotePasscode: (fieldLabel: string) => Promise<string | null>,
): Promise<FieldDraft[]> {
  const out: FieldDraft[] = [];
  for (const f of fields) {
    const prot = isFieldProtected(f, itemProtected);
    if (!fieldStoresSecret(f, itemProtected)) {
      out.push({
        id: f.id,
        name: f.name,
        kind: f.kind,
        protected: prot,
        value: f.value ?? '',
        encrypted: f.encrypted,
        ownerRecovery: f.ownerRecovery,
      });
      continue;
    }
    let notePasscode: string | undefined;
    if (f.encrypted!.v === 2) {
      const code = await askNotePasscode(f.name.trim() || 'Protected field');
      if (!code) throw new EditRevealCancelledError();
      notePasscode = code;
    }
    const value = await revealField(f, notePasscode);
    out.push({
      id: f.id,
      name: f.name,
      kind: f.kind,
      protected: prot,
      value,
      encrypted: f.encrypted,
      ownerRecovery: f.ownerRecovery,
    });
  }
  return out;
}
