import { useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../store/AppContext'

// ── Constants ────────────────────────────────────────────────────────────────

const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_KEY || 'd6nk26hr01qodk605hhgd6nk26hr01qodk605hi0'

const DEAD_TICKERS = new Set([
  'DIDI', 'RIDE', 'XELA', 'SPCE', 'BBBY', 'CLOV', 'WKHS', 'NKLA', 'ATVI', 'TWTR',
])

// ── Scoring helpers (ported from index.html) ────────────────────────────────

const CATEGORY_KEYWORDS = {
  'AI & Tech': ['ai & technology', 'technology', 'tech', 'software', 'cloud', 'saas', 'internet'],
  'EVs & Clean Energy': ['evs & clean energy', 'clean energy', 'ev', 'electric vehicle', 'renewable', 'solar', 'battery', 'wind'],
  'Energy': ['commodities & energy', 'energy', 'oil', 'gas', 'petroleum', 'commodities', 'mining', 'natural gas', 'crude'],
  'Healthcare': ['healthcare & biotech', 'healthcare', 'biotech', 'pharma', 'medical', 'health'],
  'Finance': ['banking & finance', 'banking', 'finance', 'financial', 'insurance', 'fintech', 'investment'],
  'Retail': ['retail & consumer', 'retail', 'consumer', 'e-commerce', 'shopping', 'apparel'],
  'Gaming': ['gaming & entertainment', 'gaming', 'entertainment', 'game', 'esports'],
  'Real Estate': ['real estate', 'reit', 'property', 'housing', 'realty'],
  'Travel': ['travel', 'airline', 'hotel', 'tourism', 'hospitality', 'cruise'],
  'Semis': ['semiconductors', 'semiconductor', 'semis', 'chips', 'hardware'],
  'Social Media': ['social media', 'social', 'media', 'digital media', 'advertising'],
  'Food': ['food & consumer', 'food', 'restaurant', 'beverage', 'agriculture', 'grocery'],
  'Defense': ['defense & aerospace', 'defense', 'aerospace', 'military', 'security'],
  'Emerging Mkts': ['emerging markets', 'emerging', 'international', 'china', 'india', 'latam'],
  'Crypto': ['crypto', 'blockchain', 'bitcoin', 'digital assets', 'web3', 'cryptocurrency'],
}

const INCOME_CATS = ['finance', 'banking', 'reit', 'real estate', 'utilities', 'consumer staples', 'insurance', 'energy', 'telecom', 'dividend']
const GROWTH_CATS = ['tech', 'ai', 'software', 'cloud', 'saas', 'semiconductor', 'semis', 'chips', 'ev', 'electric', 'biotech', 'internet']
const SPEC_CATS   = ['crypto', 'blockchain', 'gaming', 'biotech', 'ev', 'electric', 'emerging', 'china', 'cannabis', 'spac']

function parseCats(cats) {
  try {
    let arr
    if (Array.isArray(cats)) {
      arr = cats
    } else {
      const raw = String(cats || '').trim()
      if (raw.startsWith('{') && raw.endsWith('}')) {
        arr = raw.slice(1, -1).split(',').map(s => s.replace(/^"|"$/g, '').trim())
      } else {
        arr = JSON.parse(raw || '[]')
      }
    }
    return arr.map(c => String(c).toLowerCase().trim())
  } catch {
    return cats ? [String(cats).toLowerCase().trim()] : []
  }
}

function scoreStock(stock, profile) {
  const cats = parseCats(stock.cats)
  const risk = (stock.risk || 'moderate').toLowerCase()
  const tier = Number(stock.tier) || 3
  let score = 0

  // 1. Category match
  let categoryScore = 0
  for (const selectedCat of profile.categories) {
    const keywords = (CATEGORY_KEYWORDS[selectedCat] || [selectedCat]).map(k => k.toLowerCase())
    const matched = keywords.some(kw => cats.some(c => c.includes(kw) || kw.includes(c)))
    if (matched) categoryScore += 40
  }
  score += categoryScore

  // Zero-match penalty
  if (profile.categories.length > 0 && categoryScore === 0) score -= 80

  // 2. Risk alignment
  if (profile.risk === 'safe') {
    if (risk === 'safe') score += 30
    if (risk === 'moderate') score += 10
    if (risk === 'high') score -= 30
  } else if (profile.risk === 'balanced') {
    if (risk === 'moderate') score += 25
    if (risk === 'safe') score += 12
    if (risk === 'high') score += 8
  } else {
    if (risk === 'high') score += 35
    if (risk === 'moderate') score += 10
    if (risk === 'safe') score -= 15
  }

  // 3. Experience / tier
  if (profile.experience === 'beginner') {
    if (tier === 1) score += 35
    if (tier === 2) score += 10
    if (tier >= 3) score -= 20
  } else if (profile.experience === 'learning') {
    if (tier === 1) score += 20
    if (tier === 2) score += 15
    if (tier >= 3) score -= 5
  } else if (profile.experience === 'portfolio') {
    if (tier === 1) score += 5
    if (tier === 2) score += 20
    if (tier >= 3) score += 12
  } else {
    if (tier === 1) score -= 10
    if (tier === 2) score += 15
    if (tier >= 3) score += 30
  }

  // 4. Horizon + goal combos
  const hasIncome = INCOME_CATS.some(kw => cats.some(c => c.includes(kw)))
  const hasGrowth = GROWTH_CATS.some(kw => cats.some(c => c.includes(kw)))
  const hasSpec   = SPEC_CATS.some(kw => cats.some(c => c.includes(kw)))

  if (profile.horizon === 'long') {
    if (hasIncome) score += 20
    if (risk === 'safe' && profile.risk !== 'aggressive') score += 10
    if (profile.risk === 'safe') {
      if (risk === 'high') score -= 40
      if (tier >= 3) score -= 15
    }
  }
  if (profile.horizon === 'short') {
    if (hasSpec) score += 25
    if (risk === 'high') score += 20
    if (risk === 'safe' && profile.risk !== 'safe') score -= 15
  }
  if (profile.risk === 'aggressive' || profile.horizon === 'long') {
    if (hasGrowth) score += 20
  }

  // 5. Known stocks boost
  const knownStockCategoryMap = {
    Apple: 'AI & Tech', Google: 'AI & Tech', Amazon: 'AI & Tech', Microsoft: 'AI & Tech',
    Tesla: 'EVs & Clean Energy', Nvidia: 'AI & Tech', JPMorgan: 'Finance', Visa: 'Finance',
    'Johnson & Johnson': 'Healthcare', ExxonMobil: 'EVs & Clean Energy', Netflix: 'Social Media', Meta: 'Social Media',
  };
  (profile.knownStocks || []).forEach(name => {
    const cat = knownStockCategoryMap[name]
    if (cat && profile.categories.includes(cat)) score += 15
  })

  // 6. Randomness ±10
  score += (Math.random() * 20) - 10

  return score
}

function rankStocksForUser(stocks, profile) {
  const scored = stocks.map(s => ({ s, score: scoreStock(s, profile) }))
  scored.sort((a, b) => b.score - a.score)

  const top7 = scored.slice(0, 7).map(x => x.s)
  const exploratory = scored.slice(7, 80).sort(() => Math.random() - 0.5).slice(0, 10).map(x => x.s)

  const feed = []
  let ai = 0, ei = 0
  while (feed.length < 7 && (ai < top7.length || ei < exploratory.length)) {
    if (ai < top7.length && feed.length < 7) feed.push(top7[ai++])
    if (ai < top7.length && feed.length < 7) feed.push(top7[ai++])
    if (ei < exploratory.length && feed.length < 7) feed.push(exploratory[ei++])
  }
  if (feed.length < 7) {
    const feedSet = new Set(feed.map(s => s.ticker))
    const extras = scored.filter(x => !feedSet.has(x.s.ticker)).map(x => x.s)
    extras.sort(() => Math.random() - 0.5)
    for (let i = 0; feed.length < 7 && i < extras.length; i++) feed.push(extras[i])
  }
  return feed.slice(0, 7)
}

// ── Stock object factory ──────────────────────────────────────────────────────

function buildStockObj(s) {
  const sector = (() => {
    try {
      const a = JSON.parse(s.cats || '[]')
      return Array.isArray(a) ? a[0] : s.cats
    } catch {
      return s.cats || ''
    }
  })()

  const bullets = s.why
    ? (Array.isArray(s.why) ? s.why : (() => { try { return JSON.parse(s.why) } catch { return [s.why] } })())
    : ['Matches your interest profile.']

  return {
    ticker: s.ticker || '???',
    name: s.name || s.ticker,
    desc: s.description || '',
    why: s.why || '',
    tags: s.tags ? (Array.isArray(s.tags) ? s.tags : s.tags.split(',').map(t => t.trim())) : [],
    similar: s.similar || [],
    risk: s.risk || 'Moderate',
    ceo: s.ceo || '-',
    hq: s.hq || '-',
    founded: s.founded || '-',
    employees: s.employees || '-',
    bizModel: s.biz || '',
    short_desc: s.short_desc || '',
    sector,
    price: '...',
    change: '...',
    color: 'grey',
    analystClass: 'ab-hold',
    analyst: 'Hold',
    mcap: '-', pe: '-', ps: '-', div: '-', eps: '-',
    high52: '-', low52: '-', rev: '-', netInc: '-', vol: '-', beta: '-',
    ret1w: '0', ret1m: '0', ret6m: '0', ret1y: '0',
    perfDesc: 'Performance data...',
    sentiment: 50,
    riskIcon: s.risk === 'High' ? '🚀' : (s.risk === 'Safe' ? '🛡️' : '⚖️'),
    riskDesc: s.risk === 'High'
      ? 'High volatility growth play'
      : (s.risk === 'Safe' ? 'Stable blue-chip company' : 'Balanced growth potential'),
    bullets,
    anBuyPct: 33, anHoldPct: 33, anSellPct: 34,
    anStr: 'Loading...', anTarget: '-', anUpside: '-',
    priceLoaded: false,
  }
}

// ── Yahoo Finance fetch with CORS fallback ────────────────────────────────────

async function fetchWithFallback(yahooUrl) {
  try {
    const r = await fetch(yahooUrl)
    if (!r.ok) throw new Error('direct failed')
    return await r.json()
  } catch {
    const r = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(yahooUrl))
    if (!r.ok) throw new Error('proxy failed')
    return await r.json()
  }
}

