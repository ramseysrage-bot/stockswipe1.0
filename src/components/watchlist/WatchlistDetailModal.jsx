import { useEffect, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js'
import { fetchWithFallback } from '../../lib/yahoo'
import { fetchMetrics } from '../../lib/finnhub'
import CompanyLogo from '../shared/CompanyLogo'

Chart.register(...registerables)

const RANGES = ['1D', '1W', '1M', '3M', '1Y']
const RANGE_PARAMS = {
  '1D': { interval: '5m',  range: '1d'  },
  '1W': { interval: '60m', range: '5d'  },
  '1M': { interval: '1d',  range: '1mo' },
  '3M': { interval: '1d',  range: '3mo' },
  '1Y': { interval: '1wk', range: '1y'  },
}

export default function WatchlistDetailModal({ stock, onClose }) {
  const canvasRef  = useRef(null)
  const chartRef   = useRef(null)
  const [activeRange, setActiveRange] = useState('1D')
  const [metrics, setMetrics]         = useState(null)
  const [loading, setLoading]         = useState(false)
  const isPos = stock?.color === '#00C853'
  const color = isPos ? '#00C853' : '#E53935'

  useEffect(() => {
    if (!stock) return
    let cancelled = false
    setLoading(true)
    async function load() {
      try {
        const { interval, range } = RANGE_PARAMS[activeRange]
        const url  = `https://query1.finance.yahoo.com/v8/finance/chart/${stock.ticker}?interval=${interval}&range=${range}`
        const data = await fetchWithFallback(url)
        const res  = data?.chart?.result?.[0]
        const ts   = res?.timestamp || []
        const cl   = res?.indicators?.quote?.[0]?.close || []
        const pts  = ts.map((t, i) => ({ x: t * 1000, y: cl[i] })).filter(p => p.y != null)
        if (cancelled) return

        if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
        if (!canvasRef.current || !pts.length) return

        chartRef.current = new Chart(canvasRef.current, {
          type: 'line',
          data: {
            datasets: [{ data: pts, borderColor: color, borderWidth: 2, pointRadius: 0, tension: 0.3,
              fill: { target: 'origin', above: color + '18' } }],
          },
          options: {
            responsive: true, maintainAspectRatio: false, animation: { duration: 200 },
            plugins: { legend: { display: false } },
            scales: { x: { type: 'time', display: false }, y: { display: false } },
          },
        })
      } finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true; if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null } }
  }, [stock, activeRange, color])

  useEffect(() => {
    if (stock) fetchMetrics(stock.ticker).then(setMetrics).catch(() => {})
  }, [stock])

  if (!stock) return null

  return (
    <div className={`wl-detail-modal${stock ? ' active' : ''}`}>
      <div className="wl-detail-header">
        <span className="wl-detail-back" onClick={onClose}>←</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CompanyLogo ticker={stock.ticker} size={28} />
          <span className="wl-detail-title">{stock.ticker}</span>
        </div>
      </div>
      <div className="wl-detail-body">
        <div className="wl-detail-card">
          {/* Price header */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, fontWeight: 700, color: '#0a0a0a' }}>
              {stock.price}
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color, marginTop: 4 }}>
              {stock.change}
            </div>
          </div>

          {/* Range tabs */}
          <div className="wl-detail-tab-row">
            {RANGES.map(r => (
              <span
                key={r}
                className={`wl-detail-tab${activeRange === r ? ' active' : ''}`}
                onClick={() => setActiveRange(r)}
              >{r}</span>
            ))}
          </div>

          {/* Chart */}
          <div className="wl-detail-chart-wrap">
            {loading
              ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>Loading…</div>
              : <canvas ref={canvasRef} style={{ height: 180 }} />
            }
          </div>

          {/* Metrics */}
          {metrics && (
            <div className="metrics-grid" style={{ marginTop: 16 }}>
              {[
                { label: 'P/E', val: metrics?.peNormalizedAnnual?.toFixed(2) },
                { label: '52W High', val: metrics?.['52WeekHigh'] != null ? `$${metrics['52WeekHigh'].toFixed(2)}` : null },
                { label: '52W Low',  val: metrics?.['52WeekLow']  != null ? `$${metrics['52WeekLow'].toFixed(2)}`  : null },
                { label: 'Beta',     val: metrics?.beta?.toFixed(2) },
              ].map(({ label, val }) => (
                <div key={label} className="metric-cell">
                  <div className="metric-lbl">{label}</div>
                  <div className="metric-val">{val ?? '—'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
