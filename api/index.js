import app from '../backend/src/server.js';

export default function handler(req, res) {
  if (req.url.startsWith('/api/index') || req.url === '/api' || req.url === '/api/') {
    const candidate = req.headers['x-matched-path'] || req.headers['x-invoke-path'] || req.originalUrl;
    if (candidate && !candidate.startsWith('/api/index') && candidate !== '/api' && candidate !== '/api/') {
      req.url = candidate;
    }
  }
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
}
