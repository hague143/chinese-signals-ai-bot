// src/server/auth.ts

import jwt from 'jsonwebtoken';
import { parse, serialize } from 'cookie';
import crypto from 'crypto';
import { LicenseDB, LicenseRecord } from './db';

const COOKIE_NAME = 'auth_license';

export interface LicenseTokenPayload {
  licenseId: string;
  key: string;
  deviceId: string;
  iat?: number;
  exp?: number;
}

// In-Memory IP Rate Limiter: 5 attempts / 60 seconds per IP
class RateLimiter {
  private attempts: Map<string, { count: number; resetAt: number }> = new Map();
  private maxAttempts = 5;
  private windowMs = 60 * 1000;

  public check(ip: string): { allowed: boolean; remaining: number; retryAfterSec?: number } {
    const now = Date.now();
    const cleanIp = ip || 'unknown-ip';
    const record = this.attempts.get(cleanIp);

    if (!record || now > record.resetAt) {
      this.attempts.set(cleanIp, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, remaining: this.maxAttempts - 1 };
    }

    if (record.count >= this.maxAttempts) {
      const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
      return { allowed: false, remaining: 0, retryAfterSec };
    }

    record.count++;
    return { allowed: true, remaining: this.maxAttempts - record.count };
  }

  public reset(ip: string): void {
    this.attempts.delete(ip);
  }
}

export const rateLimiter = new RateLimiter();

export class AuthService {
  /**
   * Return JWT Secret from environment variable or throw if missing
   */
  public static getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.trim().length === 0) {
      throw new Error('Server not configured: Missing JWT_SECRET environment variable.');
    }
    return secret.trim();
  }

  /**
   * Sign a new JWT containing licenseId, key, and deviceId
   */
  public static signToken(payload: { licenseId: string; key: string; deviceId: string }): string {
    const secret = AuthService.getJwtSecret();
    return jwt.sign(payload, secret, {
      expiresIn: '90d',
    });
  }

  /**
   * Verify and decode JWT token
   */
  public static verifyToken(token: string): LicenseTokenPayload | null {
    try {
      const secret = AuthService.getJwtSecret();
      const decoded = jwt.verify(token, secret) as LicenseTokenPayload;
      if (decoded && decoded.key && decoded.deviceId) {
        return decoded;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Create serialized Set-Cookie string for httpOnly auth token
   */
  public static createAuthCookie(token: string): string {
    const isProduction = process.env.NODE_ENV === 'production';
    return serialize(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
  }

  /**
   * Create serialized Set-Cookie string to clear auth token on logout
   */
  public static createLogoutCookie(): string {
    const isProduction = process.env.NODE_ENV === 'production';
    return serialize(COOKIE_NAME, '', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
      maxAge: 0,
    });
  }

  /**
   * Extract auth token from request cookie headers or Authorization header
   */
  public static extractToken(cookieHeader?: string, authHeader?: string): string | null {
    if (cookieHeader) {
      const cookies = parse(cookieHeader);
      if (cookies[COOKIE_NAME]) return cookies[COOKIE_NAME];
    }
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }

  /**
   * Comprehensive validation: Checks token signature AND re-checks live database record
   */
  public static async authenticateRequest(
    cookieHeader?: string,
    authHeader?: string,
    incomingDeviceId?: string
  ): Promise<{ authenticated: boolean; license?: LicenseRecord; error?: string; isServerMisconfigured?: boolean }> {
    let token: string | null = null;
    try {
      token = this.extractToken(cookieHeader, authHeader);
    } catch {
      return { authenticated: false, error: 'Malformed authentication headers.' };
    }

    if (!token) {
      return { authenticated: false, error: 'No active license session found. Please enter your license key.' };
    }

    let payload: LicenseTokenPayload | null = null;
    try {
      payload = this.verifyToken(token);
    } catch (err: any) {
      if (err.message && err.message.includes('Server not configured')) {
        return { authenticated: false, error: 'Server not configured', isServerMisconfigured: true };
      }
      return { authenticated: false, error: 'Invalid or expired session token.' };
    }

    if (!payload) {
      return { authenticated: false, error: 'Invalid or expired session token. Please re-activate your key.' };
    }

    // Re-check database record on EVERY request
    let license: LicenseRecord | null = null;
    try {
      license = await LicenseDB.getByKey(payload.key);
    } catch (err: any) {
      if (err.message && err.message.includes('Server not configured')) {
        return { authenticated: false, error: 'Server not configured', isServerMisconfigured: true };
      }
      throw err;
    }

    if (!license) {
      return { authenticated: false, error: 'License key was not found in the database.' };
    }

    if (license.status === 'revoked') {
      return { authenticated: false, error: 'This license key has been revoked by administration.' };
    }

    // Check device binding
    if (license.device_id && license.device_id !== payload.deviceId) {
      return { authenticated: false, error: 'Device mismatch: Key is bound to a different device.' };
    }

    if (incomingDeviceId && license.device_id && license.device_id !== incomingDeviceId) {
      return { authenticated: false, error: 'Device mismatch: Key is bound to a different device.' };
    }

    // Check expiration
    if (license.expires_at) {
      const expiresAtMs = new Date(license.expires_at).getTime();
      if (Date.now() > expiresAtMs) {
        if (license.status !== 'expired') {
          await LicenseDB.update(license.key, { status: 'expired' });
          license.status = 'expired';
        }
        return { authenticated: false, error: 'This license key has expired. Please renew or contact support.' };
      }
    }

    if (license.status !== 'active') {
      return { authenticated: false, error: `License is currently ${license.status}.` };
    }

    return { authenticated: true, license };
  }

  /**
   * Generate formatted key: XXXX-XXXX-XXXX-XXXX using crypto.randomInt
   */
  public static generateLicenseKey(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Base32 unambiguous charset
    const parts: string[] = [];
    for (let i = 0; i < 4; i++) {
      let chunk = '';
      for (let j = 0; j < 4; j++) {
        const randomIndex = crypto.randomInt(0, chars.length);
        chunk += chars.charAt(randomIndex);
      }
      parts.push(chunk);
    }
    return parts.join('-');
  }
}
