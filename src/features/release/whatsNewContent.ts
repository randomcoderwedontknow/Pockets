import { APP_VERSION } from '@/version';
import { WHATS_NEW_V11_BULLETS, WHATS_NEW_V11_TITLE } from './whatsNewV11';
import { WHATS_NEW_V111_BULLETS, WHATS_NEW_V111_TITLE } from './whatsNewV111';
import { WHATS_NEW_V112_BULLETS, WHATS_NEW_V112_TITLE } from './whatsNewV112';
import { WHATS_NEW_V113_BULLETS, WHATS_NEW_V113_TITLE } from './whatsNewV113';
import { WHATS_NEW_V114_BULLETS, WHATS_NEW_V114_TITLE } from './whatsNewV114';

export function whatsNewForVersion(version = APP_VERSION): { title: string; bullets: string[] } {
  if (version.startsWith('11.1.4')) {
    return { title: WHATS_NEW_V114_TITLE, bullets: WHATS_NEW_V114_BULLETS };
  }
  if (version.startsWith('11.1.3')) {
    return { title: WHATS_NEW_V113_TITLE, bullets: WHATS_NEW_V113_BULLETS };
  }
  if (version.startsWith('11.1.2')) {
    return { title: WHATS_NEW_V112_TITLE, bullets: WHATS_NEW_V112_BULLETS };
  }
  if (version.startsWith('11.1')) {
    return { title: WHATS_NEW_V111_TITLE, bullets: WHATS_NEW_V111_BULLETS };
  }
  return { title: WHATS_NEW_V11_TITLE, bullets: WHATS_NEW_V11_BULLETS };
}
