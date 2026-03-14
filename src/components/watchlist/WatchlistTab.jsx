import { useEffect, useState } from 'react'
import { useApp } from '../../store/AppContext'
import { useWatchlist } from '../../hooks/useWatchlist'
import WatchlistSummary from './WatchlistSummary'
import StockRow from './StockRow'
import WatchlistDetailModal from './WatchlistDetailModal'

export default function WatchlistTab() {
  const { savedStocks, activeTab } = useApp()
  const { loadWatchlist, removeFromSaved, clearAllSaved } = useWatchlist()
  const [filter, setFilter]       = useState('All')
  const [detailStock, setDetailStock] = useState(null)
  const [loading, setLoading]     = useState(false)

  useEffect(() => {
    if (activeTab !== 'watchlist') return
    setLoading(true)
    loadWatchlist().finally(() => setLoading(false))
  }, [activeTab])

  const sectors = ['All', ...new Set(savedStocks.map(s => s.sector).filter(Boolean))]
  const filtered = filter === 'All' ? savedStocks : savedStocks.filter(s => s.sector === filter)

  return (
    <>
      <div className="watchlist-screen active">
        <div className="wl-header">
          <div className="wl-title">Saved Stocks</div>
          {savedStocks.length > 0 && (
            <button
              onClick={() => window.confirm('Clear all saved stocks?') && clearAllSaved()}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#E53935', fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: 'pointer' }}
            >
              Clear All
            </button>
          )}
        </div>

        {savedStocks.length > 0 && <WatchlistSummary stocks={savedStocks} />}

        {/* Filter pills */}
        {sectors.length > 1 && (
          <div className="wl-filter-bar" style={{ overflowX: 'auto', gap: 6, padding: '0 24px 12px' }}>
            {sectors.map(s => (
              <button
                key={s}
                className={`wl-filter-btn${filter === s ? ' wl-f-active' : ''}`}
                onClick={() => setFilter(s)}
              >{s}</button>
            ))}
          </div>
        )}

        <div className="wl-list">
          {loading ? (
            <div style={{ textAlign: 'center', paddingTop: 60, color: '#aaa', fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="wl-empty">
              <div className="wl-empty-icon">★</div>
              <div className="wl-empty-title">No saved stocks yet</div>
              <div className="wl-empty-sub">Swipe right on stocks in your feed to save them here.</div>
            </div>
          ) : (
            filtered.map(stock => (
              <StockRow
                key={stock.ticker}
                stock={stock}
                onDelete={removeFromSaved}
                onOpen={setDetailStock}
              />
            ))
          )}
        </div>
      </div>

      <WatchlistDetailModal stock={detailStock} onClose={() => setDetailStock(null)} />
    </>
  )
}
