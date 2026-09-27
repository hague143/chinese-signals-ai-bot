// src/services/storageService.ts

import { OTCPair } from '../types/market';
import { MasterSignalOutput } from '../types/signal';
import { UserSettings, AdminConfig } from '../types/settings';
import { BacktestResult } from '../types/backtest';

const DEFAULT_OTC_PAIRS: OTCPair[] = [
  {
    id: 'otc-eurusd',
    symbol: 'EUR/USD OTC',
    displayName: 'EUR/USD OTC',
    baseAsset: 'EUR',
    quoteAsset: 'USD',
    broker: 'Quotex',
    marketType: 'OTC',
    isActive: true,
    payoutRate: 89,
    lastPrice: 1.08452,
    change24h: 0.38,
    high24h: 1.08920,
    low24h: 1.07980,
    decimals: 5,
    category: 'Currencies',
    lastUpdated: Date.now(),
  },
  {
    id: 'otc-gbpusd',
    symbol: 'GBP/USD OTC',
    displayName: 'GBP/USD OTC',
    baseAsset: 'GBP',
    quoteAsset: 'USD',
    broker: 'Quotex',
    marketType: 'OTC',
    isActive: true,
    payoutRate: 87,
    lastPrice: 1.29340,
    change24h: -0.22,
    high24h: 1.29850,
    low24h: 1.28910,
    decimals: 5,
    category: 'Currencies',
    lastUpdated: Date.now(),
  },
  {
    id: 'otc-usdjpy',
    symbol: 'USD/JPY OTC',
    displayName: 'USD/JPY OTC',
    baseAsset: 'USD',
    quoteAsset: 'JPY',
    broker: 'Quotex',
    marketType: 'OTC',
    isActive: true,
    payoutRate: 85,
    lastPrice: 154.680,
    change24h: 0.54,
    high24h: 155.120,
    low24h: 153.950,
    decimals: 3,
    category: 'Currencies',
    lastUpdated: Date.now(),
  },
  {
    id: 'otc-audusd',
    symbol: 'AUD/USD OTC',
    displayName: 'AUD/USD OTC',
    baseAsset: 'AUD',
    quoteAsset: 'USD',
    broker: 'Quotex',
    marketType: 'OTC',
    isActive: true,
    payoutRate: 86,
    lastPrice: 0.65420,
    change24h: 0.15,
    high24h: 0.65800,
    low24h: 0.65100,
    decimals: 5,
    category: 'Currencies',
    lastUpdated: Date.now(),
  },
  {
    id: 'otc-usdcad',
    symbol: 'USD/CAD OTC',
    displayName: 'USD/CAD OTC',
    baseAsset: 'USD',
    quoteAsset: 'CAD',
    broker: 'Quotex',
    marketType: 'OTC',
    isActive: true,
    payoutRate: 88,
    lastPrice: 1.38210,
    change24h: -0.18,
    high24h: 1.38650,
    low24h: 1.37800,
    decimals: 5,
    category: 'Currencies',
    lastUpdated: Date.now(),
  },
  {
    id: 'otc-eurgbp',
    symbol: 'EUR/GBP OTC',
    displayName: 'EUR/GBP OTC',
    baseAsset: 'EUR',
    quoteAsset: 'GBP',
    broker: 'Quotex',
    marketType: 'OTC',
    isActive: true,
    payoutRate: 84,
    lastPrice: 0.83850,
    change24h: 0.45,
    high24h: 0.84150,
    low24h: 0.83400,
    decimals: 5,
    category: 'Currencies',
    lastUpdated: Date.now(),
  },
  {
    id: 'otc-eurjpy',
    symbol: 'EUR/JPY OTC',
    displayName: 'EUR/JPY OTC',
    baseAsset: 'EUR',
    quoteAsset: 'JPY',
    broker: 'Quotex',
    marketType: 'OTC',
    isActive: true,
    payoutRate: 87,
    lastPrice: 167.750,
    change24h: 0.82,
    high24h: 168.200,
    low24h: 166.900,
    decimals: 3,
    category: 'Currencies',
    lastUpdated: Date.now(),
  },
  {
    id: 'otc-gbpjpy',
    symbol: 'GBP/JPY OTC',
    displayName: 'GBP/JPY OTC',
    baseAsset: 'GBP',
    quoteAsset: 'JPY',
    broker: 'Quotex',
    marketType: 'OTC',
    isActive: true,
    payoutRate: 86,
    lastPrice: 200.080,
    change24h: 0.31,
    high24h: 200.850,
    low24h: 199.200,
    decimals: 3,
    category: 'Currencies',
    lastUpdated: Date.now(),
  },
  {
    id: 'otc-nzdusd',
    symbol: 'NZD/USD OTC',
    displayName: 'NZD/USD OTC',
    baseAsset: 'NZD',
    quoteAsset: 'USD',
    broker: 'Quotex',
    marketType: 'OTC',
    isActive: true,
    payoutRate: 83,
    lastPrice: 0.59230,
    change24h: -0.40,
    high24h: 0.59600,
    low24h: 0.58900,
    decimals: 5,
    category: 'Currencies',
    lastUpdated: Date.now(),
  },
  {
    id: 'otc-btcusd',
    symbol: 'BTC/USD OTC',
    displayName: 'BTC/USD OTC',
    baseAsset: 'BTC',
    quoteAsset: 'USD',
    broker: 'Quotex',
    marketType: 'OTC',
    isActive: true,
    payoutRate: 91,
    lastPrice: 94250.00,
    change24h: 2.85,
    high24h: 95500.00,
    low24h: 92800.00,
    decimals: 2,
    category: 'Crypto',
    lastUpdated: Date.now(),
  },
  {
    id: 'otc-gold',
    symbol: 'GOLD (OTC)',
    displayName: 'GOLD (OTC)',
    baseAsset: 'XAU',
    quoteAsset: 'USD',
    broker: 'Quotex',
    marketType: 'OTC',
    isActive: true,
    payoutRate: 90,
    lastPrice: 2642.50,
    change24h: 0.65,
    high24h: 2655.00,
    low24h: 2630.00,
    decimals: 2,
    category: 'Commodities',
    lastUpdated: Date.now(),
  },
  {
    id: 'otc-silver',
    symbol: 'SILVER (OTC)',
    displayName: 'SILVER (OTC)',
    baseAsset: 'XAG',
    quoteAsset: 'USD',
    broker: 'Quotex',
    marketType: 'OTC',
    isActive: true,
    payoutRate: 82,
    lastPrice: 31.450,
    change24h: 1.10,
    high24h: 31.900,
    low24h: 30.800,
    decimals: 3,
    category: 'Commodities',
    lastUpdated: Date.now(),
  }
];

