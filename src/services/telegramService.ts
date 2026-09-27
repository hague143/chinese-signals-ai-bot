// src/services/telegramService.ts

import { MasterSignalOutput } from '../types/signal';

export class TelegramService {
  /**
   * Format signal according to exact specification in section 32
   */
  public static formatSignalMessage(signal: MasterSignalOutput): string {
    const timeStr = new Date(signal.timestamp).toTimeString().split(' ')[0];
    const signalEmoji = signal.direction === 'CALL' ? 'CALL 🟢' : signal.direction === 'PUT' ? 'PUT 🔴' : 'WAIT 🟡';

    const reasonsFormatted = signal.analysisReasons
      .slice(0, 5)
      .map(r => r.replace(/^[✓•\s]+/, ''))
      .join('\n');

    return `━━━━━━━━━━━━━━━━
CHINESE SIGNALS AI
━━━━━━━━━━━━━━━━

PAIR:
${signal.symbol}

SIGNAL:
${signalEmoji}

EXPIRY:
${signal.expiry.toUpperCase()} (${signal.expirySeconds} SEC)

CONFIDENCE:
${Math.round(signal.confidence)}%

TREND:
${signal.trend.replace('_', ' ')}

MOMENTUM:
${signal.momentum}

AI AGREEMENT:
${signal.modelAgreement.agreementRatio}

MARKET:
${signal.marketType}

ENTRY REF:
${signal.entryPrice}

TIME:
${timeStr}

━━━━━━━━━━━━━━━━
AI ANALYSIS
━━━━━━━━━━━━━━━━

${reasonsFormatted}

Note:
Signal is an analytical output, not a guarantee. Trading involves risk.`;
  }

  /**
   * Send alert to Telegram Bot API if configured
   */
  public static async sendSignalAlert(
    signal: MasterSignalOutput,
    botToken: string,
    chatId: string
  ): Promise<{ success: boolean; message: string }> {
    if (!botToken || !chatId) {
      return { success: false, message: 'Telegram Bot Token or Chat ID not configured.' };
    }

    const message = this.formatSignalMessage(signal);
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });

      const data = await response.json();
      if (data.ok) {
        return { success: true, message: 'Telegram alert dispatched successfully.' };
      } else {
        return { success: false, message: data.description || 'Telegram API rejected message.' };
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Network error';
      return { success: false, message: `Failed to connect to Telegram: ${errorMsg}` };
    }
  }
}
