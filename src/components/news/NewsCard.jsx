import { useState } from 'react'

function timeAgo(unixTs) {
  const diff = Math.floor(Date.now() / 1000) - unixTs
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function NewsCard({ article, ticker, onShare }) {
  const [imgErr, setImgErr] = useState(false)

  return (
    <div className="news-card" onClick={() => window.open(article.url, '_blank')}>
      {article.image && !imgErr && (
        <img
          src={article.image}
          alt=""
          className="nc-thumbnail"
          onError={() => setImgErr(true)}
        />
      )}
      <div className="nc-top">
        <span className="nc-source">{article.source}</span>
        {ticker && <span className="nc-tag">{ticker}</span>}
      </div>
      <div className="nc-title">{article.headline}</div>
      <div className="nc-bot">
        <span className="nc-time">{timeAgo(article.datetime)}</span>
        <button
          className="nc-share-btn"
          onClick={e => { e.stopPropagation(); onShare?.() }}
          aria-label="Share article"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
