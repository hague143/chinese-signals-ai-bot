// api/scanner.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthService } from '../src/server/auth';
import { CentralSignalEngine } from '../src/engine/centralSignalEngine';
import { DemoProvider } from '../src/providers/demoProvider';
import { DEFAULT_USER_SETTINGS, StorageService } from '../src/services/storageService';
import { ExpiryDuration, OTCPair } from '../src/types/market';

const serverProvider = new DemoProvider();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Authenticate Request & Verify License in Database
  const cookieHeader = req.headers.cookie;
  const authHeader = req.headers.authorization;
  const deviceId = (req.headers['x-device-id'] as string) || (req.query.deviceId as string);

  const auth = await AuthService.authenticateRequest(cookieHeader, authHeader, deviceId);
  if (!auth.authenticated || !auth.license) {
    return res.status(401).json({
      error: auth.error || 'Unauthorized. Valid license required to access OTC Market Scanner.',
    });
  }

  try {
    const expiry = ((req.query.expiry as string) || '30s') as ExpiryDuration;
    const pairs = StorageService.getOTCPairs();
    const activePairs = pairs.filter((p: OTCPair) => p.isActive);

    const scanResults = await Promise.all(
      activePairs.map(async pair => {
        try {
          const [c1m, c5m, c15m] = await Promise.all([
            serverProvider.getClosedCandles(pair.symbol, '1m', 60),
            serverProvider.getClosedCandles(pair.symbol, '5m', 30),
            serverProvider.getClosedCandles(pair.symbol, '15m', 20),
          ]);

          if (c1m && c1m.length >= 15) {
            return CentralSignalEngine.getOrGenerateSignal({
              pair: pair.symbol,
              market: 'OTC',
              expiry,
              timeframe: '1m',
              candles: c1m,
              higherTfCandles5m: c5m,
              higherTfCandles15m: c15m,
              dataSource: serverProvider.name,
              mode: 'CLOSED_CANDLE',
              settings: DEFAULT_USER_SETTINGS,
            });
          }
        } catch {
          // ignore individual pair scan failure
        }
        return null;
      })
    );

    const validResults = scanResults.filter(Boolean);
    validResults.sort((a: any, b: any) => b.confidence - a.confidence);

    return res.status(200).json({
      success: true,
      count: validResults.length,
      results: validResults,
    });
  } catch (err: any) {
    console.error('Server scanner error:', err);
    return res.status(500).json({ error: 'Failed to execute OTC market scan on server.' });
  }
}
