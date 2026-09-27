import { beforeEach, describe, expect, it } from 'vitest';
import { resetTestStorage } from '@/test/setup';
import {
  ensureOwnerUnlockSeeded,
  ownerSeedPasscode,
  verifyOwnerUnlock,
} from '@/security/ownerUnlockService';

describe('ownerUnlockService', () => {
  beforeEach(async () => {
    await resetTestStorage();
  });

  it('seeds verifier and accepts the seed passcode', async () => {
    await ensureOwnerUnlockSeeded();
    expect(await verifyOwnerUnlock(ownerSeedPasscode())).toBe(true);
  });

  it('rejects wrong passcode', async () => {
    await ensureOwnerUnlockSeeded();
    expect(await verifyOwnerUnlock('wrong-code')).toBe(false);
  });
});
