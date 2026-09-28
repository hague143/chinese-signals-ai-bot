// src/providers/demoProvider.ts

import { MarketDataProvider } from './marketDataProvider';
import { OTCPair, Candle, Tick, MarketStatus, Timeframe } from '../types/market';
import { StorageService } from '../services/storageService';

interface SymbolState {
  currentPrice: number;
  drift: number;
  volatility: number;
  phase: number;
  lastTickTime: number;
  candleHistory1m: Candle[];
}

export class DemoProvider implements MarketDataProvider {
  public readonly name = 'Quotex OTC Demo Simulator';
  public readonly isDemo = true;

  private symbolStates: Map<string, SymbolState> = new Map();
  private subscribers: Map<string, Set<(price: number, tick: Tick) => void>> = new Map();
  private tickInterval: any = null;

  constructor() {
    this.initializeState();
    this.startLiveTickLoop();
  }

  private getSymbolHash(symbol: string): number {
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
      hash = (hash << 5) - hash + symbol.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  /**
   * Deterministic pseudo-random float [0, 1) based on integer seed
   */
  private pseudoRandom(seed: number): number {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  private initializeState() {
    const pairs = StorageService.getOTCPairs();
    const nowSec = Math.floor(Date.now() / 1000);
    const alignedNowSec = Math.floor(nowSec / 60) * 60;

    pairs.forEach(pair => {
      const hash = this.getSymbolHash(pair.symbol);
      const isPutBias = (hash % 2 === 0);
      const initialDrift = isPutBias ? -0.00008 : 0.00008;
      const decimals = pair.decimals || 5;
      const vol = (pair.category === 'Crypto' ? 0.0006 : 0.00015);
      const phase = (hash % 360) * (Math.PI / 180);

      // Generate consistent baseline 1m candles for each pair
      const candles1m: Candle[] = [];
      let p = pair.lastPrice;

      for (let i = 120; i >= 0; i--) {
        const time = alignedNowSec - i * 60;
        const t = 120 - i;
        
        // Deterministic macro trend wave per symbol
        const trendBias = isPutBias ? -0.4 : 0.4;
        const wave = Math.sin((t * 0.08) + phase) * 0.5 + trendBias;
        const seed = hash + time;
        const noise = (this.pseudoRandom(seed) - 0.5) * 0.6;
        const delta = (wave + noise) * vol * p;

        const open = Number(p.toFixed(decimals));
        const close = Number(Math.max(0.0001, open + delta).toFixed(decimals));
        const high = Number((Math.max(open, close) + Math.abs(noise) * vol * p * 0.8).toFixed(decimals));
        const low = Number((Math.min(open, close) - Math.abs(noise) * vol * p * 0.8).toFixed(decimals));
        const volume = Math.floor(Math.abs(Math.sin(t)) * 300) + 150;

        candles1m.push({ time, open, high, low, close, volume });
        p = close;
      }

      this.symbolStates.set(pair.symbol, {
        currentPrice: p,
        drift: initialDrift,
        volatility: vol,
        phase,
        lastTickTime: Date.now(),
        candleHistory1m: candles1m,
      });
    });
  }

  private startLiveTickLoop() {
    if (this.tickInterval) return;

    this.tickInterval = setInterval(() => {
      const nowMs = Date.now();
      const currentSec = Math.floor(nowMs / 1000);
      const currentCandleTime = Math.floor(currentSec / 60) * 60;

      this.symbolStates.forEach((state, symbol) => {
        const dt = 1;
        const randNormal = (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 1.732;
        
        const deltaPct = state.drift * dt + state.volatility * randNormal * 0.4;
        const oldPrice = state.currentPrice;
        let newPrice = oldPrice * (1 + deltaPct);

        const pairs = StorageService.getOTCPairs();
        const pairObj = pairs.find(p => p.symbol === symbol);
        const decimals = pairObj ? pairObj.decimals : 5;
        newPrice = Number(newPrice.toFixed(decimals));

        state.currentPrice = newPrice;
        state.lastTickTime = nowMs;

        // Update active in-memory 1m candle
        if (state.candleHistory1m.length > 0) {
          const lastCandle = state.candleHistory1m[state.candleHistory1m.length - 1];

          if (currentCandleTime > lastCandle.time) {
            // New 1m candle bar
            state.candleHistory1m.push({
              time: currentCandleTime,
              open: lastCandle.close,
              high: Math.max(lastCandle.close, newPrice),
              low: Math.min(lastCandle.close, newPrice),
              close: newPrice,
              volume: 20,
            });
            if (state.candleHistory1m.length > 200) {
              state.candleHistory1m.shift();
            }
          } else {
            // Update current bar
            lastCandle.close = newPrice;
            lastCandle.high = Math.max(lastCandle.high, newPrice);
            lastCandle.low = Math.min(lastCandle.low, newPrice);
            lastCandle.volume += 5;
          }
        }

        const tickDirection = newPrice > oldPrice ? 'UP' : newPrice < oldPrice ? 'DOWN' : 'FLAT';
        const tick: Tick = {
          time: nowMs,
          price: newPrice,
          volume: Math.floor(Math.random() * 50) + 10,
          direction: tickDirection,
        };

        const subs = this.subscribers.get(symbol);
        if (subs && subs.size > 0) {
          subs.forEach(cb => cb(newPrice, tick));
        }
      });
    }, 800);
  }

  public async getAvailablePairs(): Promise<OTCPair[]> {
    return StorageService.getOTCPairs();
  }

  public async getCurrentPrice(symbol: string): Promise<number> {
    const state = this.symbolStates.get(symbol);
    if (state) return state.currentPrice;
    const pairs = StorageService.getOTCPairs();
    const p = pairs.find(item => item.symbol === symbol);
    return p ? p.lastPrice : 1.0850;
  }

  /**
   * Return candles up to and including forming candle (or all candles)
   */
  public async getCandles(symbol: string, timeframe: Timeframe = '1m', limit = 100): Promise<Candle[]> {
    return this.getInternalCandles(symbol, timeframe, limit, false);
  }

  /**
   * Return strictly closed (completed) candles, omitting any in-progress bar
   */
  public async getClosedCandles(symbol: string, timeframe: Timeframe = '1m', limit = 100): Promise<Candle[]> {
    return this.getInternalCandles(symbol, timeframe, limit, true);
  }

  private getInternalCandles(symbol: string, timeframe: Timeframe = '1m', limit = 100, closedOnly = false): Candle[] {
    let state = this.symbolStates.get(symbol);
    if (!state) {
      this.initializeState();
      state = this.symbolStates.get(symbol);
    }
    const history1m = state?.candleHistory1m ? [...state.candleHistory1m] : [];

    if (history1m.length === 0) return [];

    let targetHistory = history1m;
    if (closedOnly && targetHistory.length > 1) {
      const currentSec = Math.floor(Date.now() / 1000);
      const last = targetHistory[targetHistory.length - 1];
      // If last candle started less than 60s ago, it is still forming
      if (currentSec - last.time < 60) {
        targetHistory = targetHistory.slice(0, -1);
      }
    }

    if (timeframe === '1m' || !timeframe) {
      return targetHistory.slice(-limit);
    }

    // Determine timeframe seconds
    let tfSec = 60;
    switch (timeframe) {
      case '1s': tfSec = 1; break;
      case '5s': tfSec = 5; break;
      case '10s': tfSec = 10; break;
      case '15s': tfSec = 15; break;
      case '30s': tfSec = 30; break;
      case '5m': tfSec = 300; break;
      case '15m': tfSec = 900; break;
      default: tfSec = 60; break;
    }

    if (tfSec > 60) {
      // Aggregate 1m bars into higher timeframe
      const aggregated: Candle[] = [];
      const bucketSize = tfSec / 60;
      for (let i = 0; i < targetHistory.length; i += bucketSize) {
        const slice = targetHistory.slice(i, i + bucketSize);
        if (slice.length > 0) {
          const open = slice[0].open;
          const close = slice[slice.length - 1].close;
          const high = Math.max(...slice.map(c => c.high));
          const low = Math.min(...slice.map(c => c.low));
          const volume = slice.reduce((acc, c) => acc + c.volume, 0);
          aggregated.push({ time: slice[0].time, open, high, low, close, volume });
        }
      }
      return aggregated.slice(-limit);
    } else {
      // Deterministically synthesize sub-minute candles from persistent 1m candle bars
      const subCandles: Candle[] = [];
      const pairs = StorageService.getOTCPairs();
      const pairObj = pairs.find(p => p.symbol === symbol);
      const decimals = pairObj ? pairObj.decimals : 5;
      const hash = this.getSymbolHash(symbol);
      const vol = (pairObj?.category === 'Crypto' ? 0.0003 : 0.00008) * Math.sqrt(tfSec / 5);

      // Deconstruct 1m bars into tfSec slices
      const slicesPer1m = 60 / tfSec;

      for (let cIdx = 0; cIdx < targetHistory.length; cIdx++) {
        const bar1m = targetHistory[cIdx];
        const barOpen = bar1m.open;
        const barClose = bar1m.close;
        const barRange = barClose - barOpen;

        let prevSubClose = barOpen;

        for (let s = 0; s < slicesPer1m; s++) {
          const subTime = bar1m.time + s * tfSec;
          const stepFrac = (s + 1) / slicesPer1m;
          const seed = hash + subTime;
          const subNoise = (this.pseudoRandom(seed) - 0.5) * vol * barOpen;
          
          const open = Number(prevSubClose.toFixed(decimals));
          const targetPrice = s === slicesPer1m - 1 ? barClose : barOpen + barRange * stepFrac + subNoise;
          const close = Number(Math.max(0.0001, targetPrice).toFixed(decimals));
          const high = Number((Math.max(open, close) + Math.abs(subNoise) * 0.5).toFixed(decimals));
          const low = Number((Math.min(open, close) - Math.abs(subNoise) * 0.5).toFixed(decimals));
          const volume = Math.floor(bar1m.volume / slicesPer1m);

          subCandles.push({ time: subTime, open, high, low, close, volume });
          prevSubClose = close;
        }
      }

      return subCandles.slice(-limit);
    }
  }

  public async getTicks(symbol: string, limit = 50): Promise<Tick[]> {
    const currentPrice = await this.getCurrentPrice(symbol);
    const ticks: Tick[] = [];
    const now = Date.now();
    let p = currentPrice;

    for (let i = limit; i >= 0; i--) {
      p = p + (Math.random() - 0.495) * 0.0001;
      ticks.push({
        time: now - i * 800,
        price: Number(p.toFixed(5)),
        volume: Math.floor(Math.random() * 20) + 5,
        direction: Math.random() > 0.5 ? 'UP' : 'DOWN',
      });
    }

    return ticks;
  }

  public subscribeToPrice(symbol: string, callback: (price: number, tick: Tick) => void): () => void {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
    }
    this.subscribers.get(symbol)!.add(callback);

    return () => {
      const subs = this.subscribers.get(symbol);
      if (subs) {
        subs.delete(callback);
      }
    };
  }

  public async getMarketStatus(): Promise<MarketStatus> {
    const pairs = await this.getAvailablePairs();
    return {
      broker: 'Quotex',
      market: 'OTC Markets',
      isConnected: true,
      isDemo: true,
      dataQuality: 'OPTIMAL',
      latencyMs: 14 + Math.floor(Math.random() * 12),
      lastHeartbeat: Date.now(),
      activePairsCount: pairs.filter(p => p.isActive).length,
    };
  }
}
