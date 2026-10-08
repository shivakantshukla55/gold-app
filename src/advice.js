// Simple, transparent "buy today?" heuristic for retail buyers.
// It compares today's rate with this month's average and the recent range.
// It is NOT a price prediction.

export function getAdvice(daily, todayStr) {
  const monthKey = todayStr.slice(0, 7);
  const monthDays = daily.filter((d) => d.date.startsWith(monthKey) && d.date <= todayStr);
  const recent = daily.filter((d) => d.date <= todayStr).slice(-10);
  if (monthDays.length < 2 || recent.length < 3) {
    return { verdict: 'neutral', title: 'Not enough data yet', reasons: ['Need a few more days of prices to give a suggestion.'], score: 0 };
  }

  const price = recent.at(-1).price;
  const avg = monthDays.reduce((s, d) => s + d.price, 0) / monthDays.length;
  const vsAvg = ((price - avg) / avg) * 100;
  const lo = Math.min(...recent.map((d) => d.price));
  const hi = Math.max(...recent.map((d) => d.price));
  const position = hi === lo ? 0.5 : (price - lo) / (hi - lo); // 0 = lowest of last 10 days, 1 = highest
  const last3 = recent.slice(-4).map((d) => d.price);
  const risingStreak = last3.every((p, i) => i === 0 || p > last3[i - 1]);

  let score = 0;
  const reasons = [];

  if (vsAvg <= -0.5) { score += 2; reasons.push(`Today is ${Math.abs(vsAvg).toFixed(1)}% below this month's average.`); }
  else if (vsAvg < 0) { score += 1; reasons.push(`Today is slightly below this month's average (${vsAvg.toFixed(1)}%).`); }
  else if (vsAvg >= 0.5) { score -= 2; reasons.push(`Today is ${vsAvg.toFixed(1)}% above this month's average.`); }
  else { score -= 1; reasons.push(`Today is about at or slightly above this month's average (+${vsAvg.toFixed(1)}%).`); }

  if (position <= 0.25) { score += 1; reasons.push('Price is near the low end of the last 10 days.'); }
  else if (position >= 0.75) { score -= 1; reasons.push('Price is near the high end of the last 10 days.'); }
  else reasons.push('Price is in the middle of the last 10 days range.');

  if (risingStreak) { score -= 1; reasons.push('Price has risen several days in a row.'); }

  const verdict = score >= 2 ? 'buy' : score <= -2 ? 'wait' : 'neutral';
  const title = { buy: 'Good day to buy', wait: 'Better to wait', neutral: 'Fair price – no strong signal' }[verdict];
  return { verdict, title, reasons, score, avg: Math.round(avg), lo, hi };
}
