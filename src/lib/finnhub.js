const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_KEY
const BASE = 'https://finnhub.io/api/v1'

// In-memory logo cache keyed by ticker: URL string (or '' if none), undefined if not yet fetched
export const logoCache = {}

/**
 * Fetches a company logo URL from Finnhub for the given ticker.
 * Results are cached in logoCache to avoid redundant requests.
 * Returns the logo URL string, or '' if unavailable.
 */
export async function fetchLogo(ticker) {
  if (logoCache[ticker] !== undefined) return logoCache[ticker]
  try {
    const res = await fetch(`${BASE}/stock/profile2?symbol=${ticker}&token=${FINNHUB_KEY}`)
    const data = await res.json()
    logoCache[ticker] = data?.logo || ''
  } catch (_) {
    logoCache[ticker] = ''
  }
  return logoCache[ticker]
}

/**
 * Fetches logos one at a time with a 250ms gap to stay under Finnhub rate limits.
 * Skips tickers that are already cached.
 */
export async function fetchLogosSequentially(tickers) {
  for (const ticker of tickers) {
    if (logoCache[ticker] !== undefined) continue
    await fetchLogo(ticker)
    await new Promise(r => setTimeout(r, 250))
  }
}

/**
 * Injects a company logo into an <img> element using the URL stored in logoCache.
 * Falls back to the colored ticker pill (fallbackEl) if no URL is available or
 * the image fails to load — no broken image icons ever.
 *
 * @param {HTMLImageElement} imgEl
 * @param {HTMLElement} fallbackEl
 * @param {string} ticker
 */
export function injectLogo(imgEl, fallbackEl, ticker) {
  const logoUrl = logoCache[ticker]
  if (!logoUrl) {
    imgEl.style.display = 'none'
    fallbackEl.style.display = ''
    return
  }
  imgEl.src = logoUrl
  imgEl.onerror = () => {
    imgEl.style.display = 'none'
    fallbackEl.style.display = ''
  }
  imgEl.style.display = 'block'
  fallbackEl.style.display = 'none'
}

/**
 * Fetches all key metrics for a ticker from Finnhub.
 * Returns the raw metric object, or null on failure.
 *
 * @param {string} ticker
 * @returns {Promise<Object|null>}
 */
export async function fetchMetrics(ticker) {
  try {
    const res = await fetch(`${BASE}/stock/metric?symbol=${ticker}&metric=all&token=${FINNHUB_KEY}`)
    const data = await res.json()
    return data?.metric ?? null
  } catch (e) {
    console.error('fetchMetrics error:', e)
    return null
  }
}

/**
 * Fetches analyst recommendations for a ticker from Finnhub.
 * Returns the most recent recommendation entry object, or null.
 *
 * Returned object shape: { strongBuy, buy, hold, sell, strongSell, period, symbol }
 *
 * @param {string} ticker
 * @returns {Promise<Object|null>}
 */
export async function fetchRecommendations(ticker) {
  try {
    const res = await fetch(`${BASE}/stock/recommendation?symbol=${ticker}&token=${FINNHUB_KEY}`)
    const data = await res.json()
    return Array.isArray(data) && data.length > 0 ? data[0] : null
  } catch (e) {
    console.error('fetchRecommendations error:', e)
    return null
  }
}

/**
 * Fetches annual financials-reported data for a ticker from Finnhub.
 * Returns the parsed revenue and net income values, or nulls if unavailable.
 *
 * Falls back to deriving revenue from revenuePerShareTTM * sharesOutstanding
 * if the income-statement concepts are missing.
 *
 * @param {string} ticker
 * @returns {Promise<{ revenue: number|null, netIncome: number|null }>}
 */
export async function fetchFinancials(ticker) {
  const revConcepts = [
    'Revenues', 'us-gaap_Revenues',
    'RevenueFromContractWithCustomerExcludingAssessedTax', 'us-gaap_RevenueFromContractWithCustomerExcludingAssessedTax',
    'SalesRevenueNet', 'us-gaap_SalesRevenueNet',
    'RevenueFromContractWithCustomerIncludingAssessedTax', 'us-gaap_RevenueFromContractWithCustomerIncludingAssessedTax',
    'us-gaap_RevenueFromContractWithCustomer', 'RevenueFromContractWithCustomer',
  ]
  const niConcepts = [
    'NetIncomeLoss', 'us-gaap_NetIncomeLoss',
    'NetIncome', 'us-gaap_NetIncome',
    'ProfitLoss', 'us-gaap_ProfitLoss',
    'us-gaap_NetIncomeLossAvailableToCommonStockholdersBasic', 'NetIncomeLossAvailableToCommonStockholdersBasic',
  ]

  try {
    const res = await fetch(`${BASE}/stock/financials-reported?symbol=${ticker}&freq=annual&token=${FINNHUB_KEY}`)
    const data = await res.json()

    if (data?.data?.length > 0) {
      const ic = data.data[0].report?.ic
      if (ic) {
        let revenue = null, netIncome = null
        ic.forEach(item => {
          if (!revenue && revConcepts.includes(item.concept)) revenue = item.value
          if (!netIncome && niConcepts.includes(item.concept)) netIncome = item.value
        })
        if (revenue !== null || netIncome !== null) {
          return { revenue, netIncome }
        }
      }
    }
  } catch (e) {
    console.error('fetchFinancials error:', e)
  }

  // Fallback: derive from metric data
  try {
    const m = await fetchMetrics(ticker)
    if (m) {
      const shares = m['sharesOutstanding'] || m['shareOutstanding']
      const revenue = m['revenuePerShareTTM'] && shares
        ? m['revenuePerShareTTM'] * shares * 1e6
        : null
      const netIncome = revenue && m['netProfitMarginTTM']
        ? revenue * m['netProfitMarginTTM'] / 100
        : null
      return { revenue, netIncome }
    }
  } catch (e) {
    console.error('fetchFinancials metric fallback error:', e)
  }

  return { revenue: null, netIncome: null }
}

/**
 * Fetches company news for a ticker for the past 7 days from Finnhub.
 * Returns an array of article objects (up to 5 per ticker), or [].
 *
 * @param {string} ticker
 * @param {string} fromDate  ISO date string e.g. '2026-03-06'
 * @param {string} toDate    ISO date string e.g. '2026-03-13'
 * @returns {Promise<Array>}
 */
export async function fetchCompanyNews(ticker, fromDate, toDate) {
  try {
    const res = await fetch(
      `${BASE}/company-news?symbol=${ticker}&from=${fromDate}&to=${toDate}&token=${FINNHUB_KEY}`
    )
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch (e) {
    console.error('fetchCompanyNews error:', e)
    return []
  }
}

/**
 * Fetches general market news from Finnhub.
 * Returns an array of article objects (up to 5), or [].
 *
 * @returns {Promise<Array>}
 */
export async function fetchMarketNews() {
  try {
    const res = await fetch(`${BASE}/news?category=general&token=${FINNHUB_KEY}`)
    const data = await res.json()
    return Array.isArray(data) ? data.slice(0, 5) : []
  } catch (e) {
    console.error('fetchMarketNews error:', e)
    return []
  }
}
