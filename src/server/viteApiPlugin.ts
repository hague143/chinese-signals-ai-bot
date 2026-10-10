// src/server/viteApiPlugin.ts

import { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import validateKeyHandler from '../../api/validate-key';
import authMeHandler from '../../api/auth/me';
import authLogoutHandler from '../../api/auth/logout';
import signalsHandler from '../../api/signals';
import scannerHandler from '../../api/scanner';
import adminKeysHandler from '../../api/admin/keys';

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

function adaptResponse(res: ServerResponse) {
  const json = (data: any) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
    return res;
  };

  const status = (code: number) => {
    res.statusCode = code;
    return { json };
  };

  (res as any).status = status;
  (res as any).json = json;
  return res as any;
}

export function viteApiPlugin(): Plugin {
  return {
    name: 'vite-api-serverless-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (!url.startsWith('/api/')) {
          return next();
        }

        const parsedUrl = new URL(url, 'http://localhost:3000');
        const pathname = parsedUrl.pathname;
        const query: Record<string, string> = {};
        parsedUrl.searchParams.forEach((v, k) => { query[k] = v; });

        let body: any = {};
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method || '')) {
          body = await parseJsonBody(req);
        }

        const adaptedReq: any = req;
        adaptedReq.query = query;
        adaptedReq.body = body;

        const adaptedRes = adaptResponse(res);

        try {
          if (pathname === '/api/validate-key') {
            return await validateKeyHandler(adaptedReq, adaptedRes);
          }
          if (pathname === '/api/auth/me') {
            return await authMeHandler(adaptedReq, adaptedRes);
          }
          if (pathname === '/api/auth/logout') {
            return await authLogoutHandler(adaptedReq, adaptedRes);
          }
          if (pathname === '/api/signals') {
            return await signalsHandler(adaptedReq, adaptedRes);
          }
          if (pathname === '/api/scanner') {
            return await scannerHandler(adaptedReq, adaptedRes);
          }
          if (pathname === '/api/admin/keys') {
            return await adminKeysHandler(adaptedReq, adaptedRes);
          }

          res.statusCode = 404;
          res.end(JSON.stringify({ error: `Route ${pathname} not found.` }));
        } catch (err: any) {
          console.error('API Middleware execution error:', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Internal server error in API middleware.' }));
        }
      });
    },
  };
}
