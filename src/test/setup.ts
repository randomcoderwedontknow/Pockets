import 'fake-indexeddb/auto';
import { setStorage } from '@/platform/storage';
import { DexieStorage } from '@/platform/storage/DexieStorage';
import { keyHolder } from '@/crypto/keyHolder';
import { resetVaultStoreLocks, useVaultStore } from '@/store/vaultStore';

let n = 0;

export async function resetTestStorage() {
  keyHolder.clear();
  resetVaultStoreLocks();
  useVaultStore.setState({
    loaded: false,
    vault: null,
    pockets: [],
    items: [],
    fieldsByItem: {},
    attachmentsByItem: {},
    tags: [],
  });
  const adapter = new DexieStorage(`pockets-test-${Date.now()}-${n++}`);
  setStorage(adapter);
  await adapter.init();
  return adapter;
}
