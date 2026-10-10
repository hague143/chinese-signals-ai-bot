// api/auth/me.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthService } from '../../src/server/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  const cookieHeader = req.headers.cookie;
  const authHeader = req.headers.authorization;
  const deviceId = (req.query.deviceId as string) || (req.headers['x-device-id'] as string);

  const auth = await AuthService.authenticateRequest(cookieHeader, authHeader, deviceId);

  if (!auth.authenticated || !auth.license) {
    return res.status(401).json({
      authenticated: false,
      error: auth.error || 'Unauthorized. Please enter a valid license key.',
    });
  }

  const lic = auth.license;
  let daysRemaining: number | null = null;
  const isLifetime = lic.duration_days === -1 || lic.expires_at === null;

  if (lic.expires_at) {
    const msLeft = new Date(lic.expires_at).getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
  }

  return res.status(200).json({
    authenticated: true,
    license: {
      key: lic.key,
      status: lic.status,
      durationDays: lic.duration_days,
      expiresAt: lic.expires_at,
      daysRemaining,
      isLifetime,
      lastUsedAt: lic.last_used_at,
    },
  });
}
