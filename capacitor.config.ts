import type { CapacitorConfig } from "@capacitor/cli";

// The native shell loads the published Ghost site, so the offline worker and saved chats work inside the APK.
const config: CapacitorConfig = {
  appId: "app.lovable.c7fd19e831c444ef89ff4371782a1dc6",
  appName: "Ghost",
  webDir: "www",
  server: {
    url: "https://ghosts.abisinyabet.com",
    cleartext: false,
  },
  android: { allowMixedContent: false },
  plugins: { SplashScreen: { launchShowDuration: 1200, backgroundColor: "#f8faff" } },
};

export default config;
