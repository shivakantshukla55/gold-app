// Local development server only (npm run dev / npm start). On Netlify, the functions in
// netlify/functions/ do this job and store history in Netlify Blobs instead of a file.
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { refresh, CACHE_MS } from './core.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const DIST = path.join(__dirname, '..', 'dist');
const PORT = process.env.PORT || 3001;

const fileStorage = {
  async loadHistory() {
    try {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } catch {
      return null;
    }
  },
  async saveHistory(h) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(h, null, 2));
  },
};

let cache = { at: 0, payload: null };

const app = express();

app.get('/api/prices', async (req, res) => {
  try {
    if (!cache.payload || Date.now() - cache.at > CACHE_MS || req.query.refresh) {
      cache = { at: Date.now(), payload: await refresh(fileStorage) };
    }
    res.json(cache.payload);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

if (fs.existsSync(DIST)) {
  // The service worker must never be cached by the browser, or updates won't reach installed apps.
  app.get('/sw.js', (_req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(DIST, 'sw.js'));
  });
  app.use(express.static(DIST));
  app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));
}

app.listen(PORT, () => console.log(`Gold API on http://localhost:${PORT}`));
