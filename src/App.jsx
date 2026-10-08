import React, { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { getAdvice } from './advice.js';

const inr = (n) => (n == null ? '—' : '₹' + Number(n).toLocaleString('en-IN'));
const shortDay = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const longDay = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const monthLabel = (m) => new Date(m + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [range, setRange] = useState('month');

  useEffect(() => {
    fetch('/api/prices')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Could not load prices'))))
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const today = data?.today.date;

  // Every day of the current month, 1st up to today (missing days stay empty).
  const monthRows = useMemo(() => {
    if (!data) return [];
    const [y, m, d] = today.split('-').map(Number);
    const byDate = Object.fromEntries(data.daily.map((x) => [x.date, x.price]));
    const rows = [];
    for (let day = 1; day <= d; day++) {
      const date = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      rows.push({ date, price: byDate[date] ?? null });
    }
    return rows.map((r, i) => {
      const prev = rows.slice(0, i).reverse().find((x) => x.price != null);
      return { ...r, change: r.price != null && prev ? r.price - prev.price : null };
    });
  }, [data, today]);

  const advice = useMemo(() => (data ? getAdvice(data.daily, today) : null), [data, today]);

  if (error) return <main className="wrap"><p className="error">{error}</p></main>;
  if (!data) return <main className="wrap"><p className="muted">Loading today's gold rate…</p></main>;

  const yesterday = [...data.daily].reverse().find((d) => d.date < today);
  const change = yesterday ? data.today.perGram - yesterday.price : null;
  const chartData =
    range === 'month'
      ? monthRows.filter((r) => r.price != null).map((r) => ({ label: shortDay(r.date), price: r.price }))
      : data.monthly.slice(-12).map((r) => ({ label: monthLabel(r.month), price: r.avg }));
  const prices = chartData.map((c) => c.price);
  const pad = Math.max(50, Math.round((Math.max(...prices) - Math.min(...prices)) * 0.2));

  return (
    <main className="wrap">
      <header>
        <h1>Mumbai · 22K Gold</h1>
      </header>

      {/* 1. Today's price */}
      <section className="hero card">
        <div className="muted">{longDay(today)}</div>
        <div className="price">{inr(data.today.per10g)}<span>/ 10 gram</span></div>
        <div className="sub">{inr(data.today.perGram)} / gram</div>
        {change != null && (
          <div className={'chip ' + (change > 0 ? 'up' : change < 0 ? 'down' : '')}>
            {change > 0 ? '▲' : change < 0 ? '▼' : '•'} {inr(Math.abs(change))} vs yesterday
          </div>
        )}
        <div className="muted small">
          Source: {data.today.source}{data.today.updatedLabel ? ` · updated ${data.today.updatedLabel}` : ''}
        </div>
      </section>

      {/* 4. Buy suggestion */}
      <section className={'card advice ' + advice.verdict}>
        <h2>Should I buy today?</h2>
        <div className="verdict">{advice.title}</div>
        <ul>{advice.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
        <p className="muted small">
          A simple comparison with this month's prices, not a forecast.
        </p>
      </section>

      {/* 2. Graph */}
      <section className="card">
        <div className="row">
          <h2>Price trend</h2>
          <div className="toggle">
            <button className={range === 'month' ? 'on' : ''} onClick={() => setRange('month')}>This month</button>
            <button className={range === 'year' ? 'on' : ''} onClick={() => setRange('year')}>Yearly</button>
          </div>
        </div>
        <div style={{ height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6dfc8" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis domain={[Math.min(...prices) - pad, Math.max(...prices) + pad]} tick={{ fontSize: 12 }} width={56}
                     tickFormatter={(v) => v.toLocaleString('en-IN')} />
              <Tooltip formatter={(v) => [inr(v), range === 'month' ? 'Per gram' : 'Monthly avg / gram']} />
              <Line type="monotone" dataKey="price" stroke="#b8860b" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {range === 'year' && (
          <p className="muted small">
            Monthly averages per gram. Earlier months come from BankBazaar's monthly table, so they can differ slightly
            from the daily rates; the current month uses the daily rates tracked by this app.
          </p>
        )}
      </section>

      {/* 3. Month list */}
      <section className="card">
        <h2>{new Date(today + 'T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} – daily rates</h2>
        <table>
          <thead><tr><th>Date</th><th className="r">Per gram</th><th className="r">Per 10 g</th><th className="r">Change</th></tr></thead>
          <tbody>
            {[...monthRows].reverse().map((r) => (
              <tr key={r.date} className={r.date === today ? 'today' : ''}>
                <td>{shortDay(r.date)}{r.date === today ? ' (today)' : ''}</td>
                <td className="r">{inr(r.price)}</td>
                <td className="r">{r.price != null ? inr(r.price * 10) : '—'}</td>
                <td className={'r ' + (r.change > 0 ? 'upt' : r.change < 0 ? 'downt' : '')}>
                  {r.change == null ? '—' : r.change === 0 ? '0' : (r.change > 0 ? '+' : '−') + Math.abs(r.change)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {monthRows.some((r) => r.price == null) && (
          <p className="muted small">"—" means that day wasn't available when the app was not running yet; it fills in going forward.</p>
        )}
      </section>

      {data.warnings?.length > 0 && (
        <p className="muted small">Note: some data sources failed just now ({data.warnings.join('; ')}). Showing the last saved prices.</p>
      )}
      <footer className="footer">
      <div className="footer__content">
        <span>Made with</span>
        <span className="footer__heart" aria-label="love">
          ❤️
        </span>
        <span>by</span>
        <span className="footer__name">Shivakant Shukla</span>
      </div>
    </footer>
    </main>
  );
}
