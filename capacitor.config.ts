import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zanosamu.ridewithme',
  appName: 'ONTHEMUV',
  webDir: 'out',
  server: {
    androidScheme: 'https' 
  }
};

export default config;