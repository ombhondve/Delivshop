import '../dist/utils/url-shim.js';
import app from '../dist/app.js';

export default function handler(req, res) {
  try {
    // Normalize empty, undefined, root-relative, or full URLs using WHATWG URL API [DEP0169]
    if (!req.url || req.url === '' || req.url === '//') {
      req.url = '/';
    } else if (req.url.startsWith('http://') || req.url.startsWith('https://')) {
      try {
        const u = new URL(req.url);
        req.url = (u.pathname || '/') + (u.search || '');
      } catch {
        // Fallback
      }
    }
    return app(req, res);
  } catch (err) {
    console.error('Unhandled Vercel serverless invocation error:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          success: false,
          status: 'SERVER_ERROR',
          message: 'Internal server error during serverless execution',
          timestamp: new Date().toISOString(),
        })
      );
    }
  }
}

export { app };
