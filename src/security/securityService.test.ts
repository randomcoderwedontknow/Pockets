import { beforeEach, describe, expect, it } from 'vitest';
import { resetTestStorage } from '@/test/setup';
import { keyHolder } from '@/crypto/keyHolder';
import {
  changePasscode,
  lock,
  materialiseFields,
  revealField,
  setupPasscode,
  unlockWithPasscode,
  VaultLockedError,
} from './securityService';
import { decryptString } from '@/crypto/vaultCrypto';
import { WrongCredentialError } from '@/crypto/vaultCrypto';

const SECRET = 'membership-ZX-4419';

describe('passcode + field protection', () => {
  beforeEach(async () => {
    await resetTestStorage();
  });

  it('stores protected fields as ciphertext and reveals after unlock', async () => {
    await setupPasscode('abcd');
    const fields = await materialiseFields(
      'item-1',
      [{ name: 'Member number', kind: 'text', protected: true, value: SECRET }],
      false,
    );
    expect(fields[0].value).toBeNull();
    expect(fields[0].encrypted?.ct).toBeTruthy();
    expect(JSON.stringify(fields)).not.toContain(SECRET);
    expect(await revealField(fields[0])).toBe(SECRET);
  });

  it('rejects an incorrect passcode and will not reveal while locked', async () => {
    await setupPasscode('abcd');
    const fields = await materialiseFields(
      'item-1',
      [{ name: 'PIN', kind: 'text', protected: true, value: SECRET }],
      false,
    );
    lock();
    expect(keyHolder.has()).toBe(false);
    await expect(revealField(fields[0])).rejects.toBeInstanceOf(VaultLockedError);
    await expect(unlockWithPasscode('wrong')).rejects.toBeInstanceOf(WrongCredentialError);
    expect(keyHolder.has()).toBe(false);
    await expect(revealField(fields[0])).rejects.toBeInstanceOf(VaultLockedError);
    await unlockWithPasscode('abcd');
    expect(await revealField(fields[0])).toBe(SECRET);
  });

  it('changing the passcode keeps existing ciphertext decryptable', async () => {
    await setupPasscode('old-code');
    const fields = await materialiseFields(
      'item-1',
      [{ name: 'Secret', kind: 'text', protected: true, value: SECRET }],
      false,
    );
    const ciphertext = fields[0].encrypted!;
    await changePasscode('old-code', 'new-code');
    expect(await decryptString(keyHolder.get()!, ciphertext)).toBe(SECRET);
    lock();
    await expect(unlockWithPasscode('old-code')).rejects.toBeInstanceOf(WrongCredentialError);
    await unlockWithPasscode('new-code');
    expect(await revealField(fields[0])).toBe(SECRET);
  });
});