export const DEFAULT_USER_SETTINGS: UserSettings = {
  broker: 'Quotex',
  market: 'OTC',
  dataMode: 'DEMO',
  defaultExpiry: '30s',
  minConfidenceThreshold: 70, // Balanced 70% threshold
  signalCooldownSeconds: 5,
  requireMultiTimeframeConfirmation: false,
  requireModelConsensus: false,
  soundAlertsEnabled: true,
  browserNotificationsEnabled: false,
  autoResolveSignals: true,
  weights: {
    technicalAgreement: 20,
    trendAgreement: 15,
    momentum: 20,
    priceAction: 15,
    volatilityRegime: 10,
    mlPrediction: 20,
  },
  telegram: {
    enabled: false,
    botToken: '',
    chatId: '',
    sendOnSignal: false,
    minConfidenceToSend: 75,
  },
};

export const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  maintenanceMode: false,
  maxSignalGenerationPerMinute: 60,
  allowManualSignalResolution: true,
  systemHealthStatus: 'HEALTHY',
  dataFeedLatencyMs: 18,
  dataHealthScore: 99.4,
};

function hasLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export class StorageService {
  private static KEYS = {
    PAIRS: 'cs_ai_otc_pairs',
    SETTINGS: 'cs_ai_user_settings',
    ADMIN_CONFIG: 'cs_ai_admin_config',
    SIGNALS: 'cs_ai_signals_history',
    BACKTESTS: 'cs_ai_backtest_runs',
  };

  public static getOTCPairs(): OTCPair[] {
    if (hasLocalStorage()) {
      try {
        const data = localStorage.getItem(this.KEYS.PAIRS);
        if (data) return JSON.parse(data);
      } catch {
        // fallback
      }
    }
    return DEFAULT_OTC_PAIRS;
  }

  public static saveOTCPairs(pairs: OTCPair[]): void {
    if (hasLocalStorage()) {
      try {
        localStorage.setItem(this.KEYS.PAIRS, JSON.stringify(pairs));
      } catch {
        // ignore
      }
    }
  }

  public static addOTCPair(pair: OTCPair): void {
    const pairs = this.getOTCPairs();
    const existingIdx = pairs.findIndex(p => p.symbol.toLowerCase() === pair.symbol.toLowerCase());
    if (existingIdx >= 0) {
      pairs[existingIdx] = pair;
    } else {
      pairs.push(pair);
    }
    this.saveOTCPairs(pairs);
  }

  public static getUserSettings(): UserSettings {
    if (hasLocalStorage()) {
      try {
        const data = localStorage.getItem(this.KEYS.SETTINGS);
        if (data) return { ...DEFAULT_USER_SETTINGS, ...JSON.parse(data) };
      } catch {
        // fallback
      }
    }
    return DEFAULT_USER_SETTINGS;
  }

  public static saveUserSettings(settings: UserSettings): void {
    if (hasLocalStorage()) {
      try {
        localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
      } catch {
        // ignore
      }
    }
  }

  public static getAdminConfig(): AdminConfig {
    if (hasLocalStorage()) {
      try {
        const data = localStorage.getItem(this.KEYS.ADMIN_CONFIG);
        if (data) return { ...DEFAULT_ADMIN_CONFIG, ...JSON.parse(data) };
      } catch {
        // fallback
      }
    }
    return DEFAULT_ADMIN_CONFIG;
  }

  public static saveAdminConfig(config: AdminConfig): void {
    if (hasLocalStorage()) {
      try {
        localStorage.setItem(this.KEYS.ADMIN_CONFIG, JSON.stringify(config));
      } catch {
        // ignore
      }
    }
  }

  public static getSignals(): MasterSignalOutput[] {
    if (hasLocalStorage()) {
      try {
        const data = localStorage.getItem(this.KEYS.SIGNALS);
        if (data) return JSON.parse(data);
      } catch {
        // fallback
      }
    }
    return [];
  }

  public static saveSignals(signals: MasterSignalOutput[]): void {
    if (hasLocalStorage()) {
      try {
        localStorage.setItem(this.KEYS.SIGNALS, JSON.stringify(signals.slice(-500)));
      } catch {
        // ignore
      }
    }
  }

  public static addSignal(signal: MasterSignalOutput): void {
    const signals = this.getSignals();
    signals.unshift(signal);
    this.saveSignals(signals);
  }

  public static updateSignal(signalId: string, updates: Partial<MasterSignalOutput>): void {
    const signals = this.getSignals();
    const idx = signals.findIndex(s => s.id === signalId);
    if (idx !== -1) {
      signals[idx] = { ...signals[idx], ...updates };
      this.saveSignals(signals);
    }
  }

  public static getBacktests(): BacktestResult[] {
    if (hasLocalStorage()) {
      try {
        const data = localStorage.getItem(this.KEYS.BACKTESTS);
        if (data) return JSON.parse(data);
      } catch {
        // fallback
      }
    }
    return [];
  }

  public static saveBacktest(result: BacktestResult): void {
    if (hasLocalStorage()) {
      try {
        const runs = this.getBacktests();
        runs.unshift(result);
        localStorage.setItem(this.KEYS.BACKTESTS, JSON.stringify(runs.slice(0, 20)));
      } catch {
        // ignore
      }
    }
  }
}
