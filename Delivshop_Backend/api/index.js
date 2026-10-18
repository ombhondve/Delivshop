import app from '../dist/server.js';

export default function handler(req, res) {
  try {
    // Normalize empty, undefined, or root-relative URL paths to prevent router crash in Vercel serverless environment
    if (!req.url || req.url === '' || req.url === '//') {
      req.url = '/';
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
