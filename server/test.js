import assert from 'node:assert/strict';
import { parseGoodreturns, parseStockezee } from './scrape.js';
import { buildMonthly } from './index.js';
import { getAdvice } from '../src/advice.js';

// Samples copied from the live pages on 8 Oct 2026.
const goodreturns = `<table><tr><td>Oct 08, 2026</td><td>₹14,957 <span>(0)</span></td><td>₹13,710 <span>(0)</span></td></tr>
<tr><td>Oct 07, 2026</td><td>₹14,957 <span>(-65)</span></td><td>₹13,710 <span>(-60)</span></td></tr>
<tr><td>Oct 06, 2026</td><td>₹15,022 <span>(+104)</span></td><td>₹13,770 <span>(+95)</span></td></tr></table>`;
const rows = parseGoodreturns(goodreturns);
assert.deepEqual(rows, [
  { date: '2026-10-08', perGram: 13710 },
  { date: '2026-10-07', perGram: 13710 },
  { date: '2026-10-06', perGram: 13770 },
]);

const stockezee = `<p>Live Update: 08 Oct 2026 17:00</p><div>Gold 24K</div><div>₹1,49,570</div><div>Gold 22K</div><div>₹1,37,100</div>`;
assert.deepEqual(parseStockezee(stockezee), { per10g: 137100, perGram: 13710, updatedLabel: '08 Oct 2026 17:00' });

const daily = Object.entries({
  '2026-10-01': 13680, '2026-10-02': 13775, '2026-10-03': 13675, '2026-10-04': 13675,
  '2026-10-05': 13675, '2026-10-06': 13770, '2026-10-07': 13710, '2026-10-08': 13710,
}).map(([date, price]) => ({ date, price }));
const m = buildMonthly(Object.fromEntries(daily.map((d) => [d.date, d.price])), '2026-10-08');
assert.equal(m.at(-1).month, '2026-10');
assert.equal(m.at(-1).source, 'tracked');
assert.equal(m.find((x) => x.month === '2026-09').source, 'reference');

const a = getAdvice(daily, '2026-10-08');
assert.ok(['buy', 'wait', 'neutral'].includes(a.verdict));
const cheap = getAdvice([...daily.slice(0, 7), { date: '2026-10-08', price: 13500 }], '2026-10-08');
assert.equal(cheap.verdict, 'buy');
const dear = getAdvice([...daily.slice(0, 7), { date: '2026-10-08', price: 13900 }], '2026-10-08');
assert.equal(dear.verdict, 'wait');

console.log('All checks passed. Advice for the real 8 Oct data:', a.verdict, `(score ${a.score})`);
