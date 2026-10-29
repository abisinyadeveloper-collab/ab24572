import type { CapacitorConfig } from "@capacitor/cli";

// The native shell loads the live Ghost site. After publishing, replace server.url with the published URL.
const config: CapacitorConfig = {
  appId: "app.lovable.c7fd19e831c444ef89ff4371782a1dc6",
  appName: "Ghost",
  webDir: "www",
  server: {
    url: "https://id-preview--c7fd19e8-31c4-44ef-89ff-4371782a1dc6.lovable.app?forceHideBadge=true",
    cleartext: true,
  },
};

export default config;
