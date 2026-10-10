// api/admin/keys.ts (Admin Key Management API)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { LicenseDB } from '../../src/server/db';
import { AuthService } from '../../src/server/auth';

function getAdminPassword(): string | null {
  const pwd = process.env.ADMIN_PASSWORD;
  if (!pwd || pwd.trim().length === 0) {
    return null;
  }
  return pwd.trim();
}

function verifyAdminAuth(req: VercelRequest, adminPassword: string): boolean {
  const authHeader = req.headers.authorization;
  const adminHeader = req.headers['x-admin-password'];
  const adminQuery = req.query.adminPassword;

  if (adminHeader === adminPassword) return true;
  if (adminQuery === adminPassword) return true;
  if (authHeader && authHeader === `Bearer ${adminPassword}`) return true;

  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Verify ADMIN_PASSWORD configuration
  const adminPassword = getAdminPassword();
  if (!adminPassword) {
    return res.status(500).json({ error: 'Server not configured: Missing ADMIN_PASSWORD environment variable.' });
  }

  // 2. Verify Admin Authorization
  if (!verifyAdminAuth(req, adminPassword)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Admin Password' });
  }

  const method = req.method;

  try {
    // 3. GET: List all keys
    if (method === 'GET') {
      const keys = await LicenseDB.getAll();
      return res.status(200).json({ success: true, count: keys.length, keys });
    }

    // 4. POST: Generate new key (1 day / 7 days / 30 days / lifetime) using crypto.randomInt
    if (method === 'POST') {
      const { durationDays, note, customKey } = req.body || {};
      const validDurations = [1, 7, 30, -1];
      const duration = validDurations.includes(Number(durationDays)) ? Number(durationDays) : 30;

      const keyToUse = (customKey && typeof customKey === 'string' && customKey.trim().length > 6)
        ? customKey.trim().toUpperCase()
        : AuthService.generateLicenseKey();

      const created = await LicenseDB.create({
        key: keyToUse,
        duration_days: duration,
        status: 'unused',
        note: note ? String(note).trim() : undefined,
      });

      if (!created) {
        return res.status(500).json({ error: 'Failed to create license key in database.' });
      }

      return res.status(201).json({
        success: true,
        message: 'License key created successfully.',
        key: created,
      });
    }

    // 5. PATCH: Manage Key (Revoke, Extend, Reset Device)
    if (method === 'PATCH') {
      const { key, action, extendDays } = req.body || {};
      if (!key) return res.status(400).json({ error: 'Missing key parameter' });

      const existing = await LicenseDB.getByKey(key);
      if (!existing) return res.status(404).json({ error: 'Key not found' });

      if (action === 'revoke') {
        const updated = await LicenseDB.update(key, { status: 'revoked' });
        return res.status(200).json({ success: true, message: `Key ${key} revoked.`, key: updated });
      }

      if (action === 'extend') {
        const daysToAdd = Number(extendDays) || 30;
        let baseTime = Date.now();
        if (existing.expires_at) {
          const currentExpiry = new Date(existing.expires_at).getTime();
          if (currentExpiry > Date.now()) {
            baseTime = currentExpiry;
          }
        }
        const newExpiryIso = new Date(baseTime + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
        const updated = await LicenseDB.update(key, {
          expires_at: newExpiryIso,
          status: 'active',
        });
        return res.status(200).json({ success: true, message: `Key extended by ${daysToAdd} days.`, key: updated });
      }

      if (action === 'reset_device') {
        const updated = await LicenseDB.update(key, {
          device_id: null,
          device_fingerprint: null,
          status: existing.status === 'revoked' ? 'revoked' : 'unused',
        });
        return res.status(200).json({
          success: true,
          message: `Device binding reset for key ${key}. User can now activate on a new device.`,
          key: updated,
        });
      }

      return res.status(400).json({ error: 'Invalid action. Supported: revoke, extend, reset_device' });
    }

    // 6. DELETE: Delete key permanently
    if (method === 'DELETE') {
      const { key } = req.body || req.query || {};
      if (!key || typeof key !== 'string') return res.status(400).json({ error: 'Missing key parameter' });

      const deleted = await LicenseDB.delete(key);
      if (!deleted) return res.status(500).json({ error: 'Failed to delete key.' });

      return res.status(200).json({ success: true, message: `Key ${key} deleted.` });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    if (err.message && err.message.includes('Server not configured')) {
      return res.status(500).json({ error: 'Server not configured: ' + err.message });
    }
    console.error('Admin API error:', err);
    return res.status(500).json({ error: 'Internal server error in admin key management.' });
  }
}
