import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../store/AppContext'
import { fetchWithFallback } from '../lib/yahoo'

export function useWatchlist() {
  const { currentUser, savedStocks, setSavedStocks, showToast } = useApp()

  const loadWatchlist = useCallback(async () => {
    if (!currentUser) return []
    const { data, error } = await supabase
      .from('saved_stocks')
      .select('ticker, saved_at')
      .eq('user_id', currentUser.id)
      .order('saved_at', { ascending: false })
    if (error) { console.error('loadWatchlist', error); return [] }
    const tickers = (data || []).map(r => r.ticker)
    // Fetch live prices
    const withPrices = await Promise.all(tickers.map(async ticker => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`
        const res = await fetchWithFallback(url)
        const meta = res?.chart?.result?.[0]?.meta
        const price  = meta?.regularMarketPrice ?? 0
        const prev   = meta?.chartPreviousClose || meta?.previousClose || price
        const pct    = prev ? ((price - prev) / prev * 100) : 0
        const isPos  = pct >= 0
        return {
          ticker,
          price: price ? `$${price.toFixed(2)}` : '—',
          change: `${isPos ? '+' : ''}${pct.toFixed(2)}%`,
          color: isPos ? '#00C853' : '#E53935',
          sector: meta?.instrumentType || '',
        }
      } catch {
        return { ticker, price: '—', change: '—', color: '#888', sector: '' }
      }
    }))
    setSavedStocks(withPrices)
    return withPrices
  }, [currentUser, setSavedStocks])

  const removeFromSaved = useCallback(async (ticker) => {
    if (!currentUser) return
    await supabase.from('saved_stocks').delete()
      .eq('user_id', currentUser.id).eq('ticker', ticker)
    setSavedStocks(prev => prev.filter(s => s.ticker !== ticker))
    showToast(`${ticker} removed`)
  }, [currentUser, setSavedStocks, showToast])

  const clearAllSaved = useCallback(async () => {
    if (!currentUser) return
    await supabase.from('saved_stocks').delete().eq('user_id', currentUser.id)
    setSavedStocks([])
    showToast('Watchlist cleared')
  }, [currentUser, setSavedStocks, showToast])

  return { loadWatchlist, removeFromSaved, clearAllSaved }
}
