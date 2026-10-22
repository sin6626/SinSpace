export class BrowserNotification {
  constructor() {
    void this.initNotice()
  }

  async initNotice(): Promise<boolean> {
    if (!('Notification' in window)) return false
    if (Notification.permission !== 'default') {
      return Notification.permission === 'granted'
    }
    try {
      return (await Notification.requestPermission()) === 'granted'
    } catch {
      return false
    }
  }

  async notice(
    title: string,
    body: string,
    options: Omit<NotificationOptions, 'body'> = {},
  ): Promise<Notification | undefined> {
    if (document.hasFocus() || !(await this.initNotice())) return
    try {
      return new Notification(title, { body, ...options })
    } catch {
      return undefined
    }
  }
}
