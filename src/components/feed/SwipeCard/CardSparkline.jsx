import { useEffect, useRef, useState } from 'react'
import { fetchWithFallback } from '../../../lib/yahoo'

function getBezierPath(data, w, h) {
  if (!data || data.length < 2) return ''
  const xs = data.map((_, i) => (i / (data.length - 1)) * w)
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const ys = data.map(v => h - ((v - min) / range) * h * 0.8 - h * 0.1)

  let d = `M ${xs[0]} ${ys[0]}`
  for (let i = 1; i < xs.length; i++) {
    const cpx = (xs[i - 1] + xs[i]) / 2
    d += ` C ${cpx} ${ys[i - 1]}, ${cpx} ${ys[i]}, ${xs[i]} ${ys[i]}`
  }
  return d
}

export default function CardSparkline({ ticker, color = '#00C853' }) {
  const [path, setPath] = useState('')
  const [loading, setLoading] = useState(true)
  const containerRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=5m&range=1d`
        const data = await fetchWithFallback(url)
        const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter(Boolean)
        if (cancelled || !closes?.length) return
        const w = containerRef.current?.offsetWidth || 300
        const h = 100
        setPath(getBezierPath(closes, w, h))
      } catch {
        // leave empty
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [ticker])

  return (
    <div ref={containerRef} className="c-chart">
      {loading ? (
        <span style={{ color: '#ddd', fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>Loading…</span>
      ) : path ? (
        <svg viewBox="0 0 300 100" preserveAspectRatio="none" width="100%" height="100%">
          <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <span style={{ color: '#ddd', fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>No data</span>
      )}
    </div>
  )
}
