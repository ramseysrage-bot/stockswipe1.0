import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const POLYGON_KEY = Deno.env.get('POLYGON_KEY') ?? 'sCT1CY6jexDOq2E76cmLP8hyLlGrDPZN';
const NUM_SIMULATIONS = 10000;
const RISK_FREE_DAILY = Math.log(1 + 0.045) / 252;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchDailyCloses(ticker: string, from: string, to: string): Promise<number[]> {
  const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=500&apiKey=${POLYGON_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Polygon ${ticker}: ${res.status}`);
  const json = await res.json();
  if (!json.results || json.results.length < 20) throw new Error(`Insufficient data for ${ticker}`);
  return json.results.map((r: { c: number }) => r.c);
}

function logReturns(closes: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < closes.length; i++) r.push(Math.log(closes[i] / closes[i - 1]));
  return r;
}

// Align series to the shortest length
function alignReturns(series: number[][]): number[][] {
  const minLen = Math.min(...series.map(s => s.length));
  return series.map(s => s.slice(s.length - minLen));
}

// Clamp weights to [minW, maxW] and renormalise so they still sum to 1
function clampWeights(w: number[], minW: number, maxW: number): number[] {
  const n = w.length;
  const clamped = w.map(x => Math.min(Math.max(x, minW), maxW));
  const s = clamped.reduce((a, b) => a + b, 0);
  return clamped.map(x => x / s);
}

// Monte Carlo: random Dirichlet weights (constrained), pick max Sharpe
function monteCarloMaxSharpe(returns: number[][]): number[] {
  const n = returns.length;
  const days = returns[0].length;
  // Cap any single asset at 80% — floor removed so the math speaks for itself
  const MIN_W = 0;
  const MAX_W = 0.80;
  let bestSharpe = -Infinity;
  let bestWeights: number[] = new Array(n).fill(1 / n);

  for (let sim = 0; sim < NUM_SIMULATIONS; sim++) {
    // Dirichlet via exponential normalisation, then clamp to bounds
    const raw = Array.from({ length: n }, () => -Math.log(Math.random() + 1e-10));
    const sum = raw.reduce((a, b) => a + b, 0);
    const w = clampWeights(raw.map(x => x / sum), MIN_W, MAX_W);

    // Portfolio daily returns
    let meanExcess = 0;
    let m2 = 0;
    for (let d = 0; d < days; d++) {
      let r = 0;
      for (let i = 0; i < n; i++) r += w[i] * returns[i][d];
      const excess = r - RISK_FREE_DAILY;
      const delta = excess - meanExcess;
      meanExcess += delta / (d + 1);
      m2 += delta * (excess - meanExcess);
    }
    const variance = m2 / days;
    if (variance <= 0) continue;
    const sharpe = (meanExcess / Math.sqrt(variance)) * Math.sqrt(252);

    if (sharpe > bestSharpe) {
      bestSharpe = sharpe;
      bestWeights = w;
    }
  }
  return bestWeights;
}

// Convert float weights to integer percentages summing to 100
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

    const closeSeries = await Promise.all(tickers.map((t: string) => fetchDailyCloses(t, from, to)));
    const returnSeries = alignReturns(closeSeries.map(logReturns));

    const bestWeightArr = monteCarloMaxSharpe(returnSeries);
    const weights = toIntPcts(bestWeightArr, tickers);

    // Compute final Sharpe for the optimal weights
    const days = returnSeries[0].length;
    let meanExcess = 0, m2 = 0;
    for (let d = 0; d < days; d++) {
      let r = 0;
      for (let i = 0; i < tickers.length; i++) r += bestWeightArr[i] * returnSeries[i][d];
      const excess = r - RISK_FREE_DAILY;
      const delta = excess - meanExcess;
      meanExcess += delta / (d + 1);
      m2 += delta * (excess - meanExcess);
    }
    const sharpe = parseFloat(((meanExcess / Math.sqrt(m2 / days)) * Math.sqrt(252)).toFixed(2));

    return new Response(JSON.stringify({ weights, sharpe }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('optimise-portfolio error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
