import { beforeEach, describe, expect, it } from 'vitest';
import { resetTestStorage } from '@/test/setup';
import { keyHolder } from '@/crypto/keyHolder';
import { setupPasscode, unlockWithPasscode } from '@/security/securityService';
import { useSessionStore } from './sessionStore';

describe('session lock', () => {
  beforeEach(async () => {
    await resetTestStorage();
    useSessionStore.setState({ locked: false, lastAuthAt: 0, backgroundedAt: null, securityConfigured: false });
  });

  it('clears the in-memory vault key on lockApp', async () => {
    await setupPasscode('abcd');
    expect(keyHolder.has()).toBe(true);
    useSessionStore.getState().lockApp();
    expect(keyHolder.has()).toBe(false);
    expect(useSessionStore.getState().locked).toBe(true);
    await unlockWithPasscode('abcd');
    useSessionStore.getState().unlockApp();
    expect(useSessionStore.getState().locked).toBe(false);
    expect(keyHolder.has()).toBe(true);
  });
});
