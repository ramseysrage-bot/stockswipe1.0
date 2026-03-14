const CONTENT = {
  about: {
    title: 'About StockSwype',
    body: `StockSwype is a stock discovery app that helps you find stocks that match your interests and investment style. Swipe right to save stocks to your watchlist, swipe left to pass. Build a personalized feed based on your preferences and risk tolerance.\n\nVersion 1.0.0 · Built with ❤️`,
  },
  privacy: {
    title: 'Privacy Policy',
    body: `We collect only the data necessary to provide your personalized experience: your email address (via Google Sign-In), your investment preferences from the onboarding quiz, and the stocks you save or pass on.\n\nYour data is stored securely on Supabase and is never sold to third parties. Stock price data is fetched in real time from Yahoo Finance and Finnhub. We do not store historical price data on our servers.\n\nYou can delete your account and all associated data at any time from the Profile tab.`,
  },
  terms: {
    title: 'Terms of Service',
    body: `StockSwype is for educational and informational purposes only. Nothing on this app constitutes financial advice, investment advice, or a recommendation to buy or sell any security.\n\nInvesting involves risk. Past performance is not indicative of future results. Always do your own research and consult a qualified financial advisor before making investment decisions.\n\nBy using StockSwype you agree to these terms. We reserve the right to update these terms at any time.`,
  },
}

export default function InfoOverlay({ isOpen, type, onClose }) {
  if (!isOpen) return null
  const { title, body } = CONTENT[type] || CONTENT.about

  return (
    <>
      <div
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 900, opacity: isOpen ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderRadius: '20px 20px 0 0',
        zIndex: 901, padding: '12px 24px 48px',
        transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.35s cubic-bezier(0.34,1.1,0.64,1)',
        maxHeight: '80vh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, background: '#e0e0e0', borderRadius: 100, margin: '0 auto 20px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 700, color: '#0a0a0a' }}>{title}</h2>
          <button
            onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: '50%', background: '#f2f2f2', border: 'none', cursor: 'pointer', fontSize: 18, color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >×</button>
        </div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#555', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {body}
        </p>
      </div>
    </>
  )
}
