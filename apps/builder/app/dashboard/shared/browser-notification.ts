/**
 * Browser Notification API wrapper.
 *
 * Requests permission on first call to `requestNotificationPermission()`
 * and shows native notifications via `showBrowserNotification()`.
 *
 * Falls back to a no-op when:
 * - The Notification API is unavailable (e.g. SSR / insecure context).
 * - The user has denied permission.
 * - The tab is currently focused (the in-app toast handles that case).
 */

/**
 * Ask for Notification permission. Should be called early (e.g.
 * dashboard mount) so that subsequent notifications can fire.
 *
 * Resolves to the resulting `NotificationPermission` string.
 */
export const requestNotificationPermission =
  async (): Promise<NotificationPermission> => {
    if (typeof Notification === "undefined") {
      return "denied";
    }
    if (Notification.permission === "granted") {
      return "granted";
    }
    if (Notification.permission === "denied") {
      return "denied";
    }
    // "default" — ask the user.
    return Notification.requestPermission();
  };

/**
 * Show a native browser notification.
 *
 * Will silently no-op when:
 * - Permission hasn't been granted.
 * - The tab is currently focused (the in-app toast is enough).
 */
export const showBrowserNotification = (
  title: string,
  options?: NotificationOptions
) => {
  if (typeof Notification === "undefined") {
    return;
  }
  if (Notification.permission !== "granted") {
    return;
  }
  // Skip when the user is already looking at the page — the in-app
  // toast handles that case.
  if (document.hasFocus()) {
    return;
  }
  const notification = new Notification(title, options);
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
};
