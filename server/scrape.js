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
    .replace(/&#8377;|&rupee;/g, '₹')
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

// Rows look like: "Oct 08, 2026 ₹14,957 (0) ₹13,710 (0)"  (24K first, then 22K)
export function parseGoodreturns(html) {
  const text = htmlToText(html);
  const re = /([A-Z][a-z]{2}) (\d{2}), (\d{4})\s*₹\s*([\d,]+)\s*\(([+-]?[\d,]+)\)\s*₹\s*([\d,]+)\s*\(([+-]?[\d,]+)\)/g;
  const rows = [];
  let m;
  while ((m = re.exec(text))) {
    const month = MONTHS[m[1]];
    if (!month) continue;
    const date = `${m[3]}-${String(month).padStart(2, '0')}-${m[2]}`;
    rows.push({ date, perGram: toNumber(m[6]) });
  }
  if (!rows.length) throw new Error('Goodreturns: 10-day table not found');
  return rows;
}

export async function fetchStockezee() {
  return parseStockezee(await fetchText('https://www.stockezee.com/gold-price-today/mumbai'));
}

export async function fetchGoodreturns() {
  return parseGoodreturns(await fetchText('https://www.goodreturns.in/gold-rates/mumbai.html'));
}
