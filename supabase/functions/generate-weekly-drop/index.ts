import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const POLYGON_KEY    = Deno.env.get('POLYGON_KEY')!;
const FINNHUB_KEY    = Deno.env.get('FINNHUB_KEY')!;
const ANTHROPIC_KEY  = Deno.env.get('ANTHROPIC_API_KEY')!;

function getWeekId(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// Parse cats JSON string into first category string
function firstCat(cats: string | null): string {
  if (!cats) return 'Other';
  try {
    const arr = JSON.parse(cats);
    return Array.isArray(arr) && arr.length > 0 ? arr[0] : 'Other';
  } catch { return 'Other'; }
}

// Fetch 5-day % change for all tickers via Yahoo Finance spark API (max 20/request, concurrent)
async function fetchWeeklyChanges(tickers: string[]): Promise<Record<string, number>> {
  const BATCH = 20;
  const batches: string[][] = [];
  for (let i = 0; i < tickers.length; i += BATCH) {
    batches.push(tickers.slice(i, i + BATCH));
  }

  const results = await Promise.all(batches.map(async (batch) => {
    const partial: Record<string, number> = {};
    try {
      const res  = await fetch(
        `https://query2.finance.yahoo.com/v8/finance/spark?symbols=${batch.join(',')}&range=5d&interval=1d`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      const data = await res.json();
      // Response is flat dict: { "AAPL": { close: [...] }, ... }
      for (const [sym, val] of Object.entries(data as Record<string, unknown>)) {
        if (!val || typeof val !== 'object') continue;
        const closes = ((val as { close?: (number | null)[] }).close ?? []).filter((c): c is number => c != null);
        if (closes.length >= 2) {
          partial[sym] = ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100;
        }
      }
    } catch (_) { /* skip */ }
    return partial;
  }));

  return Object.assign({}, ...results);
}

serve(async (req) => {
  try {
    // Simple shared-secret guard for cron + manual trigger
    const cronSecret    = Deno.env.get('CRON_SECRET') ?? '';
    const incomingSecret = req.headers.get('x-cron-secret') ?? '';
    if (cronSecret && incomingSecret !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const now    = new Date();
    const weekId = getWeekId(now);

    // Idempotent — skip if already generated this week
    const { data: existing } = await supabase
      .from('weekly_drops')
      .select('id')
      .eq('week_id', weekId)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ message: 'Already generated', week_id: weekId }), { status: 200 });
    }

    // 1. Fetch our full ticker universe from DB
    const { data: stocks, error: fetchErr } = await supabase
      .from('stock_editorial')
      .select('ticker, name, cats, tier');

    if (fetchErr || !stocks?.length) {
      return new Response(JSON.stringify({ error: fetchErr?.message ?? 'No stocks' }), { status: 500 });
    }

    // 2. Get true 5-day % change for all tickers via Yahoo Finance spark (batched)
    const scoreMap = await fetchWeeklyChanges(stocks.map(s => s.ticker));

    // 3. Rank by 5-day return — pure performance, no tier bias
    const scored = stocks
      .filter(s => scoreMap[s.ticker] !== undefined)
      .map(s => ({ ...s, _score: scoreMap[s.ticker] }))
      .sort((a, b) => b._score - a._score);

    // 4. Pick top 7 with diversity — try max 2 per category, relax to 3 if needed
    function pickWithLimit(candidates: typeof scored, limit: number): typeof scored {
      const result: typeof scored = [];
      const catCounts: Record<string, number> = {};
      for (const s of candidates) {
        if (result.length >= 7) break;
        const cat = firstCat(s.cats);
        if ((catCounts[cat] ?? 0) >= limit) continue;
        result.push(s);
        catCounts[cat] = (catCounts[cat] ?? 0) + 1;
      }
      return result;
    }

    let picks = pickWithLimit(scored, 2);
    if (picks.length < 7) picks = pickWithLimit(scored, 3);
    if (picks.length < 7) picks = scored.slice(0, 7); // last resort: pure top 7

    // 5. For each pick: fetch Finnhub news → ask Claude for qualitative why
    const toDate   = now.toISOString().split('T')[0];
    const fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const stocksWithWhy = await Promise.all(picks.map(async (pick) => {
      let headlines: string[] = [];
      try {
        const res  = await fetch(
          `https://finnhub.io/api/v1/company-news?symbol=${pick.ticker}&from=${fromDate}&to=${toDate}&token=${FINNHUB_KEY}`
        );
        const news = await res.json();
        if (Array.isArray(news)) {
          headlines = news.slice(0, 5).map((n: { headline?: string }) => n.headline).filter(Boolean) as string[];
        }
      } catch (_) { /* no headlines */ }

      const newsBlock = headlines.length > 0
        ? `Recent headlines this week:\n${headlines.map(h => `- ${h}`).join('\n')}`
        : `No specific headlines available this week.`;

      const prompt = `You are writing a "why it's here this week" blurb for a stock discovery app's weekly Hot 7 list.

Stock: ${pick.ticker} (${pick.name}) — ${firstCat(pick.cats)}
${newsBlock}

Write exactly one punchy sentence explaining why this stock deserves a spot in this week's Hot 7. Rules:
- Qualitative only — no numbers, percentages, or price targets
- Specific to this week's story if headlines are available; otherwise speak to the company's current momentum
- Tone: sharp market observer, not a financial advisor
- No caveats or disclaimers
- Do not start with the ticker or company name`;

      let why = '';
      try {
        const cr = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 120,
            messages: [{ role: 'user', content: prompt }]
          })
        });
        const cd = await cr.json();
        why = (cd.content?.[0]?.text ?? '').trim();
      } catch (_) { /* fallback */ }

      if (!why) why = `${pick.name} is showing strong momentum this week across the market.`;

      return { ticker: pick.ticker, why };
    }));

    // 6. Write to DB
    const { error: insertErr } = await supabase
      .from('weekly_drops')
      .insert({ week_id: weekId, published_at: now.toISOString(), stocks: stocksWithWhy, status: 'published' });

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), { status: 500 });
    }

    return new Response(
      JSON.stringify({ success: true, week_id: weekId, picks: stocksWithWhy }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
