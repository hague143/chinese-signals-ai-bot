// api/auth/logout.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthService } from '../../src/server/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Set-Cookie', AuthService.createLogoutCookie());
  return res.status(200).json({ success: true, message: 'Logged out successfully.' });
}
