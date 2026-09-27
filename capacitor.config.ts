import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.pockets.vault',
  appName: 'Pockets',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#f5f3f8',
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 0,
      backgroundColor: '#f5f3f8',
      androidSplashResourceName: 'splash',
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#f5f3f8',
    },
  },
};

export default config;
