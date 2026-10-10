// Shared by the local server (server/index.js) and the Netlify functions.
// "storage" is any object with: loadHistory() -> {daily:{...}} | null, saveHistory(history).
import { fetchStockezee, fetchGoodreturns } from './scrape.js';
import seed from './seed.js';

export const CACHE_MS = 15 * 60 * 1000;

export const istDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD

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

export async function refresh(storage) {
  const history = (await storage.loadHistory()) ?? { daily: { ...seed.daily } };
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

  await storage.saveHistory(history);

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
