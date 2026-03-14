import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const POLYGON_KEY = Deno.env.get('POLYGON_KEY') ?? 'sCT1CY6jexDOq2E76cmLP8hyLlGrDPZN';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function periodToFromDate(period: string): string {
  const to = new Date();
  const from = new Date(to);
  if (period === '1y') from.setFullYear(from.getFullYear() - 1);
  else if (period === '6m') from.setMonth(from.getMonth() - 6);
  else if (period === '3m') from.setMonth(from.getMonth() - 3);
  else from.setFullYear(from.getFullYear() - 1); // default 1y
  return from.toISOString().split('T')[0];
}

async function fetchDailyCloses(ticker: string, from: string, to: string): Promise<{ date: string; close: number }[]> {
  const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=500&apiKey=${POLYGON_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Polygon ${ticker}: ${res.status}`);
  const json = await res.json();
  if (!json.results || json.results.length < 2) throw new Error(`Insufficient data for ${ticker}`);
  return json.results.map((r: { t: number; c: number }) => ({
    date: new Date(r.t).toISOString().split('T')[0],
    close: r.c,
  }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { tickers, allocations, period = '1y' } = await req.json();

    if (!tickers || !allocations || tickers.length !== allocations.length || tickers.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid request: tickers and allocations required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normalise allocations to fractions summing to 1
    const totalAlloc = allocations.reduce((s: number, a: number) => s + a, 0);
    const weights: number[] = allocations.map((a: number) => a / totalAlloc);

    const toDate = new Date().toISOString().split('T')[0];
    const fromDate = periodToFromDate(period);

    // Fetch all tickers + SPY in parallel
    const allTickers = [...tickers, 'SPY'];
    const fetches = allTickers.map((t: string) => fetchDailyCloses(t, fromDate, toDate));
    const results = await Promise.all(fetches);

    // Use SPY dates as the canonical date axis (it's the most liquid, fewest gaps)
    const spyData = results[results.length - 1];
    const canonicalDates = spyData.map((d) => d.date);

    // Build a close-price lookup per ticker keyed by date
    const closeMaps: Map<string, number>[] = results.slice(0, tickers.length).map((series) => {
      const m = new Map<string, number>();
      series.forEach(({ date, close }) => m.set(date, close));
      return m;
    });

    // Build aligned price matrix — fill forward on missing dates
    const n = canonicalDates.length;
    const prices: number[][] = tickers.map((_: string, ti: number) => {
      const col: number[] = [];
      let lastClose = 0;
      for (const d of canonicalDates) {
        const c = closeMaps[ti].get(d);
        if (c !== undefined) lastClose = c;
        col.push(lastClose);
      }
      return col;
    });

    const spyPrices = spyData.map((d) => d.close);

    // Compute daily log returns for each ticker (length n-1)
    const tickerLogReturns: number[][] = prices.map((col) =>
      col.slice(1).map((c, i) => Math.log(c / col[i]))
    );
    const spyLogReturns: number[] = spyPrices.slice(1).map((c, i) => Math.log(c / spyPrices[i]));

    // Weighted portfolio log returns
    const portfolioLogReturns: number[] = tickerLogReturns[0].map((_, di) =>
      tickerLogReturns.reduce((sum, lr, ti) => sum + weights[ti] * lr[di], 0)
    );

    // Cumulative percentage return curves (starting at 0)
    function toCumulativePct(logReturns: number[]): number[] {
      let cum = 0;
      return [0, ...logReturns.map((lr) => {
        cum += lr;
        return parseFloat(((Math.exp(cum) - 1) * 100).toFixed(2));
      })];
    }

    const portfolioCurve = toCumulativePct(portfolioLogReturns);
    const spCurve = toCumulativePct(spyLogReturns);

    // dates aligned with curves (length = logReturns.length + 1)
    const dates = [canonicalDates[0], ...canonicalDates.slice(1)];

    // Stats
    const totalReturn = parseFloat(portfolioCurve[portfolioCurve.length - 1].toFixed(2));
    const spReturn = parseFloat(spCurve[spCurve.length - 1].toFixed(2));
    const alpha = parseFloat((totalReturn - spReturn).toFixed(2));

    const tradingDays = portfolioLogReturns.length;
    const meanDaily = portfolioLogReturns.reduce((a, b) => a + b, 0) / tradingDays;
    const variance = portfolioLogReturns.reduce((a, b) => a + Math.pow(b - meanDaily, 2), 0) / tradingDays;
    const dailyStd = Math.sqrt(variance);
    const annualisedReturn = parseFloat(((Math.exp(meanDaily * 252) - 1) * 100).toFixed(2));
    const volatility = parseFloat((dailyStd * Math.sqrt(252) * 100).toFixed(2));

    // Sharpe Ratio (risk-free rate ~4.5% annualised)
    const riskFreeDaily = Math.log(1 + 0.045) / 252;
    const excessReturns = portfolioLogReturns.map((r) => r - riskFreeDaily);
    const meanExcess = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
    const stdExcess = Math.sqrt(
      excessReturns.reduce((a, b) => a + Math.pow(b - meanExcess, 2), 0) / excessReturns.length
    );
    const sharpe = parseFloat(((meanExcess / stdExcess) * Math.sqrt(252)).toFixed(2));

    // Sortino Ratio
    const downsideReturns = excessReturns.filter((r) => r < 0);
    const downsideStd = Math.sqrt(
      downsideReturns.reduce((a, b) => a + Math.pow(b, 2), 0) / excessReturns.length
    );
    const sortino = parseFloat(((meanExcess / downsideStd) * Math.sqrt(252)).toFixed(2));

    // Max Drawdown
    let peak = -Infinity;
    let maxDD = 0;
    for (const ret of portfolioCurve) {
      if (ret > peak) peak = ret;
      const dd = peak - ret;
      if (dd > maxDD) maxDD = dd;
    }
    const maxDrawdown = parseFloat((-maxDD).toFixed(2));

    const disclaimer =
      'Past performance is not indicative of future results. This backtest uses historical price data and simulated portfolio returns. It does not account for trading costs, taxes, or slippage. StockSwype does not provide financial advice.';

    return new Response(
      JSON.stringify({
        dates,
        portfolioCurve,
        spCurve,
        stats: {
          totalReturn,
          annualisedReturn,
          volatility,
          alpha,
          spReturn,
          sharpe,
          sortino,
          maxDrawdown,
        },
        disclaimer,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('analyse-portfolio error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
