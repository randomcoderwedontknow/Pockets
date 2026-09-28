import { APP_VERSION } from '@/version';
import { WHATS_NEW_V11_BULLETS, WHATS_NEW_V11_TITLE } from './whatsNewV11';
import { WHATS_NEW_V111_BULLETS, WHATS_NEW_V111_TITLE } from './whatsNewV111';

export function whatsNewForVersion(version = APP_VERSION): { title: string; bullets: string[] } {
  if (version.startsWith('11.1')) {
    return { title: WHATS_NEW_V111_TITLE, bullets: WHATS_NEW_V111_BULLETS };
  }
  return { title: WHATS_NEW_V11_TITLE, bullets: WHATS_NEW_V11_BULLETS };
}
