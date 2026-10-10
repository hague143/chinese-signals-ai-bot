// api/signals.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthService } from '../src/server/auth';
import { CentralSignalEngine } from '../src/engine/centralSignalEngine';
import { DemoProvider } from '../src/providers/demoProvider';
import { DEFAULT_USER_SETTINGS } from '../src/services/storageService';
import { ExpiryDuration } from '../src/types/market';

const serverProvider = new DemoProvider();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Authenticate Request & Verify License in Database
  const cookieHeader = req.headers.cookie;
  const authHeader = req.headers.authorization;
  const deviceId = (req.headers['x-device-id'] as string) || (req.query.deviceId as string);

  const auth = await AuthService.authenticateRequest(cookieHeader, authHeader, deviceId);
  if (!auth.authenticated || !auth.license) {
    return res.status(401).json({
      error: auth.error || 'Unauthorized. Valid license required to access quantitative signals.',
    });
  }

  try {
    const symbol = (req.query.symbol as string) || (req.body?.symbol as string) || 'EUR/USD OTC';
    const expiry = ((req.query.expiry as string) || (req.body?.expiry as string) || '30s') as ExpiryDuration;
    const settings = req.body?.settings || DEFAULT_USER_SETTINGS;

    const [c1m, c5m, c15m] = await Promise.all([
      serverProvider.getClosedCandles(symbol, '1m', 60),
      serverProvider.getClosedCandles(symbol, '5m', 30),
      serverProvider.getClosedCandles(symbol, '15m', 20),
    ]);

    const signal = CentralSignalEngine.getOrGenerateSignal({
      pair: symbol,
      market: 'OTC',
      expiry,
      timeframe: '1m',
      candles: c1m,
      higherTfCandles5m: c5m,
      higherTfCandles15m: c15m,
      dataSource: serverProvider.name,
      mode: 'CLOSED_CANDLE',
      settings,
    });

    return res.status(200).json({
      success: true,
      signal,
    });
  } catch (err: any) {
    console.error('Server signal generation error:', err);
    return res.status(500).json({ error: 'Failed to generate signal on server.' });
  }
}
