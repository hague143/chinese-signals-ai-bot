// api/validate-key.ts (Vercel Serverless Function & API Handler)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { LicenseDB } from '../src/server/db';
import { AuthService, rateLimiter } from '../src/server/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // 1. IP Rate Limiting (5 attempts / min)
  const clientIp = (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket?.remoteAddress ||
    '127.0.0.1'
  ).trim();

  const rateCheck = rateLimiter.check(clientIp);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: `Too many validation attempts. Please wait ${rateCheck.retryAfterSec || 60} seconds before trying again.`,
      retryAfterSec: rateCheck.retryAfterSec,
    });
  }

  try {
    const { key, deviceId, fingerprint } = req.body || {};

    if (!key || typeof key !== 'string' || key.trim().length < 6) {
      return res.status(400).json({ error: 'Please enter a valid license key.' });
    }

    if (!deviceId || typeof deviceId !== 'string') {
      return res.status(400).json({ error: 'Device identification failed. Please refresh your browser.' });
    }

    const cleanKey = key.trim().toUpperCase();

    // 2. Lookup key in Supabase database
    const license = await LicenseDB.getByKey(cleanKey);
    if (!license) {
      return res.status(404).json({ error: 'License key not found. Please check your key or contact support.' });
    }

    // 3. Status checks
    if (license.status === 'revoked') {
      return res.status(403).json({ error: 'This license key has been revoked.' });
    }

    // Check if already expired
    if (license.expires_at) {
      const expiresAtMs = new Date(license.expires_at).getTime();
      if (Date.now() > expiresAtMs) {
        if (license.status !== 'expired') {
          await LicenseDB.update(license.key, { status: 'expired' });
        }
        return res.status(403).json({ error: 'This license key has expired.' });
      }
    }

    // 4. Device Binding & First Activation logic
    let updatedLicense = license;
    const nowIso = new Date().toISOString();

    if (!license.device_id || license.status === 'unused') {
      // First activation on this device
      let expiresAt: string | null = null;

      if (license.duration_days > 0) {
        const expiryDate = new Date(Date.now() + license.duration_days * 24 * 60 * 60 * 1000);
        expiresAt = expiryDate.toISOString();
      } else {
        // Lifetime access (-1)
        expiresAt = null;
      }

      const updated = await LicenseDB.update(cleanKey, {
        status: 'active',
        device_id: deviceId,
        device_fingerprint: fingerprint || null,
        expires_at: expiresAt,
        last_ip: clientIp,
        last_used_at: nowIso,
      });

      if (!updated) {
        return res.status(500).json({ error: 'Failed to activate license key. Please try again.' });
      }
      updatedLicense = updated;
    } else {
      // Already activated - verify device_id
      if (license.device_id !== deviceId) {
        return res.status(403).json({
          error: 'Key already in use on another device. Contact support or reset your device binding.',
        });
      }

      // Update last active metadata
      const updated = await LicenseDB.update(cleanKey, {
        last_ip: clientIp,
        last_used_at: nowIso,
      });
      if (updated) updatedLicense = updated;
    }

    // Reset rate limiter on successful activation
    rateLimiter.reset(clientIp);

    // 5. Create signed JWT and set httpOnly cookie
    const token = AuthService.signToken({
      licenseId: updatedLicense.id,
      key: updatedLicense.key,
      deviceId,
    });

    res.setHeader('Set-Cookie', AuthService.createAuthCookie(token));

    // Calculate days remaining
    let daysRemaining: number | null = null;
    let isLifetime = updatedLicense.duration_days === -1 || updatedLicense.expires_at === null;

    if (updatedLicense.expires_at) {
      const msLeft = new Date(updatedLicense.expires_at).getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
    }

    return res.status(200).json({
      success: true,
      message: 'License key activated successfully.',
      license: {
        key: updatedLicense.key,
        status: updatedLicense.status,
        durationDays: updatedLicense.duration_days,
        expiresAt: updatedLicense.expires_at,
        daysRemaining,
        isLifetime,
      },
    });
  } catch (err: any) {
    console.error('Validation error:', err);
    return res.status(500).json({ error: 'Internal server error validating license.' });
  }
}
