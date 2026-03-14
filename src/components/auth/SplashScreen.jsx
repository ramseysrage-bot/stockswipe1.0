import { useEffect, useRef, useState } from 'react';

// ── Stock data from the original HTML ────────────────────────────────────────
const COL_1 = [
  { badge: 'NV', bg: '#222',    ticker: 'NVDA', name: 'NVIDIA',    pct: '+1.54%', green: true,  price: '$875'  },
  { badge: 'JP', bg: '#003087', ticker: 'JPM',  name: 'JPMorgan',  pct: '-1.37%', green: false, price: '$198'  },
  { badge: 'SP', bg: '#1DB954', ticker: 'SPOT', name: 'Spotify',   pct: '+2.38%', green: true,  price: '$312'  },
  { badge: 'CO', bg: '#0052FF', ticker: 'COIN', name: 'Coinbase',  pct: '+4.07%', green: true,  price: '$224'  },
  { badge: 'AM', bg: '#ED1C24', ticker: 'AMD',  name: 'AMD',       pct: '+2.16%', green: true,  price: '$162'  },
  { badge: 'NU', bg: '#820AD1', ticker: 'NU',   name: 'Nubank',    pct: '+3.44%', green: true,  price: '$10.8' },
  { badge: 'AB', bg: '#FF5A5F', ticker: 'ABNB', name: 'Airbnb',    pct: '+2.37%', green: true,  price: '$148'  },
  { badge: 'MR', bg: '#001F5B', ticker: 'MRNA', name: 'Moderna',   pct: '-3.13%', green: false, price: '$88.3' },
];

const COL_2 = [
  { badge: 'AA', bg: '#555',    ticker: 'AAPL', name: 'Apple',      pct: '+0.82%', green: true,  price: '$187'  },
  { badge: 'ME', bg: '#0082FB', ticker: 'META', name: 'Meta',       pct: '+1.59%', green: true,  price: '$524'  },
  { badge: 'EN', bg: '#F6B217', ticker: 'ENPH', name: 'Enphase',    pct: '-2.75%', green: false, price: '$118'  },
  { badge: 'RD', bg: '#FF4500', ticker: 'RDDT', name: 'Reddit',     pct: '+4.94%', green: true,  price: '$68.4' },
  { badge: 'AS', bg: '#009FE3', ticker: 'ASML', name: 'ASML',       pct: '+1.46%', green: true,  price: '$842'  },
  { badge: 'LM', bg: '#1C3A6B', ticker: 'LMT',  name: 'Lockheed',   pct: '+0.65%', green: true,  price: '$468'  },
  { badge: 'RI', bg: '#30C5A0', ticker: 'RIVN', name: 'Rivian',     pct: '+3.59%', green: true,  price: '$11.2' },
  { badge: 'MC', bg: '#FFC72C', ticker: 'MCD',  name: "McDonald's", pct: '+0.82%', green: true,  price: '$298'  },
];

const COL_3 = [
  { badge: 'TS', bg: '#C00',    ticker: 'TSLA', name: 'Tesla',     pct: '+2.76%', green: true,  price: '$248'  },
  { badge: 'MS', bg: '#0078D4', ticker: 'MSFT', name: 'Microsoft', pct: '+0.84%', green: true,  price: '$415'  },
  { badge: 'LL', bg: '#C00',    ticker: 'LLY',  name: 'Eli Lilly', pct: '+1.60%', green: true,  price: '$782'  },
  { badge: 'SH', bg: '#96BF48', ticker: 'SHOP', name: 'Shopify',   pct: '+2.11%', green: true,  price: '$78.4' },
  { badge: 'GO', bg: '#4285F4', ticker: 'GOOG', name: 'Alphabet',  pct: '+1.49%', green: true,  price: '$172'  },
  { badge: 'PL', bg: '#111',    ticker: 'PLTR', name: 'Palantir',  pct: '+3.20%', green: true,  price: '$25.1' },
  { badge: 'AM', bg: '#F90',    ticker: 'AMZN', name: 'Amazon',    pct: '+1.89%', green: true,  price: '$184'  },
  { badge: 'IN', bg: '#0071C5', ticker: 'INTC', name: 'Intel',     pct: '-2.75%', green: false, price: '$19.8' },
];

// Duplicate each column's cards to create a seamless loop
function makeStrip(cards) {
  return [...cards, ...cards];
}

function StockCard({ badge, bg, ticker, name, pct, green, price }) {
  return (
    <div className="mc">
      <div className="mc-row">
        <div className="mc-badge" style={{ background: bg }}>{badge}</div>
        <span className={`mc-pct ${green ? 'green' : 'red'}`}>{pct}</span>
      </div>
      <div className="mc-ticker">{ticker}</div>
      <div className="mc-name">{name}</div>
      <div className={`mc-bar ${green ? 'greenline' : 'redline'}`}></div>
      <div className="mc-price">{price}</div>
    </div>
  );
}

// Each column animates at a slightly different speed and direction
const COLUMN_CONFIG = [
  { direction: 'up',   duration: 28 },
  { direction: 'down', duration: 34 },
  { direction: 'up',   duration: 24 },
];

const COLUMNS_DATA = [COL_1, COL_2, COL_3];

export default function SplashScreen({ onGetStarted }) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const stripRefs = [useRef(null), useRef(null), useRef(null)];
  const animFrames = useRef([]);

  // ── CSS animation keyframes injected once ────────────────────────────────
  useEffect(() => {
    const styleId = 'splash-strip-keyframes';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes scrollUp {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @keyframes scrollDown {
          0%   { transform: translateY(-50%); }
          100% { transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }
    return () => {};
  }, []);

  return (
    <div id="splash-screen" style={{ opacity: 1, pointerEvents: 'auto' }}>
      {/* Scrolling background wall */}
      <div className="wall">
        {COLUMNS_DATA.map((cards, colIdx) => {
          const { direction, duration } = COLUMN_CONFIG[colIdx];
          const strip = makeStrip(cards);
          return (
            <div className="col" key={colIdx}>
              <div
                className="strip"
                style={{
                  animation: `${direction === 'up' ? 'scrollUp' : 'scrollDown'} ${duration}s linear infinite`,
                }}
              >
                {strip.map((card, i) => (
                  <StockCard key={`${colIdx}-${i}`} {...card} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Gradient fades */}
      <div className="fade-top"></div>
      <div className="fade-bot"></div>

      {/* Central CTA */}
      <div className="content">
        <span className="logo">StockSwype</span>

        <div className="headline">
          Stocks worth<br /><strong>discovering.</strong>
        </div>
        <div className="sub">
          Swipe through stocks matched to your interests. No noise — just what's worth knowing.
        </div>

        <button
          className="cta"
          onClick={onGetStarted}
        >
          Get started
          <div className="cta-dot">→</div>
        </button>
      </div>
    </div>
  );
}
