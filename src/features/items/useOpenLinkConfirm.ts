import { useState } from 'react';
import { hostnameOf, normalizeHttpUrl } from '@/lib/urls';
import { openExternalUrl } from '@/platform/openUrl';
import { toast } from '@/components/Toast';

export function useOpenLinkConfirm() {
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const requestOpen = (raw: string) => {
    const href = normalizeHttpUrl(raw);
    if (!href) {
      toast('That link is not valid.', 'error');
      return;
    }
    setPendingUrl(href);
  };

  const confirmOpen = async () => {
    if (!pendingUrl) return;
    try {
      await openExternalUrl(pendingUrl);
    } catch (e) {
      toast((e as Error).message || 'Could not open link', 'error');
    } finally {
      setPendingUrl(null);
    }
  };

  const cancelOpen = () => setPendingUrl(null);

  const confirmProps = pendingUrl
    ? {
        open: true as const,
        title: 'Open link?',
        message: `Opens ${hostnameOf(pendingUrl)} in your browser.`,
        confirmLabel: 'Open',
        onConfirm: () => void confirmOpen(),
        onClose: cancelOpen,
      }
    : null;

  return { requestOpen, confirmProps };
}
