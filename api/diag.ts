export default async function handler(req: any, res: any) {
  const out: Record<string, string> = {};
  out.node = process.version;
  out.NODE_ENV = String(process.env.NODE_ENV);
  const url = process.env.SUPABASE_URL || '';
  out.SUPABASE_URL = url ? (url.startsWith('https://') && !url.endsWith('/') && !url.includes(' ') ? 'set, format ok' : 'set, FORMAT PROBLEM (check https:// start, no trailing / or spaces)') : 'MISSING';
  out.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING';
  out.JWT_SECRET = process.env.JWT_SECRET ? 'set' : 'MISSING';
  out.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ? 'set' : 'MISSING';

  const check = async (name: string, loader: () => Promise<unknown>) => {
    try { await loader(); out[name] = 'ok'; }
    catch (e: any) { out[name] = 'FAIL: ' + (e && e.code ? e.code + ' - ' : '') + String(e && e.message).split('\n')[0]; }
  };
  await check('pkg:jsonwebtoken', () => import('jsonwebtoken'));
  await check('pkg:cookie', () => import('cookie'));
  await check('pkg:supabase-js', () => import('@supabase/supabase-js'));
  await check('file:src/server/db', () => import('../src/server/db'));
  await check('file:src/server/auth', () => import('../src/server/auth'));

  res.status(200).json(out);
}
