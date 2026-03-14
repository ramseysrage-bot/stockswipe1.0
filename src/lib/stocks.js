/**
 * Maps quiz step-1 labels to lowercase keywords to match against stock.cats.
 * Partial matches work (e.g. "tech" matches "fintech").
 */
export const CATEGORY_KEYWORDS = {
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

// Category keywords that signal strong dividend / income potential
const INCOME_CATS = ['finance', 'banking', 'reit', 'real estate', 'utilities', 'consumer staples',
  'insurance', 'energy', 'telecom', 'dividend']

// Category keywords that signal high revenue-growth potential
const GROWTH_CATS = ['tech', 'ai', 'software', 'cloud', 'saas', 'semiconductor', 'semis',
  'chips', 'ev', 'electric', 'biotech', 'internet']

// Category keywords that signal high volatility / speculation suitability
const SPEC_CATS = ['crypto', 'blockchain', 'gaming', 'biotech', 'ev', 'electric',
  'emerging', 'china', 'cannabis', 'spac']

/**
 * Safely parses stock.cats (may be a JSON string, a plain array, or a raw string).
 * Always returns a lowercase string array.
 *
 * @param {Array|string} cats
 * @returns {string[]}
 */
export function parseCats(cats) {
  try {
    let arr
    if (Array.isArray(cats)) {
      arr = cats
    } else {
      const raw = String(cats || '').trim()
      if (raw.startsWith('{') && raw.endsWith('}')) {
        // Postgres array literal: {Gaming,Tech} or {"AI & Tech"}
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

/**
 * Scores a single stock row (from stock_editorial) against the user profile.
 *
 * Scoring pillars
 * ───────────────
 * 1. Category match         +40 per matching quiz category
 * 2. Risk alignment         ±15–35 based on stock.risk vs profile.risk
 * 3. Experience / tier      ±10–35 — beginners see large caps, experts see niche
 * 4. Horizon + goal combos  +0–25 for income / growth / speculation signals
 * 5. Known stocks boost     +15 per matched known stock category
 * 6. Randomness             ±10 so the feed feels fresh every session
 *
 * @param {Object} stock   Raw row from stock_editorial
 * @param {Object} profile Output of buildUserProfile()
 * @returns {number}       Score (higher = better match)
 */
export function scoreStock(stock, profile) {
  const cats = parseCats(stock.cats)
  const risk = (stock.risk || 'moderate').toLowerCase() // 'high'|'moderate'|'safe'
  const tier = Number(stock.tier) || 3                  // 1=mega/large, 2=mid, 3+=niche
  let score = 0

  // ── 1. CATEGORY MATCH ──────────────────────────────────────────────
  let categoryScore = 0
  for (const selectedCat of profile.categories) {
    const keywords = (CATEGORY_KEYWORDS[selectedCat] || [selectedCat]).map(k => k.toLowerCase())
    const matched = keywords.some(kw =>
      cats.some(c => c.includes(kw) || kw.includes(c))
    )
    if (matched) categoryScore += 40
  }
  score += categoryScore

  // ── ZERO-MATCH PENALTY ─────────────────────────────────────────────
  // If the user chose categories but this stock matches none of them,
  // push it to the back of the feed rather than polluting the aligned pool.
  if (profile.categories.length > 0 && categoryScore === 0) {
    score -= 80
  }

  // ── 2. RISK ALIGNMENT ──────────────────────────────────────────────
  if (profile.risk === 'safe') {
    if (risk === 'safe') score += 30
    if (risk === 'moderate') score += 10
    if (risk === 'high') score -= 30
  } else if (profile.risk === 'balanced') {
    if (risk === 'moderate') score += 25
    if (risk === 'safe') score += 12
    if (risk === 'high') score += 8
  } else { // aggressive
    if (risk === 'high') score += 35
    if (risk === 'moderate') score += 10
    if (risk === 'safe') score -= 15
  }

  // ── 3. EXPERIENCE / TIER ───────────────────────────────────────────
  // tier 1 = well-known mega/large-caps  (Apple, MSFT, JPM…)
  // tier 2 = recognisable mid-caps
  // tier 3+ = niche / small-cap / obscure
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
  } else { // experienced
    if (tier === 1) score -= 10
    if (tier === 2) score += 15
    if (tier >= 3) score += 30
  }

  // ── 4. HORIZON + GOAL COMBOS ───────────────────────────────────────
  const hasIncome = INCOME_CATS.some(kw => cats.some(c => c.includes(kw)))
  const hasGrowth = GROWTH_CATS.some(kw => cats.some(c => c.includes(kw)))
  const hasSpec = SPEC_CATS.some(kw => cats.some(c => c.includes(kw)))

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

  // Growth: reward high-growth sectors regardless of horizon
  if (profile.risk === 'aggressive' || profile.horizon === 'long') {
    if (hasGrowth) score += 20
  }

  // ── 5. KNOWN STOCKS BOOST ──────────────────────────────────────────
  const knownStockCategoryMap = {
    'Apple': 'AI & Tech',
    'Google': 'AI & Tech',
    'Amazon': 'AI & Tech',
    'Microsoft': 'AI & Tech',
    'Tesla': 'EVs & Clean Energy',
    'Nvidia': 'AI & Tech',
    'JPMorgan': 'Finance',
    'Visa': 'Finance',
    'Johnson & Johnson': 'Healthcare',
    'ExxonMobil': 'EVs & Clean Energy',
    'Netflix': 'Social Media',
    'Meta': 'Social Media',
  }
  ;(profile.knownStocks || []).forEach(name => {
    const cat = knownStockCategoryMap[name]
    if (cat && profile.categories.includes(cat)) score += 15
  })

  // ── 6. RANDOMNESS ±10 (fresh feed every session) ──────────────────
  score += (Math.random() * 20) - 10

  return score
}

/**
 * Takes the full stock pool, scores every stock, and returns exactly 7
 * stocks ordered for the feed.
 *
 * Composition: ~65% aligned (best matches) + ~35% exploratory
 * (slightly outside the user's comfort zone to encourage discovery).
 *
 * Interleaving pattern: 2 aligned → 1 exploratory → repeat.
 *
 * @param {Array}  stocks  Raw rows from stock_editorial
 * @param {Object} profile Output of buildUserProfile()
 * @returns {Array}        Up to 7 raw stock rows, ordered for the feed
 */
export function rankStocksForUser(stocks, profile) {
  // Score every stock
  const scored = stocks.map(s => ({ s, score: scoreStock(s, profile) }))

  // Sort by score descending — top scorers guaranteed at front
  scored.sort((a, b) => b.score - a.score)

  // Top 7 aligned stocks — always appear first, no shuffling
  const top7 = scored.slice(0, 7).map(x => x.s)

  // Exploratory stocks from positions 7–80, lightly shuffled
  const exploratoryStocks = scored.slice(7, 80).sort(() => Math.random() - 0.5).slice(0, 10).map(x => x.s)

  // Interleave: 2 aligned, 1 exploratory, repeat
  const feed = []
  let ai = 0, ei = 0
  while (feed.length < 7 && (ai < top7.length || ei < exploratoryStocks.length)) {
    if (ai < top7.length && feed.length < 7) feed.push(top7[ai++])
    if (ai < top7.length && feed.length < 7) feed.push(top7[ai++])
    if (ei < exploratoryStocks.length && feed.length < 7) feed.push(exploratoryStocks[ei++])
  }

  // Pad to exactly 7 if pool was too small
  if (feed.length < 7) {
    const feedSet = new Set(feed.map(s => s.ticker))
    const extras = scored.filter(x => !feedSet.has(x.s.ticker)).map(x => x.s)
    extras.sort(() => Math.random() - 0.5)
    for (let i = 0; feed.length < 7 && i < extras.length; i++) {
      feed.push(extras[i])
    }
  }

  return feed.slice(0, 7)
}
