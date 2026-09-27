import { useEffect, useRef, useState } from 'react';
import { SettingsSubHeader } from './SettingsScreen';
import { Button } from '@/components/Button';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { Sheet } from '@/components/Sheet';
import { toast } from '@/components/Toast';
import { formatBytes } from '@/lib/format';
import { getStorage } from '@/platform/storage';
import type { StorageEstimate } from '@/platform/storage/StorageAdapter';
import {
  buildDecryptedExport,
  buildEncryptedExport,
  importSnapshot,
  parseExport,
} from '@/data/exportImport';
import { useVaultStore } from '@/store/vaultStore';
import { useAccountStore } from '@/store/accountStore';
import { useSessionStore } from '@/store/sessionStore';
import { hasPasscode } from '@/security/securityService';
import { requestAuthentication } from '@/features/lock/authFlow';

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DataSettings() {
  const [est, setEst] = useState<StorageEstimate | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [readableConfirm, setReadableConfirm] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importModeOpen, setImportModeOpen] = useState(false);

  useEffect(() => {
    void getStorage().estimate().then(setEst);
  }, []);

  const exportEncrypted = async () => {
    const exp = await buildEncryptedExport();
    download(`pockets-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(exp, null, 2));
    toast('Export saved');
  };

  const exportDecrypted = async () => {
    if (await hasPasscode()) {
      const ok = await requestAuthentication({ reason: 'Unlock to export readable data', requireKey: true });
      if (!ok) return;
    }
    const exp = await buildDecryptedExport();
    download(`pockets-readable-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(exp, null, 2));
    toast('Readable export saved');
  };

  const runImport = async (mode: 'replace' | 'merge') => {
    const file = importFile;
    if (!file) return;
    setImportModeOpen(false);
    setImportFile(null);
    try {
      const raw = JSON.parse(await file.text());
      const exp = parseExport(raw);
      await importSnapshot(exp, mode);
      await useVaultStore.getState().reload();
      await useAccountStore.getState().load();
      useSessionStore.getState().setSecurityConfigured(!!exp.security || (await hasPasscode()));
      toast(mode === 'replace' ? 'Vault replaced from import' : 'Import merged');
      void getStorage().estimate().then(setEst);
    } catch (e) {
      toast((e as Error).message || 'Could not import', 'error');
    }
  };

  return (
    <div className="page page--no-nav">
      <SettingsSubHeader title="Data" />
      <section className="stack">
        <p className="text-secondary">
          Everything lives on this device. A regular export keeps protected values encrypted.
        </p>
        <Button block onClick={exportEncrypted}>
          Export Pockets
        </Button>
        <Button variant="secondary" block onClick={() => setReadableConfirm(true)}>
          Export readable copy…
        </Button>
        <Button variant="secondary" block onClick={() => fileRef.current?.click()}>
          Import Pockets
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              setImportFile(f);
              setImportModeOpen(true);
            }
            e.target.value = '';
          }}
        />
      </section>

      <section className="section">
        <div className="section-title">Storage</div>
        <div className="list">
          <div className="list-item">
            <div className="list-item__body">
              <div className="list-item__title">Pockets</div>
            </div>
            <span>{est?.pocketCount ?? '—'}</span>
          </div>
          <div className="list-item">
            <div className="list-item__body">
              <div className="list-item__title">Items</div>
            </div>
            <span>{est?.itemCount ?? '—'}</span>
          </div>
          <div className="list-item">
            <div className="list-item__body">
              <div className="list-item__title">Fields</div>
            </div>
            <span>{est?.fieldCount ?? '—'}</span>
          </div>
          <div className="list-item">
            <div className="list-item__body">
              <div className="list-item__title">Estimated use</div>
            </div>
            <span>
              {formatBytes(est?.usageBytes ?? null)}
              {est?.quotaBytes ? ` / ${formatBytes(est.quotaBytes)}` : ''}
            </span>
          </div>
        </div>
      </section>

      <ConfirmSheet
        open={readableConfirm}
        title="Readable export"
        message="This export writes protected information as plain text. Anyone with the file can read it. Continue?"
        confirmLabel="Export readable copy"
        danger
        onConfirm={() => void exportDecrypted()}
        onClose={() => setReadableConfirm(false)}
      />

      <Sheet open={importModeOpen} onClose={() => { setImportModeOpen(false); setImportFile(null); }} title="Import backup">
        <p className="text-secondary" style={{ marginBottom: 16 }}>
          Replace wipes current pockets and items, then loads the file. Merge adds only items that are not already here.
        </p>
        <div className="stack">
          <Button block variant="danger" onClick={() => void runImport('replace')}>
            Replace everything
          </Button>
          <Button block variant="secondary" onClick={() => void runImport('merge')}>
            Merge new items only
          </Button>
          <Button block variant="ghost" onClick={() => { setImportModeOpen(false); setImportFile(null); }}>
            Cancel
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
