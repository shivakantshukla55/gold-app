# Mumbai 22K Gold Price (React)

Shows retail 22 carat gold rates for Mumbai (not stock/futures prices):

1. Today's rate, highlighted (per gram and per 10 g)
2. Trend graph – "This month" or "Yearly"
3. Daily list for the current month (1st → today)
4. A "should I buy today?" suggestion

## Run it

```bash
npm install
npm run dev        # API on :3001, app on http://localhost:5173
# or, single server:
npm start          # builds, then serves everything on http://localhost:3001
```

Requires Node 18+.

## Where the data comes from

- **Today (live):** https://www.stockezee.com/gold-price-today/mumbai (22K, quoted per 10 g)
- **Last 10 days:** https://www.goodreturns.in/gold-rates/mumbai.html (22K per gram)
- **Earlier months (yearly chart only):** BankBazaar monthly averages, bundled in `server/seed.json`

Browsers can't read these sites directly (CORS), so a tiny Express server in `server/` fetches them,
caches for 15 minutes, and saves every day it sees in `data/history.json`. Open the app (or keep the server
running) at least once every 10 days and the monthly list never has gaps.

If a site changes its layout, only the two regexes in `server/scrape.js` need adjusting.
`npm test` checks the parsers and the advice logic against text copied from the live pages.

## How the "buy today?" suggestion works

It scores today's rate against this month's average (±), where it sits in the last 10 days' range,
and whether it has risen several days in a row. Score ≥ 2 → "Good day to buy", ≤ −2 → "Better to wait",
otherwise neutral. It is a simple comparison, not a forecast. Edit `src/advice.js` to change the rules.
