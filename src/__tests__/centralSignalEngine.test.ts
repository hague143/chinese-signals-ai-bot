// src/__tests__/centralSignalEngine.test.ts

import { DemoProvider } from '../providers/demoProvider';
import { CentralSignalEngine } from '../engine/centralSignalEngine';
import { DEFAULT_USER_SETTINGS, StorageService } from '../services/storageService';
import { Candle, ExpiryDuration } from '../types/market';

export async function runSignalEngineTests(): Promise<boolean> {
  const provider = new DemoProvider();
  const pairs = StorageService.getOTCPairs();
  let allPassed = true;

  // 1. Cross-section synchronization check
  for (const pair of pairs.slice(0, 5)) {
    const [c1m, c5m, c15m] = await Promise.all([
      provider.getClosedCandles(pair.symbol, '1m', 60),
      provider.getClosedCandles(pair.symbol, '5m', 30),
      provider.getClosedCandles(pair.symbol, '15m', 20),
    ]);

    const scannerSig = CentralSignalEngine.getOrGenerateSignal({
      pair: pair.symbol,
      candles: c1m,
      higherTfCandles5m: c5m,
      higherTfCandles15m: c15m,
      expiry: '30s',
      settings: DEFAULT_USER_SETTINGS,
    });

    const dashSig = CentralSignalEngine.getOrGenerateSignal({
      pair: pair.symbol,
      candles: c1m,
      higherTfCandles5m: c5m,
      higherTfCandles15m: c15m,
      expiry: '30s',
      settings: DEFAULT_USER_SETTINGS,
    });

    if (scannerSig.direction !== dashSig.direction || scannerSig.confidence !== dashSig.confidence) {
      allPassed = false;
    }
  }

  // 2. Corrupt candle check
  const badCandles: Candle[] = [{ time: 1000, open: 1, high: 0.5, low: 1.2, close: 1, volume: 10 }];
  const badSig = CentralSignalEngine.getOrGenerateSignal({
    pair: 'EUR/USD OTC',
    candles: badCandles,
    settings: DEFAULT_USER_SETTINGS,
  });

  if (badSig.direction !== 'WAIT' || badSig.isValid !== false) {
    allPassed = false;
  }

  return allPassed;
}
