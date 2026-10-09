import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchStockezee, fetchGoodreturns } from './scrape.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const DIST = path.join(__dirname, '..', 'dist');
const PORT = process.env.PORT || 3001;
const CACHE_MS = 15 * 60 * 1000;

const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed.json'), 'utf8'));

const istDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD

function loadHistory() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  } catch {
    return { daily: { ...seed.daily } };
  }
}

function saveHistory(h) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(h, null, 2));
}

export function buildMonthly(daily, today) {
  const byMonth = {};
  for (const [d, p] of Object.entries(daily)) (byMonth[d.slice(0, 7)] ||= []).push(p);
  const out = {};
  for (const [m, avg] of Object.entries(seed.monthlyAvg)) out[m] = { month: m, avg, source: 'reference' };
  for (const [m, list] of Object.entries(byMonth)) {
    // Use our own daily data for the current month, or for any month we tracked (almost) fully.
    if (m === today.slice(0, 7) || list.length >= 20) {
      out[m] = { month: m, avg: Math.round(list.reduce((a, b) => a + b, 0) / list.length), source: 'tracked' };
    }
  }
  return Object.values(out).sort((a, b) => a.month.localeCompare(b.month));
}

let cache = { at: 0, payload: null };

async function refresh() {
  const history = loadHistory();
  const today = istDate();
  const warnings = [];
  let live = null;

  try {
    for (const row of await fetchGoodreturns()) history.daily[row.date] = row.perGram;
  } catch (e) {
    warnings.push(String(e.message));
  }
  try {
    live = await fetchStockezee();
    history.daily[today] = live.perGram; // Stockezee is the live source for today's rate
  } catch (e) {
    warnings.push(String(e.message));
  }

  saveHistory(history);

  const daily = Object.entries(history.daily)
    .map(([date, price]) => ({ date, price }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const latest = daily.filter((d) => d.date <= today).at(-1);

  return {
    fetchedAt: new Date().toISOString(),
    today: {
      date: latest?.date ?? today,
      perGram: latest?.price ?? null,
      per10g: live?.per10g ?? (latest ? latest.price * 10 : null),
      updatedLabel: live?.updatedLabel ?? null,
      source: live ? 'stockezee.com (live)' : 'goodreturns.in (last published)',
    },
    daily,
    monthly: buildMonthly(history.daily, today),
    warnings,
  };
}

const app = express();

app.get('/api/prices', async (req, res) => {
  try {
    if (!cache.payload || Date.now() - cache.at > CACHE_MS || req.query.refresh) {
      cache = { at: Date.now(), payload: await refresh() };
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => console.log(`Gold API on http://localhost:${PORT}`));
}
