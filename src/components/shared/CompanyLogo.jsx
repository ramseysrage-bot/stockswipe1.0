import { useState, useEffect } from 'react'
import { useApp } from '../../store/AppContext'
import { fetchLogo } from '../../lib/finnhub'

export default function CompanyLogo({ ticker, size = 44, className = 'logo-avatar', style = {} }) {
  const { logoCache } = useApp()
  const [url, setUrl] = useState(logoCache.current[ticker])
  const [failed, setFailed] = useState(logoCache.current[ticker] === '')

  useEffect(() => {
    if (logoCache.current[ticker] !== undefined) {
      setUrl(logoCache.current[ticker])
      setFailed(logoCache.current[ticker] === '')
      return
    }
    let cancelled = false
    fetchLogo(ticker).then(logoUrl => {
      if (cancelled) return
      logoCache.current[ticker] = logoUrl
      setUrl(logoUrl)
      setFailed(!logoUrl)
    })
    return () => { cancelled = true }
  }, [ticker, logoCache])

  if (url && !failed) {
    return (
      <img
        src={url}
        alt={ticker}
        className={className}
        style={{ width: size, height: size, ...style }}
        onError={() => { logoCache.current[ticker] = ''; setFailed(true) }}
      />
    )
  }

  // Fallback pill
  const colors = ['#1a1a2e','#16213e','#0f3460','#533483','#2b2d42','#006d77']
  const bg = colors[ticker.charCodeAt(0) % colors.length]
  return (
    <div
      className={className}
      style={{
        width: size, height: size,
        background: bg, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'DM Mono', monospace",
        fontSize: Math.floor(size * 0.28),
        fontWeight: 600,
        borderRadius: size * 0.27,
        flexShrink: 0,
        ...style,
      }}
    >
      {ticker.slice(0, 2).toUpperCase()}
    </div>
  )
}
