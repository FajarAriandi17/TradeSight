/** Notifikasi desktop (Web Notification API — didukung WebView Tauri & browser). */
export async function notify(title: string, body: string) {
  try {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') await Notification.requestPermission()
    if (Notification.permission === 'granted') new Notification(title, { body })
  } catch {
    /* ignore */
  }
}
