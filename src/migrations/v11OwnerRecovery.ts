import { decryptString, decryptStringWithPasscode, encryptOwnerRecovery } from '@/crypto/vaultCrypto';
import type { Field } from '@/domain/types';
import { keyHolder } from '@/crypto/keyHolder';
import { getStorage } from '@/platform/storage';
import { ownerRecoveryKdfParams, ownerSeedPasscode } from '@/security/ownerUnlockService';
import { requireVaultKey } from '@/security/securityService';

const MIGRATION_KEY = 'migrations.v11OwnerRecovery';

export async function runV11OwnerRecoveryMigration(): Promise<boolean> {
  const storage = getStorage();
  if (await storage.getSetting<boolean>(MIGRATION_KEY)) return false;

  const fields = await storage.listFields();
  let changed = false;
  const byItem = new Map<string, Field[]>();

  for (const field of fields) {
    if (!field.protected || field.ownerRecovery || !field.encrypted) continue;
    let plaintext: string | null = null;
    try {
      if (field.encrypted.v === 2 && field.encrypted.kdf) {
        try {
          plaintext = await decryptStringWithPasscode(ownerSeedPasscode(), field.encrypted);
        } catch {
          /* lazy backfill on reveal */
        }
      } else if (field.encrypted.v === 1 && keyHolder.has()) {
        plaintext = await decryptString(requireVaultKey(), field.encrypted);
      }
    } catch {
      continue;
    }
    if (plaintext === null) continue;
    const kdf = await ownerRecoveryKdfParams();
    const ownerRecovery = await encryptOwnerRecovery(plaintext, ownerSeedPasscode(), kdf);
    const updated = { ...field, ownerRecovery };
    const list = byItem.get(field.itemId) ?? (await storage.listFieldsByItem(field.itemId));
    byItem.set(
      field.itemId,
      list.map((f) => (f.id === field.id ? updated : f)),
    );
    changed = true;
  }

  for (const [itemId, next] of byItem) {
    await storage.replaceFieldsForItem(itemId, next);
  }

  await storage.setSetting(MIGRATION_KEY, true);
  return changed;
}
