import { useEffect, useRef, useState, useCallback } from 'react'
import { Chart, registerables } from 'chart.js'
import { fetchWithFallback } from '../../../lib/yahoo'
import { fetchMetrics, fetchRecommendations, fetchCompanyNews } from '../../../lib/finnhub'
import { useApp } from '../../../store/AppContext'
import RangeSelector from './RangeSelector'
import CompanyHeader from '../SwipeCard/CompanyHeader'

Chart.register(...registerables)

const RANGES = ['1D', '1W', '1M', '3M', '1Y']

const RANGE_PARAMS = {
  '1D': { interval: '5m',  range: '1d'  },
  '1W': { interval: '60m', range: '5d'  },
  '1M': { interval: '1d',  range: '1mo' },
  '3M': { interval: '1d',  range: '3mo' },
  '1Y': { interval: '1wk', range: '1y'  },
}

function fmtNum(n, suffix = '') {
  if (n == null) return '—'
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + 'T' + suffix
  if (Math.abs(n) >= 1e9)  return (n / 1e9).toFixed(2)  + 'B' + suffix
  if (Math.abs(n) >= 1e6)  return (n / 1e6).toFixed(2)  + 'M' + suffix
  return n.toLocaleString() + suffix
}

export default function ExpandedCard({ stock, onCollapse, onShare }) {
  const { expChartCache } = useApp()
  const canvasRef  = useRef(null)
  const chartRef   = useRef(null)
  const [activeRange, setActiveRange] = useState('1D')
  const [activeTab,   setActiveTab]   = useState('chart')
  const [chartLoading, setChartLoading] = useState(false)
  const [metrics, setMetrics]   = useState(null)
  const [recs,    setRecs]      = useState(null)
  const [news,    setNews]      = useState([])

  const isPos = stock.change && !stock.change.startsWith('-')
  const color = isPos ? '#00C853' : '#E53935'

  const loadChart = useCallback(async (range) => {
    const cacheKey = `${stock.ticker}:${range}`
    let points = expChartCache.current[cacheKey]

    if (!points) {
      setChartLoading(true)
      try {
        const { interval, range: r } = RANGE_PARAMS[range]
        const url  = `https://query1.finance.yahoo.com/v8/finance/chart/${stock.ticker}?interval=${interval}&range=${r}`
        const data = await fetchWithFallback(url)
        const res  = data?.chart?.result?.[0]
        const ts   = res?.timestamp || []
        const cl   = res?.indicators?.quote?.[0]?.close || []
        points = ts.map((t, i) => ({ x: t * 1000, y: cl[i] })).filter(p => p.y != null)
        expChartCache.current[cacheKey] = points
      } catch { points = [] }
      setChartLoading(false)
    }

    if (chartRef.current) {
      chartRef.current.destroy()
      chartRef.current = null
    }
    if (!canvasRef.current || !points.length) return

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        datasets: [{
          data: points,
          borderColor: color,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: {
            target: 'origin',
            above: color + '18',
          },
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: { legend: { display: false }, tooltip: {
          callbacks: { label: ctx => `$${ctx.parsed.y?.toFixed(2)}` },
        }},
        scales: {
          x: { type: 'time', display: false },
          y: { display: false },
        },
      },
    })
  }, [stock.ticker, color, expChartCache])

  useEffect(() => {
    loadChart(activeRange)
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null } }
  }, [activeRange, loadChart])

  useEffect(() => {
    if (activeTab !== 'metrics') return
    fetchMetrics(stock.ticker).then(setMetrics).catch(() => {})
    fetchRecommendations(stock.ticker).then(setRecs).catch(() => {})
  }, [activeTab, stock.ticker])

  useEffect(() => {
    if (activeTab !== 'news') return
    const to   = Math.floor(Date.now() / 1000)
    const from = to - 30 * 86400
    fetchCompanyNews(stock.ticker, from, to).then(n => setNews(n?.slice(0, 10) || [])).catch(() => {})
  }, [activeTab, stock.ticker])

  return (
    <div className="swipe-card expanded" style={{ position: 'fixed', top: 60, left: 20, right: 20, zIndex: 500 }}>
      {/* Pull down button */}
      <button className="pull-down-btn" onClick={onCollapse}>↓ Close</button>

      <div className="card-inner">
        <CompanyHeader stock={stock} showExpanded />

        {/* Tab bar */}
        <div className="exp-tab-row">
          {['chart', 'metrics', 'news'].map(t => (
            <span
              key={t}
              className={`exp-tab${activeTab === t ? ' exp-tab-active' : ''}`}
              onClick={() => setActiveTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </span>
          ))}
        </div>

        {/* Chart tab */}
        {activeTab === 'chart' && (
          <div className="expanded-only">
            <RangeSelector ranges={RANGES} active={activeRange} onChange={setActiveRange} color={color} />
            <div className="exp-chart-wrap">
              {chartLoading ? (
                <div className="exp-chart-loading">Loading…</div>
              ) : (
                <canvas ref={canvasRef} style={{ height: 200, width: '100%' }} />
              )}
            </div>
          </div>
        )}

        {/* Metrics tab */}
        {activeTab === 'metrics' && (
          <div className="expanded-only">
            {!metrics ? (
              <div className="exp-chart-loading">Loading metrics…</div>
            ) : (
              <div className="metrics-grid" style={{ marginTop: 12 }}>
                {[
                  { label: 'P/E Ratio',     val: metrics?.peNormalizedAnnual?.toFixed(2) },
                  { label: 'EPS',            val: metrics?.epsNormalizedAnnual != null ? `$${metrics.epsNormalizedAnnual.toFixed(2)}` : null },
                  { label: '52W High',       val: metrics?.['52WeekHigh']   != null ? `$${metrics['52WeekHigh'].toFixed(2)}`   : null },
                  { label: '52W Low',        val: metrics?.['52WeekLow']    != null ? `$${metrics['52WeekLow'].toFixed(2)}`    : null },
                  { label: 'Beta',           val: metrics?.beta?.toFixed(2) },
                  { label: 'Div Yield',      val: metrics?.dividendYieldIndicatedAnnual != null ? `${(metrics.dividendYieldIndicatedAnnual * 100).toFixed(2)}%` : null },
                  { label: 'Revenue / Shr',  val: metrics?.revenuePerShareTTM?.toFixed(2) },
                  { label: 'Mkt Cap',        val: metrics?.marketCapitalization != null ? fmtNum(metrics.marketCapitalization * 1e6) : null },
                ].map(({ label, val }) => (
                  <div key={label} className="metric-cell">
                    <div className="metric-lbl">{label}</div>
                    <div className="metric-val">{val ?? '—'}</div>
                  </div>
                ))}
              </div>
            )}
            {recs && (
              <div style={{ marginTop: 20 }}>
                <div className="c-sec-title" style={{ marginBottom: 8 }}>Analyst Consensus</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { k: 'strongBuy', label: 'Strong Buy', color: '#00C853' },
                    { k: 'buy',       label: 'Buy',        color: '#69F0AE' },
                    { k: 'hold',      label: 'Hold',       color: '#FFC107' },
                    { k: 'sell',      label: 'Sell',       color: '#E53935' },
                  ].map(({ k, label, color: c }) => recs[k] > 0 && (
                    <div key={k} style={{ flex: recs[k], background: c, borderRadius: 8, padding: '8px 4px', textAlign: 'center', color: '#fff', fontSize: 11, fontFamily: "'DM Mono', monospace" }}>
                      {recs[k]}<br/><span style={{ fontSize: 9 }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* News tab */}
        {activeTab === 'news' && (
          <div className="expanded-only">
            {news.length === 0 ? (
              <div className="exp-chart-loading">No recent news</div>
            ) : news.map((a, i) => (
              <a key={i} href={a.url} target="_blank" rel="noreferrer" className="news-card" style={{ textDecoration: 'none', display: 'block', marginTop: 12 }}>
                <div className="nc-source">{a.source}</div>
                <div className="nc-title">{a.headline}</div>
                <div className="nc-time">{new Date(a.datetime * 1000).toLocaleDateString()}</div>
              </a>
            ))}
          </div>
        )}

        {/* Share button */}
        <button className="card-share-pill" onClick={onShare}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          Share {stock.ticker}
        </button>
      </div>
    </div>
  )
}
