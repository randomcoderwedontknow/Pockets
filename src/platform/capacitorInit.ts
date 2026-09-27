import { isNative } from './platform';

/** Native shell setup (status bar, splash). Safe to call on web — no-op. */
export async function initCapacitorShell(): Promise<void> {
  if (!isNative()) return;

  const [{ StatusBar, Style }, { SplashScreen }] = await Promise.all([
    import('@capacitor/status-bar'),
    import('@capacitor/splash-screen'),
  ]);

  const dark = document.documentElement.dataset.theme === 'dark';
  try {
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: dark ? '#16131f' : '#f5f3f8' });
  } catch {
    /* unsupported on some WebViews */
  }

  try {
    await SplashScreen.hide();
  } catch {
    /* ignore */
  }
}
