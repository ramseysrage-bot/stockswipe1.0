import { useEffect, useState } from 'react'
import { useApp } from '../../store/AppContext'
import { fetchWithFallback } from '../../lib/yahoo'

const INDEX_TICKERS = [
  { ticker: '^GSPC', label: 'S&P 500' },
  { ticker: '^DJI',  label: 'Dow'     },
  { ticker: '^IXIC', label: 'NASDAQ'  },
  { ticker: '^VIX',  label: 'VIX'     },
]

export default function IndexPillRow() {
  const { activeTab, isExpanded } = useApp()
  const [pills, setPills] = useState(
    INDEX_TICKERS.map(t => ({ ...t, change: '—', positive: null }))
  )

  const visible = activeTab === 'home' && !isExpanded

  useEffect(() => {
    if (!visible) return
    let cancelled = false

    async function fetchAll() {
      const updated = await Promise.all(INDEX_TICKERS.map(async ({ ticker, label }) => {
        try {
          const url  = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=5m&range=1d`
          const data = await fetchWithFallback(url)
          const meta = data?.chart?.result?.[0]?.meta
          if (!meta) throw new Error('no meta')
          const price = meta.regularMarketPrice
          const prev  = meta.chartPreviousClose || meta.previousClose || price
          const pct   = ((price - prev) / prev * 100)
          return { ticker, label, change: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`, positive: pct >= 0 }
        } catch {
          return { ticker, label, change: '--', positive: null }
        }
      }))
      if (!cancelled) setPills(updated)
    }

    fetchAll()
    const interval = setInterval(fetchAll, 60000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [visible])

  return (
    <div id="index-cards-row" style={{ display: visible ? 'block' : 'none' }}>
      <div className="index-pills-label">Indexes</div>
      <div className="index-pills-row">
        {pills.map(p => (
          <div key={p.ticker} className="index-pill">
            <span className="index-pill-label">{p.label}</span>
            <span className={`idx-pill-change${p.positive === true ? ' green' : p.positive === false ? ' red' : ''}`}>
              {p.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
