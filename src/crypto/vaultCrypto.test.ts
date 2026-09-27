import { describe, expect, it } from 'vitest';
import {
  decryptString,
  DecryptError,
  deriveKek,
  encryptString,
  generateVaultKey,
  newKdfParams,
  unwrapVaultKey,
  wrapVaultKey,
  WrongCredentialError,
} from './vaultCrypto';

describe('vault crypto', () => {
  it('derives the same KEK for the same passcode and salt', async () => {
    const kdf = newKdfParams(10_000);
    const a = await deriveKek('secret-phrase', kdf);
    const b = await deriveKek('secret-phrase', kdf);
    const key = await generateVaultKey();
    const wrapped = await wrapVaultKey(key, a);
    const unwrapped = await unwrapVaultKey(wrapped, b);
    const ct = await encryptString(key, 'hello');
    expect(await decryptString(unwrapped, ct)).toBe('hello');
  });

  it('rejects a wrong passcode on unwrap', async () => {
    const kdf = newKdfParams(10_000);
    const kek = await deriveKek('correct-horse', kdf);
    const key = await generateVaultKey();
    const wrapped = await wrapVaultKey(key, kek);
    const wrong = await deriveKek('wrong-battery', kdf);
    await expect(unwrapVaultKey(wrapped, wrong)).rejects.toBeInstanceOf(WrongCredentialError);
  });

  it('round-trips AES-GCM strings', async () => {
    const key = await generateVaultKey();
    const ct = await encryptString(key, 'GTX 970 secret');
    expect(ct.iv).toBeTruthy();
    expect(ct.ct).toBeTruthy();
    expect(ct.ct).not.toContain('970');
    expect(await decryptString(key, ct)).toBe('GTX 970 secret');
  });

  it('rejects tampered ciphertext', async () => {
    const key = await generateVaultKey();
    const ct = await encryptString(key, 'do not leak');
    const tampered = { ...ct, ct: ct.ct.slice(0, -2) + (ct.ct.endsWith('AA') ? 'BB' : 'AA') };
    await expect(decryptString(key, tampered)).rejects.toBeInstanceOf(DecryptError);
  });
});
