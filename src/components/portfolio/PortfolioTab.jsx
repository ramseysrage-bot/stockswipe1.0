import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useApp } from '../../store/AppContext'
import StockPicker from './StockPicker'
import SliderAllocator from './SliderAllocator'
import PortfolioResults from './PortfolioResults'

const STEPS = { HUB: 'hub', PICKER: 'picker', SLIDERS: 'sliders', RESULTS: 'results', SAVED: 'saved' }

export default function PortfolioTab() {
  const { currentUser, activeTab } = useApp()
  const [step, setStep]             = useState(STEPS.HUB)
  const [selected, setSelected]     = useState(new Set())
  const [weights, setWeights]       = useState({})
  const [savedPortfolios, setSaved] = useState([])

  useEffect(() => {
    if (activeTab === 'portfolio' && step === STEPS.SAVED) loadSaved()
  }, [activeTab, step])

  async function loadSaved() {
    if (!currentUser) return
    const { data } = await supabase.from('portfolios').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false })
    setSaved(data || [])
  }

  function toggleStock(ticker) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(ticker) ? next.delete(ticker) : next.add(ticker)
      return next
    })
  }

  function goToSliders() {
    const tickers = [...selected]
    const equal = Math.floor(100 / tickers.length)
    const w = {}
    tickers.forEach((t, i) => { w[t] = i === tickers.length - 1 ? 100 - equal * (tickers.length - 1) : equal })
    setWeights(w)
    setStep(STEPS.SLIDERS)
  }

  return (
    <div className="portfolio-screen active">
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 40px' }}>

        {step === STEPS.HUB && (
          <>
            <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 24, fontWeight: 600, color: '#0a0a0a', letterSpacing: -0.5, marginBottom: 8 }}>Portfolio Builder</h2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#888', marginBottom: 28, lineHeight: 1.5 }}>
              Build and analyze a custom stock portfolio with backtested performance metrics.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="pf-hub-btn" onClick={() => setStep(STEPS.PICKER)}>
                <div className="pf-hub-btn-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </div>
                <div className="pf-hub-btn-text">
                  <div className="pf-hub-btn-title">Build a Portfolio</div>
                  <div className="pf-hub-btn-sub">Pick stocks and set allocations</div>
                </div>
              </div>
              <div className="pf-hub-btn" onClick={() => { loadSaved(); setStep(STEPS.SAVED) }}>
                <div className="pf-hub-btn-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
                  </svg>
                </div>
                <div className="pf-hub-btn-text">
                  <div className="pf-hub-btn-title">Saved Portfolios</div>
                  <div className="pf-hub-btn-sub">View your saved portfolios</div>
                </div>
              </div>
            </div>
          </>
        )}

        {step === STEPS.PICKER && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <button onClick={() => setStep(STEPS.HUB)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20 }}>←</button>
              <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 600, color: '#0a0a0a', margin: 0 }}>Pick Stocks</h2>
            </div>
            <StockPicker selected={selected} onToggle={toggleStock} onNext={goToSliders} />
          </>
        )}

        {step === STEPS.SLIDERS && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <button onClick={() => setStep(STEPS.PICKER)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20 }}>←</button>
              <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 600, color: '#0a0a0a', margin: 0 }}>Set Weights</h2>
            </div>
            <SliderAllocator
              stocks={[...selected]}
              weights={weights}
              onChange={(ticker, val) => setWeights(w => ({ ...w, [ticker]: val }))}
              onEqualWeight={() => {
                const tickers = [...selected]
                const equal = Math.floor(100 / tickers.length)
                const w = {}
                tickers.forEach((t, i) => { w[t] = i === tickers.length - 1 ? 100 - equal * (tickers.length - 1) : equal })
                setWeights(w)
              }}
              onAnalyze={() => setStep(STEPS.RESULTS)}
            />
          </>
        )}

        {step === STEPS.RESULTS && (
          <>
            <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 600, color: '#0a0a0a', marginBottom: 16 }}>Analysis</h2>
            <PortfolioResults
              tickers={[...selected]}
              weights={weights}
              onSave={() => setStep(STEPS.HUB)}
              onBack={() => setStep(STEPS.SLIDERS)}
            />
          </>
        )}

        {step === STEPS.SAVED && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <button onClick={() => setStep(STEPS.HUB)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20 }}>←</button>
              <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 600, color: '#0a0a0a', margin: 0 }}>Saved Portfolios</h2>
            </div>
            {savedPortfolios.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: 60, color: '#aaa', fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
                No saved portfolios yet
              </div>
            ) : savedPortfolios.map(pf => (
              <div key={pf.id} style={{ background: '#f8f8f8', borderRadius: 16, padding: '16px 20px', marginBottom: 12 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 16, color: '#0a0a0a', marginBottom: 4 }}>{pf.name}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#888' }}>
                  {(pf.tickers || []).join(' · ')}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
