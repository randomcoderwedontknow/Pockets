import type { StorageAdapter } from './StorageAdapter';
import { DexieStorage } from './DexieStorage';

let instance: StorageAdapter | null = null;

/**
 * Returns the app-wide storage adapter. IndexedDB works identically inside a
 * Capacitor WebView, so the same adapter is used on Android. A native
 * encrypted store can be selected here later based on `isNative()`.
 */
export function getStorage(): StorageAdapter {
  if (!instance) instance = new DexieStorage();
  return instance;
}

/** Test/DI hook. */
export function setStorage(adapter: StorageAdapter) {
  instance = adapter;
}

export type { StorageAdapter } from './StorageAdapter';
