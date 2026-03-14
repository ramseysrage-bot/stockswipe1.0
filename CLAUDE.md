# StockSwype — React + Vite Architecture

Migrated from a single 11,605-line `index.html` to a structured React 18 + Vite 5 app.

## Stack

- **React 18** + **Vite 5**
- **Supabase** — auth (Google OAuth), PostgreSQL, storage (avatars)
- **Chart.js 4** — price charts, portfolio backtesting
- **Yahoo Finance API** — price data (with CORS fallback via `api.allorigins.win`)
- **Finnhub API** — logos, metrics, recommendations, company/market news

## Environment Variables

All secrets live in `.env` (never commit this):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_KEY=
VITE_FINNHUB_KEY=
VITE_POLYGON_KEY=
VITE_FMP_KEY=
```

## Project Structure

```
src/
├── main.jsx                    # Entry: wraps App in AppProvider, imports CSS
├── App.jsx                     # Screen router (splash → auth → quiz → app)
│
├── store/
│   └── AppContext.jsx           # Global state via React Context
│
├── lib/
│   ├── supabase.js             # Supabase client
│   ├── yahoo.js                # fetchWithFallback (CORS proxy)
│   ├── finnhub.js              # Logo, metrics, recs, news fetches
│   └── stocks.js               # Scoring/ranking algorithm
│
├── hooks/
│   ├── useFeed.js              # Feed deck management + Supabase seen/saved
│   ├── useSwipe.js             # Touch/pointer gesture hook for card swiping
│   └── useWatchlist.js         # Live price loading, remove, clear
│
├── styles/
│   ├── globals.css             # Reset, body, iPhone frame, tab nav layout
│   ├── animations.css          # All @keyframes
│   └── components.css          # Component-level styles
│
└── components/
    ├── auth/
    │   ├── SplashScreen.jsx        # Scrolling card background + CTA
    │   ├── AuthScreen.jsx          # Google OAuth button
    │   ├── LogoSplitTransition.jsx # Green panels slide out reveal
    │   ├── UsernameScreen.jsx      # Username pick + uniqueness check
    │   └── Quiz/
    │       ├── QuizStep.jsx        # Single multi/single-select step
    │       └── QuizContainer.jsx   # 5-step onboarding quiz
    │   └── LoadingScreen.jsx       # Progress bar + pill pop-in animation
    │
    ├── feed/
    │   ├── FeedTab.jsx             # Nav bar, CardStack, IndexPillRow
    │   ├── CardStack.jsx           # Top-3 visible cards + share modal
    │   ├── IndexPillRow.jsx        # S&P/Dow/NASDAQ/VIX pills (60s refresh)
    │   └── SwipeCard/
    │       ├── SwipeCard.jsx       # Draggable card with depth stack styles
    │       ├── CardStamps.jsx      # BULL/BEAR opacity stamps
    │       ├── CompanyHeader.jsx   # Logo, ticker, name, price
    │       └── CardSparkline.jsx   # SVG bezier from Yahoo 1D data
    │   └── ExpandedCard/
    │       ├── ExpandedCard.jsx    # Chart.js + metrics + recs + news
    │       └── RangeSelector.jsx   # 1D/1W/1M/3M/1Y pill buttons
    │
    ├── watchlist/
    │   ├── WatchlistTab.jsx        # Header, summary, sector filter, list
    │   ├── WatchlistSummary.jsx    # Up/down count pills
    │   ├── StockRow.jsx            # Swipe-to-delete row
    │   └── WatchlistDetailModal.jsx # Slide-up chart modal
    │
    ├── news/
    │   ├── NewsTab.jsx             # Finnhub news, ticker filter, refresh
    │   └── NewsCard.jsx            # Thumbnail, headline, share button
    │
    ├── portfolio/
    │   ├── PortfolioTab.jsx        # Step machine: HUB→PICKER→SLIDERS→RESULTS→SAVED
    │   ├── StockPicker.jsx         # Pool of 30, search, checkbox select
    │   ├── SliderAllocator.jsx     # Range sliders, Equal Weight button
    │   ├── PortfolioResults.jsx    # 1Y backtest stats + Chart.js + save
    │   └── SharedPortfolioView.jsx # Read-only received portfolio
    │
    ├── friends/
    │   ├── FriendsTab.jsx          # Search, add, requests, list, inbox
    │   ├── FriendRow.jsx           # Avatar + username + Stocks/Remove
    │   ├── Inbox.jsx               # Message list with clear all
    │   └── FriendHistoryModal.jsx  # Friend's saved stocks list
    │
    ├── profile/
    │   ├── ProfileTab.jsx          # Avatar, stats, interests, settings
    │   └── AvatarUpload.jsx        # Supabase storage upload
    │
    └── shared/
        ├── TabNav.jsx              # 6-tab bottom nav, hidden when expanded
        ├── Toast.jsx               # Ephemeral notification banner
        ├── CompanyLogo.jsx         # Finnhub logo with initials fallback
        ├── InfoOverlay.jsx         # Bottom sheet: About/Privacy/Terms
        ├── ShareModal.jsx          # Send stock/portfolio to friends
        └── AlphaScreen.jsx         # Alpha teaser screen with animations
```

## State Management

Single React Context (`AppContext`) — no Redux needed.

| State | Type | Purpose |
|-------|------|---------|
| `currentUser` | object | Supabase auth user |
| `userProfile` | object | DB row: username, categories, experience, horizon, risk |
| `isGuest` | bool | Guest mode (no auth) |
| `activeTab` | string | home / watchlist / news / portfolio / friends / profile |
| `deck` | array | Current swipe queue |
| `savedStocks` | array | User's watchlist |
| `seenTickers` | useRef Set | Prevents re-showing cards |
| `topCard` | object | Card at top of deck |
| `isExpanded` | bool | Whether expanded card view is open |
| `toastMsg` | string | Current toast text (auto-clears 2500ms) |
| `logoCache` | useRef Map | Finnhub logo URL cache |
| `expChartCache` | useRef Map | Expanded card chart data cache |

## Screen Flow

```
SPLASH → AUTH → USERNAME (if new) → QUIZ (if no categories) → LOADING → LOGO_SPLIT → APP
                       ↓ (returning user with complete profile)
                   LOGO_SPLIT → APP
```

## Supabase Tables

| Table | Key columns |
|-------|-------------|
| `user_profiles` | user_id, username, avatar_url, categories, experience, horizon, risk, known_stocks |
| `saved_stocks` | user_id, ticker, company, price, change_pct, saved_at |
| `seen_stocks` | user_id, ticker |
| `friendships` | requester_id, addressee_id, status (pending/accepted) |
| `messages` | sender_id, receiver_id, type (stock/portfolio), payload, read |
| `portfolios` | user_id, name, tickers[], weights{} |

## Key Design Decisions

- **useRef for caches** — `logoCache`, `expChartCache`, `seenTickers` use refs instead of state to avoid re-renders on cache updates
- **No swiping library** — custom `useSwipe` hook with pointer events for full control over the gesture feel
- **CSS-only animations** — all transitions use CSS keyframes; React only adds/removes classes
- **Mobile-first**: `max-width: 430px`, `100dvh`, `env(safe-area-inset-*)` for iPhone notch support
- **CORS fallback**: Yahoo Finance calls go through `api.allorigins.win` when direct fetch fails
