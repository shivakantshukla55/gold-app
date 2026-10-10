// Scrapers for retail 22K gold rates in Mumbai (not stock/futures prices).
//  - Stockezee  -> today's live rate (quoted per 10 g)
//  - Goodreturns -> last 10 days of rates (quoted per 1 g)
// All prices are stored per 1 gram in INR.

const UA = 'Mozilla/5.0 (compatible; GoldPriceApp/1.0)';

const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

export const toNumber = (s) => Number(String(s).replace(/,/g, ''));

export function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&#8377;|&#x20b9;|&rupee;/gi, '₹')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html' } });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return res.text();
}

// "Gold 22K ₹1,37,100 per 10g" -> 13710 per gram
export function parseStockezee(html) {
  const text = htmlToText(html);
  const m = text.match(/Gold 22K\s*₹\s*([\d,]+)/i);
  if (!m) throw new Error('Stockezee: 22K rate not found');
  const per10g = toNumber(m[1]);
  const updated = text.match(/Live Update:\s*([0-9]{1,2} \w{3} \d{4} [0-9:]+)/i);
  return { per10g, perGram: Math.round(per10g / 10), updatedLabel: updated ? updated[1] : null };
}

// Each row is a date like "Oct 08, 2026" followed by two rupee amounts: 24K first, then 22K
// (the small "(+65)" changes are ignored). Tolerant of whatever tags/spacing/arrows sit between them.
export function parseGoodreturns(html) {
  const text = htmlToText(html);
  const marks = [...text.matchAll(/([A-Z][a-z]{2})\s+(\d{1,2}),?\s+(\d{4})/g)].filter((m) => MONTHS[m[1]]);
  const byDate = new Map();
  marks.forEach((m, i) => {
    const start = m.index + m[0].length;
    const end = Math.min(marks[i + 1]?.index ?? Infinity, start + 200);
    const amounts = [...text.slice(start, end).matchAll(/₹\s*([\d,]+)/g)].map((a) => toNumber(a[1])).filter((n) => n >= 1000);
    if (amounts.length < 2) return;
    const [k24, k22] = amounts;
    const ratio = k22 / k24; // 22K is 91.6% of 24K; reject anything that isn't a real 24K/22K pair
    if (ratio < 0.85 || ratio > 0.97) return;
    const date = `${m[3]}-${String(MONTHS[m[1]]).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    if (!byDate.has(date)) byDate.set(date, k22);
  });
  if (!byDate.size) {
    const at = text.search(/last 10 days/i);
    const snippet = text.slice(Math.max(at, 0), Math.max(at, 0) + 160);
    throw new Error(`Goodreturns: 10-day table not found (got ${text.length} chars: "${snippet}")`);
  }
  return [...byDate].map(([date, perGram]) => ({ date, perGram }));
}

export async function fetchStockezee() {
  return parseStockezee(await fetchText('https://www.stockezee.com/gold-price-today/mumbai'));
}

export async function fetchGoodreturns() {
  return parseGoodreturns(await fetchText('https://www.goodreturns.in/gold-rates/mumbai.html'));
}
