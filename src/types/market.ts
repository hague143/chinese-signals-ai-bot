// src/types/market.ts

export type ExpiryDuration = '5s' | '10s' | '15s' | '30s' | '45s' | '1m';

export const EXPIRY_SECONDS_MAP: Record<ExpiryDuration, number> = {
  '5s': 5,
  '10s': 10,
  '15s': 15,
  '30s': 30,
  '45s': 45,
  '1m': 60,
};

export type MarketType = 'OTC' | 'LIVE_FOREX' | 'CRYPTO' | 'COMMODITIES';

export interface OTCPair {
  id: string;
  symbol: string;           // e.g. "EUR/USD OTC"
  displayName: string;      // e.g. "EUR/USD OTC"
  baseAsset: string;        // "EUR"
  quoteAsset: string;       // "USD"
  broker: 'Quotex';
  marketType: MarketType;
  isActive: boolean;
  payoutRate: number;       // e.g. 88 (88%)
  lastPrice: number;
  change24h: number;        // percentage e.g. +0.42%
  high24h: number;
  low24h: number;
  decimals: number;         // 5 for EUR/USD, 3 for USD/JPY, 2 for crypto
  category: 'Currencies' | 'Crypto' | 'Commodities' | 'Indices';
  lastUpdated: number;
}

export interface Candle {
  time: number;    // UNIX timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Tick {
  time: number;    // timestamp in ms
  price: number;
  volume: number;
  direction?: 'UP' | 'DOWN' | 'FLAT';
}

export type Timeframe = '1s' | '5s' | '10s' | '15s' | '30s' | '1m' | '5m' | '15m';

export interface MarketStatus {
  broker: string;
  market: string;
  isConnected: boolean;
  isDemo: boolean;
  dataQuality: 'OPTIMAL' | 'DEGRADED' | 'STALE' | 'OFFLINE';
  latencyMs: number;
  lastHeartbeat: number;
  activePairsCount: number;
}

export interface DataQualityReport {
  isFresh: boolean;
  candleCount: number;
  timeSinceLastTickMs: number;
  hasGaps: boolean;
  priceSpikeDetected: boolean;
  qualityScore: number; // 0 - 100
  qualityLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'STALE';
  statusMessage: string;
}