// ── useFeed hook ──────────────────────────────────────────────────────────────

export function useFeed() {
  const {
    deck, setDeck,
    savedStocks, setSavedStocks,
    seenTickers,
    currentUser, isGuest,
    userProfile,
    showToast,
    logoCache,
  } = useApp()

  const feedInitialized = useRef(false)
  const swipeLock = useRef(false)
  const savedTickerSet = useRef(new Set())

  // ── loadSeenTickers ────────────────────────────────────────────────────────

  const loadSeenTickers = useCallback(async () => {
    if (!currentUser || isGuest) return
    try {
      const { data: prof } = await supabase
        .from('user_profiles')
        .select('batch_created_at')
        .eq('user_id', currentUser.id)
        .maybeSingle()

      const now = Date.now()
      const batchCreatedAt = prof?.batch_created_at ? new Date(prof.batch_created_at).getTime() : null
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000

      if (!batchCreatedAt) {
        await supabase.from('user_profiles')
          .update({ batch_created_at: new Date().toISOString() })
          .eq('user_id', currentUser.id)
      } else if (now - batchCreatedAt > TWENTY_FOUR_HOURS) {
        await supabase.from('seen_stocks')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('action', 'passed')
        await supabase.from('user_profiles')
          .update({ batch_created_at: new Date().toISOString() })
          .eq('user_id', currentUser.id)
      } else {
        const { data: seen } = await supabase
          .from('seen_stocks')
          .select('ticker')
          .eq('user_id', currentUser.id)
        ;(seen || []).forEach(r => seenTickers.current.add(r.ticker))
      }

      // Always load saved tickers — unaffected by 24-hr reset
      const { data: saved } = await supabase
        .from('saved_stocks')
        .select('ticker')
        .eq('user_id', currentUser.id)
      savedTickerSet.current = new Set((saved || []).map(r => r.ticker))
    } catch (e) {
      console.error('loadSeenTickers error:', e)
    }
  }, [currentUser, isGuest, seenTickers])

  // ── fetchTopCardPrice ──────────────────────────────────────────────────────

  const fetchTopCardPrice = useCallback(async (currentDeck) => {
    const deckArr = currentDeck ?? deck
    const stock = deckArr[deckArr.length - 1]
    if (!stock || stock.priceLoaded) return

    // Mark as loading to prevent duplicate fetches
    stock.priceLoaded = true

    try {
      const data = await fetchWithFallback(
        `https://query1.finance.yahoo.com/v8/finance/chart/${stock.ticker}?interval=1d&range=1d&_=${Date.now()}`
      )
      const meta = data?.chart?.result?.[0]?.meta
      if (!meta) return

      const c = meta.regularMarketPrice
      const o = meta.chartPreviousClose
      const changePct = ((c - o) / o * 100).toFixed(2)

      stock.price = '$' + c.toFixed(2)
      stock.change = (changePct >= 0 ? '+' : '') + changePct + '%'
      stock.color = changePct >= 0 ? 'green' : 'red'
      stock.pe = meta.trailingPE ? meta.trailingPE.toFixed(2) : null
      stock.marketCap = meta.marketCap ? '$' + (meta.marketCap / 1e9).toFixed(1) + 'B' : null
      stock.week52High = meta.fiftyTwoWeekHigh ? meta.fiftyTwoWeekHigh.toFixed(2) : null
      stock.week52Low = meta.fiftyTwoWeekLow ? meta.fiftyTwoWeekLow.toFixed(2) : null

      const rec = meta.recommendationKey || 'hold'
      const recMap = {
        strongbuy: { cls: 'ab-buy', label: 'Strong Buy' },
        buy:       { cls: 'ab-buy', label: 'Buy' },
        hold:      { cls: 'ab-hold', label: 'Hold' },
        sell:      { cls: 'ab-sell', label: 'Sell' },
        strongsell:{ cls: 'ab-sell', label: 'Strong Sell' },
      }
      const recInfo = recMap[rec] || recMap['hold']
      stock.analyst = recInfo.label
      stock.analystClass = recInfo.cls

      const sentimentMap = { strongbuy: 85, buy: 70, hold: 50, sell: 30, strongsell: 15 }
      stock.sentiment = sentimentMap[rec] || 50

      // Trigger a deck update so components re-render with the new price
      setDeck(prev => [...prev])
    } catch {
      // price stays as '...' — non-fatal
    }
  }, [deck, setDeck])

  // ── fetchLogo (single) ────────────────────────────────────────────────────

  const fetchLogo = useCallback(async (ticker) => {
    if (logoCache.current[ticker] !== undefined) return logoCache.current[ticker]
    try {
      const res = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${FINNHUB_KEY}`)
      const data = await res.json()
      logoCache.current[ticker] = data?.logo || ''
    } catch {
      logoCache.current[ticker] = ''
    }
    return logoCache.current[ticker]
  }, [logoCache])

  // ── fetchLogosSequentially ────────────────────────────────────────────────

  const fetchLogosSequentially = useCallback(async (tickers) => {
    for (const ticker of tickers) {
      if (logoCache.current[ticker] !== undefined) continue
      await fetchLogo(ticker)
      await new Promise(r => setTimeout(r, 250))
    }
  }, [fetchLogo, logoCache])

  // ── removeCardFromDeck ────────────────────────────────────────────────────

  const removeCardFromDeck = useCallback((ticker) => {
    setDeck(prev => prev.filter(s => s.ticker !== ticker))
  }, [setDeck])

  // ── actionSwipe ───────────────────────────────────────────────────────────

  const actionSwipe = useCallback(async (dir) => {
    if (swipeLock.current) return
    swipeLock.current = true
    setTimeout(() => { swipeLock.current = false }, 600)

    const swipedStock = deck[deck.length - 1]
    if (!swipedStock) return

    if (dir === 'right') {
      setSavedStocks(prev => [...prev, swipedStock])
      showToast(`Saved ${swipedStock.ticker}`)
      if (currentUser && !isGuest) {
        try {
          await supabase.from('saved_stocks').insert({
            user_id: currentUser.id,
            ticker: swipedStock.ticker,
          })
        } catch {
          // non-fatal
        }
      }
    }

    // Mark as seen
    seenTickers.current.add(swipedStock.ticker)
    if (currentUser && !isGuest) {
      try {
        await supabase.from('seen_stocks').upsert({
          user_id: currentUser.id,
          ticker: swipedStock.ticker,
          action: dir === 'right' ? 'saved' : 'passed',
          seen_at: new Date().toISOString(),
        }, { onConflict: 'user_id,ticker' })
      } catch {
        // non-fatal
      }
    }

    // Pop top card after animation delay
    setTimeout(() => {
      setDeck(prev => prev.slice(0, -1))
    }, 300)
  }, [deck, setDeck, setSavedStocks, currentUser, isGuest, seenTickers, showToast])

  // ── initFeed ───────────────────────────────────────────────────────────────

  const initFeed = useCallback(async () => {
    if (feedInitialized.current) return
    feedInitialized.current = true

    seenTickers.current.clear()
    await loadSeenTickers()

    try {
      const { data: stocks, error } = await supabase
        .from('stock_editorial')
        .select('*')
        .limit(500)

      if (error) console.error('Supabase error:', error)

      const savedSet = savedTickerSet.current
      const fetchedStocks = (stocks || []).filter(
        s => !DEAD_TICKERS.has(s.ticker) &&
             !seenTickers.current.has(s.ticker) &&
             !savedSet.has(s.ticker)
      )
      const remainingSlots = Math.max(0, 7 - seenTickers.current.size)

      let rankedStocks
      if (userProfile) {
        rankedStocks = rankStocksForUser(fetchedStocks, userProfile).slice(0, remainingSlots)
      } else {
        rankedStocks = fetchedStocks.sort(() => Math.random() - 0.5).slice(0, remainingSlots)
      }

      const newDeck = rankedStocks.map(buildStockObj).reverse()
      setDeck(newDeck)

      // Fetch logos for the top 5 visible cards first, then the rest lazily
      const topTickers  = newDeck.slice(-5).map(s => s.ticker)
      const restTickers = newDeck.slice(0, -5).map(s => s.ticker)
      fetchLogosSequentially(topTickers).then(() => fetchLogosSequentially(restTickers))

      // Fetch price for the top card
      fetchTopCardPrice(newDeck)
    } catch (err) {
      console.error('Feed error:', err)
    }
  }, [
    userProfile, currentUser, isGuest,
    seenTickers, savedTickerSet,
    setDeck, loadSeenTickers,
    fetchLogosSequentially, fetchTopCardPrice,
  ])

  // ── resetFeed (used on sign-out / retake quiz) ─────────────────────────────

  const resetFeed = useCallback(() => {
    feedInitialized.current = false
    seenTickers.current.clear()
    setDeck([])
  }, [setDeck, seenTickers])

  return {
    initFeed,
    resetFeed,
    actionSwipe,
    removeCardFromDeck,
    fetchTopCardPrice,
    fetchLogo,
    fetchLogosSequentially,
  }
}
