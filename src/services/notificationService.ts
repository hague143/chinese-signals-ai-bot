// src/services/notificationService.ts

import { MasterSignalOutput } from '../types/signal';

export class NotificationService {
  public static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }
    if (Notification.permission === 'granted') {
      return true;
    }
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  public static showSignalNotification(signal: MasterSignalOutput) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const title = `🚨 ${signal.direction} Signal: ${signal.symbol} (${signal.expiry})`;
    const options: NotificationOptions = {
      body: `Confidence: ${Math.round(signal.confidence)}% | Trend: ${signal.trend}\n${signal.analysisReasons[0] || 'High model consensus'}`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `signal-${signal.id}`,
    };

    try {
      new Notification(title, options);
    } catch {
      // Ignore notification errors
    }
  }
}
