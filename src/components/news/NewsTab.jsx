import { useEffect, useState } from 'react'
import { useApp } from '../../store/AppContext'
import { fetchCompanyNews, fetchMarketNews } from '../../lib/finnhub'
import NewsCard from './NewsCard'
import ShareModal from '../shared/ShareModal'

export default function NewsTab() {
  const { savedStocks, activeTab } = useApp()
  const [articles, setArticles]     = useState([])
  const [loading, setLoading]       = useState(false)
  const [tickerFilter, setTickerFilter] = useState('All')
  const [sharePayload, setSharePayload] = useState(null)

  async function loadNews() {
    setLoading(true)
    try {
      const to   = Math.floor(Date.now() / 1000)
      const from = to - 7 * 86400
      const tickers = savedStocks.map(s => s.ticker).slice(0, 8)

      let all = []
      if (tickers.length) {
        const results = await Promise.allSettled(
          tickers.map(t => fetchCompanyNews(t, from, to).then(news => (news || []).map(a => ({ ...a, ticker: t }))))
        )
        all = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])
      }
      if (!all.length) {
        all = (await fetchMarketNews().catch(() => [])) || []
      }

      // Deduplicate and sort
      const seen = new Set()
      const deduped = all
        .filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true })
        .sort((a, b) => b.datetime - a.datetime)
        .slice(0, 40)
      setArticles(deduped)
    } catch {
      setArticles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'news') loadNews()
  }, [activeTab, savedStocks.length])

  const tickerList = ['All', ...new Set(savedStocks.map(s => s.ticker))]
  const filtered = tickerFilter === 'All'
    ? articles
    : articles.filter(a => a.ticker === tickerFilter)

  return (
    <>
      <div className="news-screen active">
        <div className="news-top-bar">
          <h2 className="news-header" style={{ padding: 0, margin: 0 }}>Market News</h2>
          <button className="news-refresh-btn" onClick={loadNews} disabled={loading}>
            {loading ? '…' : '↻ Refresh'}
          </button>
        </div>

        {/* Ticker filters */}
        {savedStocks.length > 0 && (
          <div className="news-ticker-filters">
            {tickerList.map(t => (
              <span
                key={t}
                className={`ntf-pill${tickerFilter === t ? ' active' : ''}`}
                onClick={() => setTickerFilter(t)}
              >{t}</span>
            ))}
          </div>
        )}

        <div className="news-feed">
          {loading ? (
            <div className="news-spinner"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 60, color: '#aaa', fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
              {savedStocks.length === 0
                ? 'Save some stocks first to see related news'
                : 'No news found · try refreshing'}
            </div>
          ) : (
            filtered.map((article, i) => (
              <NewsCard
                key={article.id || i}
                article={article}
                ticker={article.ticker}
                onShare={() => setSharePayload({ type: 'article', article, ticker: article.ticker })}
              />
            ))
          )}
        </div>
      </div>

      <ShareModal
        isOpen={!!sharePayload}
        onClose={() => setSharePayload(null)}
        payload={sharePayload}
      />
    </>
  )
}
