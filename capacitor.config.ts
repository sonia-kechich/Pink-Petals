import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "tn.iris.pinkpetals",
  appName: "Pink Petals",
  webDir: "dist",
  backgroundColor: "#fff5f8",
  android: {
    backgroundColor: "#fff5f8",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#fff5f8ff",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;
