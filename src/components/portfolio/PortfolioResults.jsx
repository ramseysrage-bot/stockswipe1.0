import { useEffect, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js'
import { fetchWithFallback } from '../../lib/yahoo'
import { supabase } from '../../lib/supabase'
import { useApp } from '../../store/AppContext'

Chart.register(...registerables)

function calcStats(series) {
  if (!series.length) return { ret: 0, vol: 0, dd: 0 }
  const returns = []
  for (let i = 1; i < series.length; i++) returns.push((series[i] - series[i - 1]) / series[i - 1])
  const avg = returns.reduce((a, b) => a + b, 0) / returns.length
  const ret = ((series[series.length - 1] - series[0]) / series[0]) * 100
  const vol = Math.sqrt(returns.reduce((s, r) => s + (r - avg) ** 2, 0) / returns.length) * Math.sqrt(252) * 100
  let peak = -Infinity, maxDd = 0
  for (const v of series) {
    if (v > peak) peak = v
    const dd = (peak - v) / peak * 100
    if (dd > maxDd) maxDd = dd
  }
  return { ret: ret.toFixed(1), vol: vol.toFixed(1), dd: maxDd.toFixed(1) }
}

export default function PortfolioResults({ tickers, weights, onSave, onBack }) {
  const { currentUser, showToast } = useApp()
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        const datasets = await Promise.all(tickers.map(async ticker => {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1wk&range=1y`
          const data = await fetchWithFallback(url)
          const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || []
          const timestamps = data?.chart?.result?.[0]?.timestamp || []
          return { ticker, closes: closes.filter(Boolean), timestamps }
        }))

        // Use minimum shared length
        const minLen = Math.min(...datasets.map(d => d.closes.length))
        const shared = datasets.map(d => d.closes.slice(-minLen))
        const times = datasets[0]?.timestamps?.slice(-minLen) || []

        // Weighted portfolio series
        const portSeries = Array.from({ length: minLen }, (_, i) => {
          return tickers.reduce((sum, t, ti) => {
            const w = (weights[t] || 0) / 100
            const base = shared[ti][0] || 1
            return sum + w * (shared[ti][i] / base)
          }, 0)
        })

        // S&P 500 benchmark
        const spUrl = `https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1wk&range=1y`
        const spData = await fetchWithFallback(spUrl)
        const spCloses = spData?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.slice(-minLen) || []
        const spSeries = spCloses.filter(Boolean).map((v, i, arr) => v / arr[0])

        if (cancelled) return

        const s = calcStats(portSeries)
        setStats(s)

        if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
        if (!canvasRef.current) return

        const labels = times.map(t => new Date(t * 1000))
        chartRef.current = new Chart(canvasRef.current, {
          type: 'line',
          data: {
            labels,
            datasets: [
              { label: 'Portfolio', data: portSeries.map(v => v * 100 - 100), borderColor: '#00C853', borderWidth: 2, pointRadius: 0, tension: 0.3, fill: false },
              { label: 'S&P 500',   data: spSeries.map(v => v * 100 - 100),   borderColor: '#aaa',    borderWidth: 1.5, pointRadius: 0, tension: 0.3, fill: false, borderDash: [4,2] },
            ],
          },
          options: {
            responsive: true, maintainAspectRatio: false, animation: { duration: 300 },
            plugins: {
              legend: { display: true, position: 'top', labels: { font: { family: "'DM Mono', monospace", size: 11 } } },
            },
            scales: {
              x: { type: 'time', display: false },
              y: { ticks: { callback: v => `${v.toFixed(0)}%`, font: { family: "'DM Mono', monospace", size: 10 } }, grid: { color: '#f0f0f0' } },
            },
          },
        })
      } catch { /* skip */ } finally { if (!cancelled) setLoading(false) }
    }
    loadData()
    return () => { cancelled = true; if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null } }
  }, [tickers, weights])

  async function handleSave() {
    if (!currentUser || !saveName.trim()) return
    setSaving(true)
    const { error } = await supabase.from('portfolios').insert({
      user_id: currentUser.id,
      name: saveName.trim(),
      tickers,
      weights,
    })
    setSaving(false)
    if (!error) { showToast('Portfolio saved!'); onSave?.() }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#888', fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: 'pointer', textAlign: 'left', marginBottom: 12 }}>
        ← Back
      </button>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
          Analyzing portfolio…
        </div>
      ) : (
        <>
          {/* Stats */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[
                { label: '1Y Return',   val: `${stats.ret}%`,  color: Number(stats.ret) >= 0 ? '#00C853' : '#E53935' },
                { label: 'Volatility',  val: `${stats.vol}%`,  color: '#0a0a0a' },
                { label: 'Max Drawdown',val: `-${stats.dd}%`, color: '#E53935' },
              ].map(({ label, val, color }) => (
                <div key={label} className="pf-stat-card">
                  <div className="pf-stat-val" style={{ color }}>{val}</div>
                  <div className="pf-stat-lbl">{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Chart */}
          <div style={{ height: 200, marginBottom: 20, background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0', overflow: 'hidden', padding: 8 }}>
            <canvas ref={canvasRef} style={{ height: '100%' }} />
          </div>

          {/* Allocation breakdown */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase', color: '#bbb', marginBottom: 10 }}>
              Allocation
            </div>
            {tickers.map(t => (
              <div key={t} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, color: '#0a0a0a' }}>{t}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: '#00C853' }}>{weights[t] || 0}%</span>
              </div>
            ))}
          </div>

          {/* Save */}
          <input
            type="text" placeholder="Portfolio name…"
            value={saveName} onChange={e => setSaveName(e.target.value)}
            style={{ padding: '12px 16px', borderRadius: 12, border: '1.5px solid #e8e8e8', fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: 'none', marginBottom: 10 }}
          />
          <button
            className="cta"
            onClick={handleSave}
            disabled={saving || !saveName.trim()}
            style={{ opacity: (!saveName.trim() || saving) ? 0.4 : 1 }}
          >
            {saving ? 'Saving…' : 'Save Portfolio'}
          </button>
        </>
      )}
    </div>
  )
}
