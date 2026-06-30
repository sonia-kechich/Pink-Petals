/**
 * One notification helper for both platforms:
 *   • Native (Capacitor / Android) → @capacitor/local-notifications, which
 *     works reliably from the WebView where the web Notification API doesn't.
 *   • Web / PWA → the standard Notification API.
 * The plugin is imported dynamically so the web bundle never loads native code.
 * Notifications are a nicety, so every path fails silently.
 */
function isNative(): boolean {
  return Boolean(
    (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
  );
}

/** Ask for permission once the user has opted in (native or web). */
export async function ensureNotifyPermission(): Promise<void> {
  try {
    if (isNative()) {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== "granted") await LocalNotifications.requestPermissions();
    } else if (typeof Notification !== "undefined" && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  } catch {
    /* optional */
  }
}

/** Show a notification now, if permission is granted. */
export async function notify(title: string, body: string): Promise<void> {
  try {
    if (isNative()) {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== "granted") return;
      await LocalNotifications.schedule({
        notifications: [{ id: Math.floor(Math.random() * 1_000_000) + 1, title, body }],
      });
    } else {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      new Notification(title, { body, icon: "/icons/icon-192.png" });
    }
  } catch {
    /* optional */
  }
}
