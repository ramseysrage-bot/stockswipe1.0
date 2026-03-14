import { useState } from 'react'
import CompanyLogo from '../shared/CompanyLogo'

// The stock pool — same as original app
const POOL = [
  { ticker: 'AAPL',  name: 'Apple'         }, { ticker: 'MSFT',  name: 'Microsoft'     },
  { ticker: 'GOOGL', name: 'Alphabet'       }, { ticker: 'AMZN',  name: 'Amazon'        },
  { ticker: 'NVDA',  name: 'NVIDIA'         }, { ticker: 'META',  name: 'Meta'          },
  { ticker: 'TSLA',  name: 'Tesla'          }, { ticker: 'NFLX',  name: 'Netflix'       },
  { ticker: 'JPM',   name: 'JPMorgan'       }, { ticker: 'V',     name: 'Visa'          },
  { ticker: 'UNH',   name: 'UnitedHealth'   }, { ticker: 'WMT',   name: 'Walmart'       },
  { ticker: 'XOM',   name: 'ExxonMobil'     }, { ticker: 'JNJ',   name: 'J&J'           },
  { ticker: 'PG',    name: 'Procter & Gamble'}, { ticker: 'MA',   name: 'Mastercard'    },
  { ticker: 'HD',    name: 'Home Depot'     }, { ticker: 'CVX',   name: 'Chevron'       },
  { ticker: 'ABBV',  name: 'AbbVie'         }, { ticker: 'KO',    name: 'Coca-Cola'     },
  { ticker: 'AVGO',  name: 'Broadcom'       }, { ticker: 'PEP',   name: 'PepsiCo'       },
  { ticker: 'COST',  name: 'Costco'         }, { ticker: 'TMO',   name: 'Thermo Fisher' },
  { ticker: 'MRK',   name: 'Merck'          }, { ticker: 'ADBE',  name: 'Adobe'         },
  { ticker: 'CRM',   name: 'Salesforce'     }, { ticker: 'AMD',   name: 'AMD'           },
  { ticker: 'INTC',  name: 'Intel'          }, { ticker: 'QCOM',  name: 'Qualcomm'      },
]

export default function StockPicker({ selected, onToggle, onNext }) {
  const [query, setQuery] = useState('')

  const results = query.trim()
    ? POOL.filter(s =>
        s.ticker.toLowerCase().includes(query.toLowerCase()) ||
        s.name.toLowerCase().includes(query.toLowerCase())
      )
    : POOL

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <input
        type="text"
        placeholder="Search stocks…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{
          margin: '0 0 16px', padding: '12px 16px',
          background: '#f4f4f5', border: '1px solid #f0f0f0',
          borderRadius: 12, fontFamily: "'DM Sans', sans-serif",
          fontSize: 14, color: '#0a0a0a', outline: 'none',
        }}
      />

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {results.map(s => {
          const isSelected = selected.has(s.ticker)
          return (
            <div key={s.ticker} className={`pf-stock-row${isSelected ? ' selected' : ''}`} onClick={() => onToggle(s.ticker)}>
              <div className={`pf-check${isSelected ? '' : ''}`}>{isSelected ? '✓' : ''}</div>
              <div className="pf-logo-wrap">
                <CompanyLogo ticker={s.ticker} size={38} className="" style={{ borderRadius: 10 }} />
              </div>
              <div className="pf-ticker-name">
                <div className="pf-ticker">{s.ticker}</div>
                <div className="pf-name">{s.name}</div>
              </div>
            </div>
          )
        })}
      </div>

      <button
        className="cta"
        style={{ marginTop: 16, opacity: selected.size < 2 ? 0.4 : 1, pointerEvents: selected.size < 2 ? 'none' : 'auto' }}
        onClick={onNext}
        disabled={selected.size < 2}
      >
        Build Portfolio ({selected.size} selected) →
      </button>
    </div>
  )
}
