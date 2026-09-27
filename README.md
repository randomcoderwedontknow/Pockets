# Pockets

Your important information, always in your pocket.

Pockets is a local-first personal information vault. It is a mobile-first web app, designed for everyday use on a Samsung Galaxy A05, and ready to package with Capacitor for Android Studio.

Nothing is sent to a server. Protected values are encrypted on the device with a key derived from your passcode. Device biometrics (WebAuthn in the browser, Android BiometricPrompt in the native app) are used when available — never a fake fingerprint animation.

## Develop

```bash
npm install
npm run dev
```

Open `http://localhost:5173` on the phone or in a 360×800 mobile viewport.

```bash
npm test
npm run build
```

## Android (Capacitor)

1. Install [Android Studio](https://developer.android.com/studio) (SDK 36, JDK 17+).
2. Sync the web build into the native project:

```bash
npm install
npm run cap:sync
```

3. Open the **`android`** folder in Android Studio (not the repo root).
4. Connect your phone (USB debugging) or start an emulator (API 24+).
5. **Run** ▶ on app `app`.

Shortcut: `npm run cap:open:android` opens the project after sync.

After UI changes, run `npm run cap:sync` again before rebuilding in Android Studio.

### App icon

The launcher icon is generated from **`assets/icon.png`** (1024×1024 or larger, square). A copy lives at **`android/branding/pockets-app-icon.png`** for reference in Android Studio.

Regenerate all `mipmap-*` launcher and splash PNGs after you change the logo:

```bash
npm run icons:android
```

In Android Studio you can also use **File → New → Image Asset**, choose **Launcher Icons (Adaptive and Legacy)**, and point **Path** at `android/branding/pockets-app-icon.png`. This project already uses the generated files under `android/app/src/main/res/mipmap-*` — prefer `npm run icons:android` so web and native stay in sync.

Biometrics and secure storage use the Aparajita Capacitor plugins already wired in `AndroidManifest.xml`.

## Security notes

Pockets implements real encryption and real platform authentication. That does not make any vault “unhackable”. Keep a backup, choose a passcode you will remember, and do not export a readable copy unless you understand the risk.
