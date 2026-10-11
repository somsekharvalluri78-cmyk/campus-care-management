import app from '../backend/src/server.js';

export default function handler(req, res) {
  if (req.url.startsWith('/api/index') || req.url === '/api') {
    const candidate = req.headers['x-matched-path'] || req.headers['x-invoke-path'] || req.originalUrl;
    if (candidate && !candidate.startsWith('/api/index')) {
      req.url = candidate;
    }
  }
  return app(req, res);
}
