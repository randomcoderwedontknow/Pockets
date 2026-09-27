import { beforeEach, describe, expect, it } from 'vitest';
import { resetTestStorage } from '@/test/setup';
import { setupPasscode, unlockWithPasscode, revealField, lock } from '@/security/securityService';
import { useVaultStore } from '@/store/vaultStore';
import { buildEncryptedExport, exportContainsPlaintext, importSnapshot, fieldIsCiphertextOnly } from './exportImport';
import { getStorage } from '@/platform/storage';

const SECRET = 'NEVER-IN-THE-FILE-4419';

describe('export / import', () => {
  beforeEach(async () => {
    await resetTestStorage();
    await useVaultStore.getState().load();
  });

  it('preserves ciphertext and the wrapped key; export has no plaintext secret', async () => {
    await setupPasscode('abcd');
    const pocket = await useVaultStore.getState().createPocket({
      name: 'Test',
      icon: 'folder',
      color: 'lavender',
    });
    await useVaultStore.getState().saveItem({
      pocketId: pocket.id,
      type: 'secure',
      title: 'Membership',
      description: 'gym',
      tagNames: ['club'],
      favourite: false,
      pinned: false,
      protected: false,
      fields: [{ name: 'Number', kind: 'text', protected: true, value: SECRET }],
    });

    const field = Object.values(useVaultStore.getState().fieldsByItem)[0][0];
    expect(fieldIsCiphertextOnly(field)).toBe(true);

    const exp = await buildEncryptedExport();
    expect(exp.decrypted).toBe(false);
    expect(exp.security?.wrappedKey.ct).toBeTruthy();
    expect(exportContainsPlaintext(exp, [SECRET])).toBe(false);
    expect(JSON.stringify(exp)).not.toContain(SECRET);

    const originalCt = field.encrypted!;
    const importedField = exp.fields.find((f) => f.id === field.id)!;
    expect(importedField.encrypted).toEqual(originalCt);
    expect(importedField.value).toBeNull();

    await getStorage().clearAll();
    await importSnapshot(exp, 'replace');
    lock();
    await unlockWithPasscode('abcd');
    const restored = (await getStorage().listFields()).find((f) => f.id === field.id)!;
    expect(restored.encrypted).toEqual(originalCt);
    expect(await revealField(restored)).toBe(SECRET);
  });
});
