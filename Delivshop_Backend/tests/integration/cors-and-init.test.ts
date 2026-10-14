import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../../src/app.js';
import serverApp from '../../src/server.js';

describe('Vercel Initialization & CORS Preflight Tests', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('should verify that server.ts exports an Express application as default', () => {
    expect(serverApp).toBeDefined();
    expect(typeof serverApp).toBe('function');
    expect(typeof (serverApp as any).use).toBe('function');
  });

  it('should handle OPTIONS preflight requests to /shops directly from https://delivshop.vercel.app with HTTP 204 and CORS headers', async () => {
    const res = await fetch(`${baseUrl}/shops`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://delivshop.vercel.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
      },
    });

    // Must return HTTP 204 without 500 error and without touching database
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://delivshop.vercel.app');
    expect(res.headers.get('access-control-allow-methods')).toContain('POST');
    expect(res.headers.get('access-control-allow-credentials')).toBe('true');
  });

  it('should handle OPTIONS preflight requests from Vercel deployed frontend with HTTP 204 and correct CORS headers', async () => {
    const res = await fetch(`${baseUrl}/api/shops`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://delivshop.vercel.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
      },
    });

    // CRITICAL: Must not return HTTP 500 error on preflight
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://delivshop.vercel.app');
    expect(res.headers.get('access-control-allow-methods')).toContain('POST');
    expect(res.headers.get('access-control-allow-credentials')).toBe('true');
  });

  it('should handle OPTIONS preflight requests from localhost dev frontend', async () => {
    const res = await fetch(`${baseUrl}/api/shops`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
      },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
  });

  it('should respond with HTTP 200 on root endpoint for deployment health probes', async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('UP');
    expect(body.service).toContain('Delivshop');
  });
});

