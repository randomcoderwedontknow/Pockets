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

```bash
npm run cap:sync
npm run cap:open:android
```

Then build the APK from Android Studio.

## Security notes

Pockets implements real encryption and real platform authentication. That does not make any vault “unhackable”. Keep a backup, choose a passcode you will remember, and do not export a readable copy unless you understand the risk.
