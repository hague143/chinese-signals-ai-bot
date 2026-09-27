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

  private initializeState() {
    const pairs = StorageService.getOTCPairs();
    pairs.forEach(pair => {
      const hash = this.getSymbolHash(pair.symbol);
      const initialDrift = ((hash % 100) - 48) * 0.00002;
      this.symbolStates.set(pair.symbol, {
        currentPrice: pair.lastPrice,
        drift: initialDrift,
        volatility: pair.category === 'Crypto' ? 0.0004 : 0.0001,
        phase: (hash % 360) * (Math.PI / 180),
        lastTickTime: Date.now(),
      });
    });
  }

  private startLiveTickLoop() {
    if (this.tickInterval) return;

    this.tickInterval = setInterval(() => {
      this.symbolStates.forEach((state, symbol) => {
        const dt = 1;
        const randNormal = (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 1.732;
        
        // Periodic drift alteration
        if (Math.random() < 0.05) {
          state.drift = (Math.random() - 0.5) * 0.00015;
        }

        const deltaPct = state.drift * dt + state.volatility * randNormal * Math.sqrt(dt);
        const oldPrice = state.currentPrice;
        let newPrice = oldPrice * (1 + deltaPct);

        const pairs = StorageService.getOTCPairs();
        const pairObj = pairs.find(p => p.symbol === symbol);
        const decimals = pairObj ? pairObj.decimals : 5;
        newPrice = Number(newPrice.toFixed(decimals));

        state.currentPrice = newPrice;
        state.lastTickTime = Date.now();

        const tickDirection = newPrice > oldPrice ? 'UP' : newPrice < oldPrice ? 'DOWN' : 'FLAT';
        const tick: Tick = {
          time: Date.now(),
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

  public async getCandles(symbol: string, timeframe: Timeframe = '1m', limit = 100): Promise<Candle[]> {
    const currentPrice = await this.getCurrentPrice(symbol);
    const pairs = StorageService.getOTCPairs();
    const pairObj = pairs.find(p => p.symbol === symbol);
    const decimals = pairObj ? pairObj.decimals : 5;
    const hash = this.getSymbolHash(symbol);
    const state = this.symbolStates.get(symbol);
    const phaseOffset = state ? state.phase : (hash % 100) * 0.1;

    let tfSec = 60;
    switch (timeframe) {
      case '1s': tfSec = 1; break;
      case '5s': tfSec = 5; break;
      case '10s': tfSec = 10; break;
      case '15s': tfSec = 15; break;
      case '30s': tfSec = 30; break;
      case '1m': tfSec = 60; break;
      case '5m': tfSec = 300; break;
      case '15m': tfSec = 900; break;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const alignedNowSec = Math.floor(nowSec / tfSec) * tfSec;

    const candles: Candle[] = [];
    const vol = (pairObj?.category === 'Crypto' ? 0.0006 : 0.00015) * Math.sqrt(tfSec / 5);

    // Build series starting from (limit - 1) bars in the past forward to now
    let price = currentPrice * (1 + Math.sin(phaseOffset) * 0.004);

    for (let i = limit - 1; i >= 0; i--) {
      const time = alignedNowSec - i * tfSec;
      const t = limit - i;
      
      // Multi-sine wave + micro trend component
      const wave = Math.sin((t * 0.12) + phaseOffset) * 0.6 + Math.cos((t * 0.05) + phaseOffset) * 0.4;
      const noise = (Math.random() - 0.495);
      const stepPct = (wave * 0.4 + noise * 0.6) * vol;

      const open = Number(price.toFixed(decimals));
      const close = i === 0 ? currentPrice : Number(Math.max(0.0001, open * (1 + stepPct)).toFixed(decimals));
      const high = Number((Math.max(open, close) + Math.random() * vol * open * 0.6).toFixed(decimals));
      const low = Number((Math.min(open, close) - Math.random() * vol * open * 0.6).toFixed(decimals));
      const volume = Math.floor(Math.random() * 400) + 120;

      candles.push({ time, open, high, low, close, volume });
      price = close;
    }

    return candles;
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
