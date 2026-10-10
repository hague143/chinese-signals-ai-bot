// src/services/deviceService.ts

export class DeviceService {
  private static DEVICE_ID_KEY = 'cs_ai_device_id';

  /**
   * Get or generate a persistent UUID device ID for this client
   */
  public static getDeviceId(): string {
    if (typeof window === 'undefined') return 'server-env';

    try {
      let id = localStorage.getItem(this.DEVICE_ID_KEY);
      if (!id || id.length < 16) {
        id = this.generateUUID();
        localStorage.setItem(this.DEVICE_ID_KEY, id);
      }
      return id;
    } catch {
      return this.generateUUID();
    }
  }

  /**
   * Generate simple pseudo-UUID
   */
  private static generateUUID(): string {
    return 'dev-' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Get basic browser fingerprint string
   */
  public static getFingerprint(): string {
    if (typeof window === 'undefined') return 'unknown';

    try {
      const screenRes = `${window.screen?.width || 0}x${window.screen?.height || 0}x${window.screen?.colorDepth || 0}`;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const lang = navigator.language || 'en';
      const platform = (navigator as any).userAgentData?.platform || navigator.platform || 'unknown';
      const cores = navigator.hardwareConcurrency || 2;
      return `${platform}|${tz}|${screenRes}|${lang}|cores:${cores}`;
    } catch {
      return 'generic-browser';
    }
  }
}
