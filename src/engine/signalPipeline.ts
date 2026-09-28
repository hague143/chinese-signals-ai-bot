// src/engine/signalPipeline.ts

import { Candle, ExpiryDuration } from '../types/market';
import { UserSettings } from '../types/settings';
import { MasterSignalOutput } from '../types/signal';
import { CentralSignalEngine } from './centralSignalEngine';

export class SignalPipeline {
  /**
   * Universal forwarder to CentralSignalEngine
   */
  public static generateSignal(params: {
    symbol: string;
    candles: Candle[];
    higherTfCandles5m?: Candle[];
    higherTfCandles15m?: Candle[];
    expiry: ExpiryDuration;
    settings: UserSettings;
    lastActiveSignal?: MasterSignalOutput | null;
    dataSource?: string;
    mode?: 'CLOSED_CANDLE' | 'LIVE_CANDLE';
    forceRecalculate?: boolean;
  }): MasterSignalOutput {
    return CentralSignalEngine.getOrGenerateSignal({
      pair: params.symbol,
      market: 'OTC',
      expiry: params.expiry,
      timeframe: '1m',
      candles: params.candles,
      higherTfCandles5m: params.higherTfCandles5m,
      higherTfCandles15m: params.higherTfCandles15m,
      dataSource: params.dataSource || 'Quotex OTC Demo Simulator',
      mode: params.mode || 'CLOSED_CANDLE',
      settings: params.settings,
      lastActiveSignal: params.lastActiveSignal,
      forceRecalculate: params.forceRecalculate,
    });
  }
}
