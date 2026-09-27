import { isNative } from '@/platform/platform';
import { normalizeHttpUrl } from '@/lib/urls';

export async function openExternalUrl(raw: string): Promise<void> {
  const href = normalizeHttpUrl(raw);
  if (!href) throw new Error('That link is not valid.');

  if (isNative()) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: href, presentationStyle: 'popover' });
    return;
  }
  window.open(href, '_blank', 'noopener,noreferrer');
}
