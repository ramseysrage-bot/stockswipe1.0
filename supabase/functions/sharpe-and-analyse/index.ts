import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const POLYGON_KEY = Deno.env.get('POLYGON_KEY') ?? 'sCT1CY6jexDOq2E76cmLP8hyLlGrDPZN';
const NUM_SIMULATIONS = 10000;
const RISK_FREE_DAILY = Math.log(1 + 0.045) / 252;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchDailyCloses(ticker: string, from: string, to: string): Promise<{ date: string; close: number }[]> {
  const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=500&apiKey=${POLYGON_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Polygon ${ticker}: ${res.status}`);
  const json = await res.json();
  if (!json.results || json.results.length < 20) throw new Error(`Insufficient data for ${ticker}`);
  return json.results.map((r: { t: number; c: number }) => ({
    date: new Date(r.t).toISOString().split('T')[0],
    close: r.c,
  }));
}

function clampWeights(w: number[], maxW: number): number[] {
  const clamped = w.map(x => Math.min(x, maxW));
  const s = clamped.reduce((a, b) => a + b, 0);
  return clamped.map(x => x / s);
}

function toIntPcts(weights: number[], tickers: string[]): { [t: string]: number } {
  const floored = weights.map(w => Math.floor(w * 100));
  const remainder = 100 - floored.reduce((a, b) => a + b, 0);
  const order = weights
    .map((w, i) => ({ i, frac: w * 100 - Math.floor(w * 100) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < remainder; k++) floored[order[k].i]++;
  const result: { [t: string]: number } = {};
  tickers.forEach((t, i) => { result[t] = floored[i]; });
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { tickers, period = '1y' } = await req.json();
    if (!tickers || tickers.length < 2) {
      return new Response(JSON.stringify({ error: 'Need at least 2 tickers' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const to = new Date().toISOString().split('T')[0];
    const from = new Date(Date.now() - (period === '1y' ? 365 : 180) * 86400000).toISOString().split('T')[0];

    // Single fetch: all tickers + SPY
    const allTickers = [...tickers, 'SPY'];
    const allSeries = await Promise.all(allTickers.map(t => fetchDailyCloses(t, from, to)));

    const tickerSeries = allSeries.slice(0, tickers.length);
    const spySeries = allSeries[allSeries.length - 1];

    // Use SPY dates as canonical axis
    const canonicalDates = spySeries.map(d => d.date);

    // Build aligned price matrix with forward-fill
    const closeMaps = tickerSeries.map(series => {
      const m = new Map<string, number>();
      series.forEach(({ date, close }) => m.set(date, close));
      return m;
    });

    const prices: number[][] = tickers.map((_: string, ti: number) => {
      const col: number[] = [];
      let last = 0;
      for (const d of canonicalDates) {
        const c = closeMaps[ti].get(d);
        if (c !== undefined) last = c;
        col.push(last);
      }
      return col;
    });

    const spyPrices = spySeries.map(d => d.close);

    // Log returns
    const tickerLogReturns = prices.map(col =>
      col.slice(1).map((c, i) => Math.log(c / col[i]))
    );
    const spyLogReturns = spyPrices.slice(1).map((c, i) => Math.log(c / spyPrices[i]));

    const days = tickerLogReturns[0].length;
    const n = tickers.length;

    // ── Monte Carlo optimisation ──
    let bestSharpe = -Infinity;
    let bestWeights: number[] = new Array(n).fill(1 / n);

    for (let sim = 0; sim < NUM_SIMULATIONS; sim++) {
      const raw = Array.from({ length: n }, () => -Math.log(Math.random() + 1e-10));
      const sum = raw.reduce((a, b) => a + b, 0);
      const w = clampWeights(raw.map(x => x / sum), 0.80);

      let meanExcess = 0, m2 = 0;
      for (let d = 0; d < days; d++) {
        let r = 0;
        for (let i = 0; i < n; i++) r += w[i] * tickerLogReturns[i][d];
        const excess = r - RISK_FREE_DAILY;
        const delta = excess - meanExcess;
        meanExcess += delta / (d + 1);
        m2 += delta * (excess - meanExcess);
      }
      const variance = m2 / days;
      if (variance <= 0) continue;
      const sharpe = (meanExcess / Math.sqrt(variance)) * Math.sqrt(252);
      if (sharpe > bestSharpe) { bestSharpe = sharpe; bestWeights = w; }
    }

    const weightPcts = toIntPcts(bestWeights, tickers);

    // Filter to non-zero weight tickers for backtest
    const activeTickers = tickers.filter((_: string, i: number) => bestWeights[i] > 0);
    const activeWeights = activeTickers.map((t: string) => weightPcts[t]);
    const totalAlloc = activeWeights.reduce((s: number, a: number) => s + a, 0);
    const normWeights = activeWeights.map((a: number) => a / totalAlloc);

    const activeLogReturns = activeTickers.map((t: string) =>
      tickerLogReturns[tickers.indexOf(t)]
    );

    // Weighted portfolio log returns (active tickers only)
    const portfolioLogReturns = activeLogReturns[0].map((_: number, di: number) =>
      activeLogReturns.reduce((sum: number, lr: number[], ti: number) => sum + normWeights[ti] * lr[di], 0)
    );

    // Cumulative curves
    function toCumulativePct(logReturns: number[]): number[] {
      let cum = 0;
      return [0, ...logReturns.map(lr => {
        cum += lr;
        return parseFloat(((Math.exp(cum) - 1) * 100).toFixed(2));
      })];
    }

    const portfolioCurve = toCumulativePct(portfolioLogReturns);
    const spCurve = toCumulativePct(spyLogReturns);
    const dates = [canonicalDates[0], ...canonicalDates.slice(1)];

    // Stats
    const totalReturn = parseFloat(portfolioCurve[portfolioCurve.length - 1].toFixed(2));
    const spReturn = parseFloat(spCurve[spCurve.length - 1].toFixed(2));
    const alpha = parseFloat((totalReturn - spReturn).toFixed(2));
    const tradingDays = portfolioLogReturns.length;
    const meanDaily = portfolioLogReturns.reduce((a: number, b: number) => a + b, 0) / tradingDays;
    const variance = portfolioLogReturns.reduce((a: number, b: number) => a + Math.pow(b - meanDaily, 2), 0) / tradingDays;
    const dailyStd = Math.sqrt(variance);
    const annualisedReturn = parseFloat(((Math.exp(meanDaily * 252) - 1) * 100).toFixed(2));
    const volatility = parseFloat((dailyStd * Math.sqrt(252) * 100).toFixed(2));

    const excessReturns = portfolioLogReturns.map((r: number) => r - RISK_FREE_DAILY);
    const meanExcess = excessReturns.reduce((a: number, b: number) => a + b, 0) / excessReturns.length;
    const stdExcess = Math.sqrt(excessReturns.reduce((a: number, b: number) => a + Math.pow(b - meanExcess, 2), 0) / excessReturns.length);
    const optimisedSharpe = parseFloat(((meanExcess / stdExcess) * Math.sqrt(252)).toFixed(2));

    const downsideReturns = excessReturns.filter((r: number) => r < 0);
    const downsideStd = Math.sqrt(downsideReturns.reduce((a: number, b: number) => a + Math.pow(b, 2), 0) / excessReturns.length);
    const sortino = parseFloat(((meanExcess / downsideStd) * Math.sqrt(252)).toFixed(2));

    let peak = -Infinity, maxDD = 0;
    for (const ret of portfolioCurve) {
      if (ret > peak) peak = ret;
      const dd = peak - ret;
      if (dd > maxDD) maxDD = dd;
    }
    const maxDrawdown = parseFloat((-maxDD).toFixed(2));

    return new Response(JSON.stringify({
      weights: weightPcts,
      dates,
      portfolioCurve,
      spCurve,
      stats: {
        totalReturn, annualisedReturn, volatility,
        alpha, spReturn,
        sharpe: optimisedSharpe, sortino, maxDrawdown,
      },
      disclaimer: 'Past performance is not indicative of future results. This backtest uses historical price data and simulated portfolio returns. It does not account for trading costs, taxes, or slippage. StockSwype does not provide financial advice.',
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('sharpe-and-analyse error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
