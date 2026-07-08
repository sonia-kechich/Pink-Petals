import type { AccentColor } from "../types";

declare global {
  interface Window {
    Capacitor?: {
      isNative?: boolean;
      registerPlugin?: (name: string) => any;
      Plugins?: Record<string, any>;
    };
  }
}

/** Sets the app icon for both Capacitor (native) and PWA environments. */
export async function setAppIcon(color: AccentColor): Promise<void> {
  // Native (Capacitor) path
  if (window.Capacitor?.isNative) {
    try {
      const { AppIcon } = window.Capacitor.Plugins || {};
      if (AppIcon?.setIcon) {
        await AppIcon.setIcon({ color });
      }
    } catch {
      // Plugin not available
    }
    return;
  }

  // PWA path — update manifest link icons dynamically
  updatePWAIcons(color);
}

function updatePWAIcons(color: AccentColor) {
  // Update apple-touch-icon
  const appleLink = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (appleLink) {
    appleLink.href = `/icons/${color}/apple-touch-icon.png`;
  }

  // Update PWA manifest via the manifest link
  // For PWA, we update the icons array in the manifest
  const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (manifestLink) {
    fetch(manifestLink.href)
      .then((r) => r.json())
      .then((manifest) => {
        manifest.icons = [
          { src: `/icons/${color}/icon-192.png`, sizes: "192x192", type: "image/png" },
          { src: `/icons/${color}/icon-512.png`, sizes: "512x512", type: "image/png" },
          { src: `/icons/${color}/maskable-192.png`, sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: `/icons/${color}/maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
        ];
        // Create a blob URL for the updated manifest
        const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
        manifestLink.href = URL.createObjectURL(blob);
      })
      .catch(() => {});
  }

  // Update favicon
  const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (favicon) {
    favicon.href = `/favicon.svg`;
  }
}
