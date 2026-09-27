// src/providers/marketDataProvider.ts

import { OTCPair, Candle, Tick, MarketStatus, Timeframe } from '../types/market';

export interface MarketDataProvider {
  readonly name: string;
  readonly isDemo: boolean;

  getAvailablePairs(): Promise<OTCPair[]>;
  getCurrentPrice(symbol: string): Promise<number>;
  getCandles(symbol: string, timeframe: Timeframe, limit?: number): Promise<Candle[]>;
  getTicks(symbol: string, limit?: number): Promise<Tick[]>;
  subscribeToPrice(symbol: string, callback: (price: number, tick: Tick) => void): () => void;
  getMarketStatus(): Promise<MarketStatus>;
}
