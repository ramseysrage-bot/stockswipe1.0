        function navTo(tab) {
            // Update active state on nav icons
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            document.getElementById('nav-btn-' + tab).classList.add('active');

            // Hide all tab screens
            document.getElementById('feed').classList.remove('active');
            document.getElementById('news-scene').classList.remove('active');
            document.getElementById('watchlist').classList.remove('active');
            document.getElementById('friends-scene').classList.remove('active');
            document.getElementById('profile-scene').classList.remove('active');
            document.getElementById('portfolio-scene').classList.remove('active');

            if (tab === 'home') { document.getElementById('feed').classList.add('active'); }
            if (tab === 'news') {
                document.getElementById('news-scene').classList.add('active');
                loadWatchlistNews();
            }
            if (tab === 'saved') {
                document.getElementById('watchlist').classList.add('active');
                renderWatchlist();
                // If prices haven't loaded yet (e.g. user navigates here immediately after refresh), kick off the fetch
                if (savedStocks.some(s => !s.priceLoaded)) fetchSavedStockPrices();
            }
            if (tab === 'portfolio') {
                document.getElementById('portfolio-scene').classList.add('active');
                openPfHub();
            }
            if (tab === 'friends') {
                document.getElementById('friends-scene').classList.add('active');
                renderFriends();
                loadInbox();
                updateFriendsBadge();
            }
            if (tab === 'profile') {
                document.getElementById('profile-scene').classList.add('active');
                renderProfile();
            }
        }

        // --- Portfolio Builder ---
        function openChart(ticker, price, path, color) {
            const modal = document.getElementById('chart-modal');
            document.getElementById('cz-ticker').innerText = ticker;
            document.getElementById('cz-price').innerText = price;

            const cont = document.getElementById('cz-container');
            cont.innerHTML = `
                <svg viewBox="0 0 320 120" preserveAspectRatio="none">
                    <path d="${path}" fill="${color}15" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
                </svg>
            `;
            modal.classList.add('active');
        }

        function closeChart() {
            document.getElementById('chart-modal').classList.remove('active');
        }

        // --- News Logic ---
        let _newsArticles = [];
        let _newsMarket = [];
        let _newsFilter = 'all';
        let _newsSubFilter = null;
        let _newsPage = 1;

        async function loadWatchlistNews() {
            const feed = document.getElementById('news-feed');
            const pillBar = document.getElementById('news-ticker-filters');

            pillBar.innerHTML = '';
            feed.innerHTML = `
                <div class="news-spinner">
                    <div class="spinner"></div>
                    <div style="font-family:'DM Sans';color:#888;font-size:14px;margin-top:12px;">Loading news for your watchlist...</div>
                </div>
            `;

            if (savedStocks.length === 0) {
                feed.innerHTML = `
                    <div style="display:flex;flex-direction:column;align-items:center;padding-top:60px;gap:16px;">
                        <div style="font-size:40px;">📰</div>
                        <div style="font-family:'DM Sans';font-size:16px;color:#555;text-align:center;padding:0 24px;">Save stocks to see their news</div>
                        <button onclick="navTo('home')" style="background:#00C853;color:#fff;border:none;border-radius:100px;padding:12px 28px;font-family:'DM Sans';font-size:15px;font-weight:600;cursor:pointer;">Go to Home</button>
                    </div>
                `;
                return;
            }

            const today = new Date();
            const from = new Date(today);
            from.setDate(from.getDate() - 7);
            const toDate = today.toISOString().slice(0, 10);
            const fromDate = from.toISOString().slice(0, 10);
            const delay = ms => new Promise(r => setTimeout(r, ms));

            let allArticles = [];
            for (const stock of savedStocks) {
                try {
                    const res = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${stock.ticker}&from=${fromDate}&to=${toDate}&token=${FINNHUB_KEY}`);
                    const articles = await res.json();
                    if (Array.isArray(articles)) {
                        const capped = articles.slice(0, 5);
                        capped.forEach(a => { a._ticker = stock.ticker; });
                        allArticles = allArticles.concat(capped);
                    }
                } catch (_) { }
                await delay(250);
            }

            // Deduplicate by headline
            const seen = new Set();
            allArticles = allArticles.filter(a => {
                if (!a.headline || seen.has(a.headline)) return false;
                seen.add(a.headline);
                return true;
            });

            // Sort newest first
            allArticles.sort((a, b) => b.datetime - a.datetime);

            // Fetch general market news
            let marketNews = [];
            try {
                const res = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_KEY}`);
                const data = await res.json();
                if (Array.isArray(data)) marketNews = data.slice(0, 5);
            } catch (_) { }

            // Build a ticker→sector map from savedStocks for grouping
            const _tickerSectorMap = {};
            savedStocks.forEach(s => { if (s.ticker) _tickerSectorMap[s.ticker] = s.sector || 'Other'; });
            allArticles.forEach(a => { a._sector = _tickerSectorMap[a._ticker] || 'Other'; });

            _newsArticles = allArticles;
            _newsMarket = marketNews;
            _newsFilter = 'all';
            _newsPage = 1;

            // Exactly 4 fixed top pills
            pillBar.innerHTML = '';
            _newsSubFilter = null;
            const subBar = document.getElementById('news-sub-filters');
            if (subBar) { subBar.style.display = 'none'; subBar.innerHTML = ''; }
            [
                { label: 'All', key: 'all' },
                { label: 'Market', key: 'market' },
                { label: 'Industry', key: 'industry' },
                { label: 'Stocks', key: 'stocks' },
            ].forEach(({ label, key }) => {
                const pill = document.createElement('button');
                pill.className = 'ntf-pill' + (key === 'all' ? ' active' : '');
                pill.textContent = label;
                pill.dataset.key = key;
                pill.onclick = () => setNewsTickerFilter(key);
                pillBar.appendChild(pill);
            });

            renderNewsArticles();
        }

        function setNewsTickerFilter(key) {
            _newsFilter = key;
            _newsSubFilter = null;
            _newsPage = 1;

            // Highlight correct top pill
            document.querySelectorAll('#news-ticker-filters .ntf-pill').forEach(p => {
                p.classList.toggle('active', p.dataset.key === key);
            });

            // Build or hide sub-pill row
            const subBar = document.getElementById('news-sub-filters');
            subBar.innerHTML = '';

            if (key === 'industry') {
                const sectors = [...new Set(_newsArticles.map(a => a._sector || 'Other'))].sort();
                if (sectors.length) {
                    subBar.style.display = 'flex';
                    sectors.forEach(sec => {
                        const sp = document.createElement('button');
                        sp.className = 'ntf-pill';
                        sp.style.cssText = 'flex-shrink:0;font-size:11px;padding:4px 12px;';
                        sp.textContent = sec;
                        sp.dataset.sub = sec;
                        sp.onclick = () => setNewsSubFilter(sec);
                        subBar.appendChild(sp);
                    });
                } else {
                    subBar.style.display = 'none';
                }
            } else if (key === 'stocks') {
                const tickers = [...new Set(_newsArticles.map(a => a._ticker))].sort();
                if (tickers.length) {
                    subBar.style.display = 'flex';
                    tickers.forEach(t => {
                        const sp = document.createElement('button');
                        sp.className = 'ntf-pill';
                        sp.style.cssText = 'flex-shrink:0;font-size:11px;padding:4px 12px;';
                        sp.textContent = t;
                        sp.dataset.sub = t;
                        sp.onclick = () => setNewsSubFilter(t);
                        subBar.appendChild(sp);
                    });
                } else {
                    subBar.style.display = 'none';
                }
            } else {
                subBar.style.display = 'none';
            }

            renderNewsArticles();
        }

        function setNewsSubFilter(val) {
            _newsSubFilter = val;
            _newsPage = 1;
            document.querySelectorAll('#news-sub-filters .ntf-pill').forEach(p => {
                p.classList.toggle('active', p.dataset.sub === val);
            });
            renderNewsArticles();
        }

        function renderNewsArticles() {
            const feed = document.getElementById('news-feed');
            feed.innerHTML = '';

            function mkLoadMore() {
                const btn = document.createElement('div');
                btn.style.cssText = 'text-align:center;padding:20px;font-family:"DM Sans",sans-serif;font-size:14px;font-weight:600;color:#00C853;cursor:pointer;';
                btn.textContent = 'Load more';
                btn.onclick = () => { _newsPage++; renderNewsArticles(); };
                return btn;
            }

            // MARKET
            if (_newsFilter === 'market') {
                if (_newsMarket.length === 0) {
                    feed.innerHTML = `<div style="text-align:center;padding-top:40px;font-family:'DM Sans';color:#888;">No market news found.</div>`;
                    return;
                }
                const visible = Math.min(_newsPage * 5, _newsMarket.length);
                _newsMarket.slice(0, visible).forEach(a => feed.appendChild(buildNewsCard(a, null)));
                if (visible < _newsMarket.length) feed.appendChild(mkLoadMore());
                return;
            }

            // INDUSTRY — grouped by sector, sub-filter narrows to one sector
            if (_newsFilter === 'industry') {
                const source = _newsSubFilter
                    ? _newsArticles.filter(a => (a._sector || 'Other') === _newsSubFilter)
                    : _newsArticles;
                if (source.length === 0) {
                    feed.innerHTML = `<div style="text-align:center;padding-top:40px;font-family:'DM Sans';color:#888;">No articles found.</div>`;
                    return;
                }
                if (_newsSubFilter) {
                    // Single sector — flat paginated list
                    const visible = Math.min(_newsPage * 5, source.length);
                    source.slice(0, visible).forEach(a => feed.appendChild(buildNewsCard(a, a._ticker)));
                    if (visible < source.length) feed.appendChild(mkLoadMore());
                } else {
                    // All sectors grouped with headers
                    const bySector = {};
                    source.forEach(a => {
                        const sec = a._sector || 'Other';
                        if (!bySector[sec]) bySector[sec] = [];
                        bySector[sec].push(a);
                    });
                    const visible = Math.min(_newsPage * 5, source.length);
                    let count = 0;
                    for (const [sec, arts] of Object.entries(bySector).sort((a, b) => a[0].localeCompare(b[0]))) {
                        if (count >= visible) break;
                        const hdr = document.createElement('div');
                        hdr.className = 'news-section-header';
                        hdr.textContent = sec;
                        feed.appendChild(hdr);
                        for (const a of arts) {
                            if (count >= visible) break;
                            feed.appendChild(buildNewsCard(a, a._ticker));
                            count++;
                        }
                    }
                    if (visible < source.length) feed.appendChild(mkLoadMore());
                }
                return;
            }

            // STOCKS — sub-filter narrows to one ticker
            if (_newsFilter === 'stocks') {
                const source = _newsSubFilter
                    ? _newsArticles.filter(a => a._ticker === _newsSubFilter)
                    : _newsArticles;
                if (source.length === 0) {
                    feed.innerHTML = `<div style="text-align:center;padding-top:40px;font-family:'DM Sans';color:#888;">No articles found.</div>`;
                    return;
                }
                if (_newsSubFilter) {
                    const visible = Math.min(_newsPage * 5, source.length);
                    source.slice(0, visible).forEach(a => feed.appendChild(buildNewsCard(a, a._ticker)));
                    if (visible < source.length) feed.appendChild(mkLoadMore());
                } else {
                    // All stocks grouped by ticker with headers
                    const byTicker = {};
                    source.forEach(a => {
                        if (!byTicker[a._ticker]) byTicker[a._ticker] = [];
                        byTicker[a._ticker].push(a);
                    });
                    const visible = Math.min(_newsPage * 5, source.length);
                    let count = 0;
                    for (const [t, arts] of Object.entries(byTicker).sort((a, b) => a[0].localeCompare(b[0]))) {
                        if (count >= visible) break;
                        const hdr = document.createElement('div');
                        hdr.className = 'news-section-header';
                        hdr.textContent = t;
                        feed.appendChild(hdr);
                        for (const a of arts) {
                            if (count >= visible) break;
                            feed.appendChild(buildNewsCard(a, a._ticker));
                            count++;
                        }
                    }
                    if (visible < source.length) feed.appendChild(mkLoadMore());
                }
                return;
            }

            // ALL
            const filtered = _newsArticles;
            if (filtered.length === 0 && _newsMarket.length === 0) {
                feed.innerHTML = `<div style="text-align:center;padding-top:40px;font-family:'DM Sans';color:#888;">No recent news found.</div>`;
                return;
            }
            const visible = Math.min(_newsPage * 5, filtered.length);
            filtered.slice(0, visible).forEach(a => feed.appendChild(buildNewsCard(a, a._ticker)));
            if (visible < filtered.length) {
                feed.appendChild(mkLoadMore());
            } else if (_newsMarket.length > 0) {
                const hdr = document.createElement('div');
                hdr.className = 'news-section-header';
                hdr.textContent = 'Market News';
                feed.appendChild(hdr);
                _newsMarket.forEach(a => feed.appendChild(buildNewsCard(a, null)));
            }
        }

        function shareNewsArticle(article, ticker, e) {
            if (e) e.stopPropagation();
            _currentShareTicker = ticker || null;
            _currentShareArticle = article || null;
            openShareModal(e);
            loadShareFriends();
        }

        function buildNewsCard(article, ticker) {
            const timeAgo = getTimeAgoUnix(article.datetime);
            const logo = ticker ? (logoCache[ticker] || '') : '';

            const card = document.createElement('a');
            card.className = 'news-card';
            card.href = article.url || '#';
            card.target = '_blank';
            card.rel = 'noopener noreferrer';
            card.innerHTML = `
                <div class="nc-meta">
                    ${logo ? `<img class="nc-logo-img" src="${logo}" alt="" onerror="this.style.display='none'">` : ''}
                    ${ticker ? `<span class="nc-ticker-pill"></span>` : ''}
                </div>
                <div class="nc-title"></div>
                <div class="nc-bot">
                    <span class="nc-time"></span>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <button class="nc-share-btn nc-share-article-btn" title="Send to a Friend">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        </button>
                        <span class="nc-icon">↗</span>
                    </div>
                </div>
            `;
            if (ticker) card.querySelector('.nc-ticker-pill').textContent = ticker;
            card.querySelector('.nc-title').textContent = article.headline || '';
            card.querySelector('.nc-time').textContent = (article.source || '') + ' · ' + timeAgo;
            const shareBtn = card.querySelector('.nc-share-article-btn');
            if (shareBtn) {
                shareBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    shareNewsArticle(article, ticker, e);
                });
            }
            return card;
        }

        function getTimeAgoUnix(unixTs) {
            const diff = Math.floor(Date.now() / 1000) - unixTs;
            if (diff < 60) return 'just now';
            if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
            if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
            return Math.floor(diff / 86400) + 'd ago';
        }

        // --- Interactive Chart Logic ---
        function getBezierPath(data) {
            if (data.length === 0) return { path: '', pts: [] };
            let path = `M 0 100`; // Will immediately C command to correct Y
            let max = Math.max(...data.map(d => d.y));
            let min = Math.min(...data.map(d => d.y));
            let range = max - min || 1;

            // Normalize to 100x100 coord sys with padding
            const pts = data.map((d, i) => ({
                x: (i / (data.length - 1)) * 100,
                y: 100 - ((d.y - min) / range) * 80 - 10
            }));

            path = `M ${pts[0].x} ${pts[0].y}`;

            // Cardinal spline interpolation
            for (let i = 0; i < pts.length - 1; i++) {
                const p0 = pts[i === 0 ? 0 : i - 1];
                const p1 = pts[i];
                const p2 = pts[i + 1];
                const p3 = pts[i + 2 === pts.length ? i + 1 : i + 2];

                const cp1x = p1.x + (p2.x - p0.x) / 6;
                const cp1y = p1.y + (p2.y - p0.y) / 6;
                const cp2x = p2.x - (p3.x - p1.x) / 6;
                const cp2y = p2.y - (p3.y - p1.y) / 6;

                path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
            }
            return { path, pts };
        }

        function drawChart(ticker, range) {
            // SVG sparkline removed — replaced by Chart.js drawSparkline(). No-op kept for call safety.
            return;
        }


        function switchRange(ticker, range, btn, color) {
            // Guard: btn may be null if called programmatically or card already removed
            if (!btn || !btn.parentNode) return;
            Array.from(btn.parentNode.children).forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            drawChart(ticker, range);
        }

        // ─── EXPANDED INTERACTIVE CHART ENGINE ────────────────────────────────────

        // Per-ticker+range data cache: { 'AAPL:1M': [{t, y}, ...], ... }
        const _expChartCache = {};
        // Per-ticker Chart.js instance registry (one instance per ticker)
        const _expChartInstances = {};

        // Range → Yahoo Finance params (1D for expanded chart)
        const _rangeParams = {
            '1D': { range: '1d', interval: '5m' },
            '1W': { range: '5d', interval: '1h' },
            '1M': { range: '1mo', interval: '1d' },
            '3M': { range: '3mo', interval: '1d' },
            '6M': { range: '6mo', interval: '1d' },
            '1Y': { range: '1y', interval: '1wk' },
            '5Y': { range: '5y', interval: '1mo' },
        };

        // Converts a chart range key to Polygon API parameters
        function _polyRange(rangeKey) {
            const now = new Date();
            const to = now.toISOString().split('T')[0];
            const from = new Date(now);
            const cfg = {
                '1D': [1,   '5',  'minute'],
                '1W': [7,   '1',  'hour'],
                '1M': [31,  '1',  'day'],
                '3M': [92,  '1',  'day'],
                '6M': [184, '1',  'day'],
                '1Y': [366, '1',  'week'],
                '5Y': [1827,'1',  'month'],
            };
            const [days, mult, timespan] = cfg[rangeKey] || cfg['1M'];
            from.setDate(from.getDate() - days);
            return { from: from.toISOString().split('T')[0], to, mult, timespan };
        }

        // Date label formatter depending on the selected range
        function _formatLabel(tsMs, range) {
            const d = new Date(tsMs);
            if (range === '1D') {
                return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            }
            if (range === '1W') {
                // "Mon 14:00"
                return d.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' +
                    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            }
            if (range === '1M' || range === '3M') {
                // "Jan 12"
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
            if (range === '6M' || range === '1Y') {
                // "Jan '25"
                return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            }
            // 5Y → "2023"
            return d.getFullYear().toString();
        }

        /**
         * Load Yahoo Finance data for a ticker+range combo, render Chart.js.
         * Uses cache to avoid re-fetching on tab revisit.
         */
        async function loadExpandedChart(ticker, range) {
            const canvasEl = document.getElementById('exp-canvas-' + ticker);
            const loadEl = document.getElementById('exp-chart-loading-' + ticker);
            if (!canvasEl) return;

            const cacheKey = ticker + ':' + range;

            // Helper: render from (possibly cached) data points
            function renderChart(points) {
                if (!canvasEl) return;

                // Determine positive/negative period
                const isPos = points.length < 2 || points[points.length - 1].y >= points[0].y;
                const lineColor = isPos ? '#00c853' : '#ef5350';
                const gradFill = isPos ? 'rgba(0,200,83,0.15)' : 'rgba(239,83,80,0.15)';

                // Destroy previous Chart.js instance for this ticker to avoid canvas reuse error
                if (_expChartInstances[ticker]) {
                    _expChartInstances[ticker].destroy();
                    delete _expChartInstances[ticker];
                }

                const labels = points.map(p => _formatLabel(p.t, range));
                const values = points.map(p => p.y);

                // Build inline gradient via canvas context
                const ctx = canvasEl.getContext('2d');
                const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                gradient.addColorStop(0, lineColor + '44');   // 26% opacity at top
                gradient.addColorStop(1, lineColor + '00');   // transparent at bottom

                _expChartInstances[ticker] = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels,
                        datasets: [{
                            data: values,
                            borderColor: lineColor,
                            borderWidth: 2,
                            pointRadius: 0,
                            pointHoverRadius: 5,
                            pointHoverBackgroundColor: lineColor,
                            pointHoverBorderColor: '#fff',
                            pointHoverBorderWidth: 2,
                            fill: true,
                            backgroundColor: gradient,
                            tension: 0,
                        }]
                    },
                    options: {
                        responsive: false,
                        animation: { duration: 300 },
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                mode: 'index',
                                intersect: false,
                                backgroundColor: 'rgba(20,20,20,0.85)',
                                titleColor: '#aaa',
                                bodyColor: '#fff',
                                bodyFont: { family: 'DM Mono', weight: '500', size: 13 },
                                titleFont: { family: 'DM Sans', size: 11 },
                                padding: 10,
                                cornerRadius: 8,
                                displayColors: false,
                                callbacks: {
                                    label: ctx => '$' + ctx.parsed.y.toFixed(2)
                                },
                                // Scrub: update header price + interval-relative % in real time
                                external: (context) => {
                                    const { tooltip } = context;
                                    const priceEl = document.getElementById('price-' + ticker);
                                    const changeEl = document.getElementById('change-' + ticker);
                                    if (!tooltip || tooltip.opacity === 0) return;
                                    const idx = tooltip.dataPoints?.[0]?.dataIndex;
                                    if (idx == null) return;
                                    const firstVal = values[0];
                                    const hoverPrice = values[idx];
                                    const pctFromStart = (hoverPrice - firstVal) / firstVal * 100;
                                    const pctStr = (pctFromStart >= 0 ? '+' : '') + pctFromStart.toFixed(2) + '%';
                                    const hoverCls = pctFromStart >= 0 ? 'green' : 'red';
                                    if (priceEl) priceEl.innerText = '$' + hoverPrice.toFixed(2);
                                    if (changeEl) { changeEl.innerText = pctStr; changeEl.className = 'c-change ' + hoverCls; }
                                }
                            }
                        },
                        interaction: { mode: 'index', intersect: false },
                        scales: {
                            x: {
                                grid: { display: false },
                                border: { display: false },
                                ticks: {
                                    color: '#888',
                                    font: { family: 'DM Sans', size: 10 },
                                    maxTicksLimit: 5,
                                    maxRotation: 0,
                                }
                            },
                            y: {
                                position: 'right',
                                grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false },
                                border: { display: false },
                                ticks: {
                                    color: '#888',
                                    font: { family: 'DM Mono', size: 10 },
                                    maxTicksLimit: 4,
                                    callback: v => '$' + v.toFixed(v >= 100 ? 0 : 2)
                                }
                            }
                        }
                    },
                    plugins: [_makeRangePlugin(values), {
                        // Restore header price/change on mouse leave or touch end
                        id: 'expRestoreOnLeave',
                        afterEvent(chart, args) {
                            const e = args.event;
                            if (e.type === 'mouseout' || e.type === 'touchend') {
                                const stockObj = deck.find(s => s.ticker === ticker) || (savedStocks && savedStocks.find(s => s.ticker === ticker));
                                const priceEl = document.getElementById('price-' + ticker);
                                const changeEl = document.getElementById('change-' + ticker);
                                if (priceEl && stockObj?.price && stockObj.price !== '...') priceEl.innerHTML = stockObj.price;
                                if (changeEl) {
                                    const rc = stockObj?._rangeChange || stockObj?.change;
                                    const rk = stockObj?._rangeColor || stockObj?.color || '';
                                    if (rc && rc !== '...') { changeEl.innerText = rc; changeEl.className = 'c-change ' + rk; }
                                }
                            }
                        }
                    }]
                });

                // Update change display to reflect THIS timeframe
                const firstV = values[0];
                const lastV = values[values.length - 1];
                const rPct = ((lastV - firstV) / firstV * 100);
                const rStr = (rPct >= 0 ? '+' : '') + rPct.toFixed(2) + '%';
                const rColor = lastV >= firstV ? 'green' : 'red';
                const changeEl = document.getElementById('change-' + ticker);
                if (changeEl) { changeEl.innerText = rStr; changeEl.className = 'c-change ' + rColor; }
                // Store so restoreOnLeave uses range pct not 1D
                const _so = deck.find(s => s.ticker === ticker) || (savedStocks && savedStocks.find(s => s.ticker === ticker));
                if (_so) { _so._rangeChange = rStr; _so._rangeColor = rColor; }

                if (loadEl) loadEl.style.display = 'none';
                canvasEl.style.display = 'block';
            }

            // Serve from cache if available
            if (_expChartCache[cacheKey]) {
                renderChart(_expChartCache[cacheKey]);
                return;
            }

            // Show loading state
            if (loadEl) { loadEl.style.display = 'flex'; loadEl.innerText = 'Loading…'; }
            canvasEl.style.display = 'none';

            // 1D/1W → Yahoo Finance (free intraday); 1M+ → Polygon daily aggregates
            try {
                let points;
                if (_fmpIntraday[range]) {
                    const { points: closes, timestamps } = await _fetchFMPChart(ticker, range);
                    points = timestamps.map((t, i) => ({ t, y: closes[i] }));
                } else {
                    const { from, to, mult, timespan } = _polyRange(range);
                    const polyUrl = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/${mult}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=500&apiKey=${POLYGON_KEY}`;
                    const json = await fetch(polyUrl).then(r => r.json());
                    const results = json.results || [];
                    if (!results.length) throw new Error('No data');
                    points = results.map(r => ({ t: r.t, y: r.c }));
                }
                if (!points.length) throw new Error('Empty series');
                _expChartCache[cacheKey] = points;
                renderChart(points);
            } catch (err) {
                console.error('Expanded chart fetch error:', err);
                if (loadEl) { loadEl.style.display = 'flex'; loadEl.innerText = 'Chart unavailable'; }
            }
        }

        /**
         * Called by the expanded tab buttons. Manages active state and triggers load.
         */
        function switchExpandedChart(ticker, range, btn) {
            // Update active tab
            if (btn) {
                const tabRow = btn.closest('.exp-tab-row');
                if (tabRow) tabRow.querySelectorAll('.exp-tab').forEach(t => t.classList.remove('exp-tab-active'));
                btn.classList.add('exp-tab-active');
            }
            loadExpandedChart(ticker, range);
        }

        // ── Drag-to-compare range plugin factory ────────────────────────────────────
        /**
         * Returns a Chart.js plugin object that adds drag-to-compare range selection.
         * Short taps (<200ms) fall through to normal Chart.js tooltip.
         * Long-press+drag draws a shaded region + floating diff label.
         * `dataValues` must be the raw numeric price array in the same order as chart data.
         */
        function _makeRangePlugin(dataValues) {
            let dragStart = null;      // { x: canvasX, idx: dataIndex, time: ms }
            let dragEnd = null;      // { x: canvasX, idx: dataIndex }
            let isRanging = false;
            let fadeTimer = null;
            let overlayOpacity = 0;

            function _xToIndex(chart, clientX) {
                const rect = chart.canvas.getBoundingClientRect();
                const x = clientX - rect.left;
                // Chart area bounds
                const ca = chart.chartArea;
                const clamped = Math.max(ca.left, Math.min(ca.right, x));
                const ratio = (clamped - ca.left) / (ca.right - ca.left);
                return Math.round(ratio * (dataValues.length - 1));
            }

            function _drawOverlay(chart) {
                if (!isRanging || !dragStart || !dragEnd || overlayOpacity <= 0) return;
                const ctx = chart.ctx;
                const ca = chart.chartArea;
                const n = dataValues.length - 1;

                const x1 = ca.left + (dragStart.idx / n) * (ca.right - ca.left);
                const x2 = ca.left + (dragEnd.idx / n) * (ca.right - ca.left);
                const xL = Math.min(x1, x2);
                const xR = Math.max(x1, x2);

                const startVal = dataValues[dragStart.idx];
                const endVal = dataValues[dragEnd.idx];
                const diff = endVal - startVal;
                const pct = (diff / startVal) * 100;
                const isPos = diff >= 0;
                const color = isPos ? '#00c853' : '#ef5350';
                const sign = isPos ? '+' : '';
                const label = `${sign}$${Math.abs(diff).toFixed(2)}  (${sign}${pct.toFixed(1)}%)`;

                ctx.save();
                ctx.globalAlpha = overlayOpacity;

                // Shaded region
                ctx.fillStyle = color + '28';
                ctx.fillRect(xL, ca.top, xR - xL, ca.bottom - ca.top);

                // Vertical cursors
                ctx.strokeStyle = color + 'bb';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 3]);
                ctx.beginPath(); ctx.moveTo(x1, ca.top); ctx.lineTo(x1, ca.bottom); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x2, ca.top); ctx.lineTo(x2, ca.bottom); ctx.stroke();
                ctx.setLineDash([]);

                // Floating label pill
                ctx.font = '600 12px "DM Mono", monospace';
                const tw = ctx.measureText(label).width;
                const pH = 22, PW = tw + 20;
                const lx = Math.max(ca.left + 4, Math.min(ca.right - PW - 4, (xL + xR) / 2 - PW / 2));
                const ly = ca.top + 8;

                ctx.fillStyle = 'rgba(10,10,10,0.82)';
                ctx.beginPath();
                ctx.roundRect(lx, ly, PW, pH, 6);
                ctx.fill();

                ctx.fillStyle = color;
                ctx.textBaseline = 'middle';
                ctx.fillText(label, lx + 10, ly + pH / 2);

                ctx.restore();
            }

            function _startFade(chart) {
                let opacity = 1;
                overlayOpacity = 1;
                if (fadeTimer) clearInterval(fadeTimer);
                setTimeout(() => {
                    fadeTimer = setInterval(() => {
                        opacity -= 0.07;
                        overlayOpacity = Math.max(0, opacity);
                        chart.draw();
                        if (opacity <= 0) {
                            clearInterval(fadeTimer);
                            isRanging = false;
                            dragStart = dragEnd = null;
                            chart.draw();
                        }
                    }, 30);
                }, 900);
            }

            return {
                id: 'rangeSelect',
                afterDraw(chart) { _drawOverlay(chart); },
                beforeEvent(chart, args) {
                    const e = args.event;
                    const clientX = e.x != null ? e.x + chart.canvas.getBoundingClientRect().left : null;

                    if (e.type === 'mousedown' || e.type === 'touchstart') {
                        if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; }
                        isRanging = false;
                        overlayOpacity = 0;
                        const cX = e.native?.touches ? e.native.touches[0].clientX : e.native?.clientX;
                        if (cX == null) return;
                        dragStart = { idx: _xToIndex(chart, cX), time: Date.now() };
                        dragEnd = null;
                    }

                    if (e.type === 'mousemove' || e.type === 'touchmove') {
                        if (!dragStart) return;
                        const elapsed = Date.now() - dragStart.time;
                        const cX = e.native?.touches ? e.native.touches[0].clientX : e.native?.clientX;
                        if (cX == null) return;
                        const newIdx = _xToIndex(chart, cX);
                        if (elapsed > 200 || Math.abs(newIdx - dragStart.idx) > 2) {
                            isRanging = true;
                            overlayOpacity = 1;
                            dragEnd = { idx: newIdx };
                            args.changed = true; // tell Chart.js to redraw
                        }
                    }

                    if (e.type === 'mouseup' || e.type === 'touchend') {
                        if (isRanging && dragStart && dragEnd) {
                            overlayOpacity = 1;
                            _startFade(chart);
                            args.changed = true;
                        }
                        // If it was just a tap, clear state so tooltip works normally
                        if (!isRanging) {
                            dragStart = dragEnd = null;
                        }
                    }

                    if (e.type === 'mouseout') {
                        if (!isRanging) dragStart = null;
                    }
                }
            };
        }

        // ── Collapsed sparkline engine ─────────────────────────────────────────────
        // Per-ticker+range cache: { 'AAPL:1M': { points: [{t,y},...], timestamps: [ms,...] } }
        const _spkCache = {};
        const _sparklineInstances = {};
        // Range → Yahoo Finance params (shared with expanded chart)
        const _spkRangeParams = {}; // kept for compat; Polygon params come from _polyRange

        function _spkLabel(tsMs, range) {
            const d = new Date(tsMs);
            if (range === '1D') return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            if (range === '1W') return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            if (range === '1M' || range === '3M') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (range === '6M' || range === '1Y') return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            return d.getFullYear().toString();
        }

        /**
         * Draw the collapsed sparkline with full interactivity:
         * tooltip, scrub price/pct update, gradient fill.
         */
        function _renderSparkline(ticker, points, timestamps, range) {
            try {
                const canvas = document.getElementById('sparkline-' + ticker);
                if (!canvas) return;

                // Find stock to get current price/change for restore-on-end
                const stockObj = deck.find(s => s.ticker === ticker);
                const stockPrice = stockObj ? stockObj.price : null;
                const stockChange = stockObj ? stockObj.change : null;
                const stockColor = stockObj ? stockObj.color : 'grey';

                const firstVal = points[0];
                const lastVal = points[points.length - 1];
                const isPos = lastVal >= firstVal;
                const lineColor = isPos ? '#00c853' : '#ef5350';
                const activeClass = isPos ? 'spk-active-green' : 'spk-active-red';

                // Update change display to reflect THIS timeframe's % change
                const rangePct = ((lastVal - firstVal) / firstVal * 100);
                const rangePctStr = (rangePct >= 0 ? '+' : '') + rangePct.toFixed(2) + '%';
                const rangeColor = isPos ? 'green' : 'red';
                const changeEl = document.getElementById('change-' + ticker);
                if (changeEl) {
                    changeEl.innerText = rangePctStr;
                    changeEl.className = 'c-change ' + rangeColor;
                }
                // Store on stock object so restoreOnLeave can restore it
                const _sObj = deck.find(s => s.ticker === ticker) || (savedStocks && savedStocks.find(s => s.ticker === ticker));
                if (_sObj) { _sObj._rangeChange = rangePctStr; _sObj._rangeColor = rangeColor; }

                // Mark active tab with color
                const tabRow = document.getElementById('spk-tabs-' + ticker);
                if (tabRow) {
                    tabRow.querySelectorAll('.spk-tab').forEach(t => {
                        t.classList.remove('spk-active', 'spk-active-green', 'spk-active-red');
                    });
                    const activeTab = tabRow.querySelector('.spk-tab.spk-active') ||
                        [...tabRow.querySelectorAll('.spk-tab')].find(t => t.innerText === range);
                    if (activeTab) activeTab.classList.add(activeClass);
                }

                // Destroy old instance
                if (_sparklineInstances[ticker]) {
                    _sparklineInstances[ticker].destroy();
                    delete _sparklineInstances[ticker];
                }

                const ctx = canvas.getContext('2d');
                const h = canvas.offsetHeight || 160;
                const gradient = ctx.createLinearGradient(0, 0, 0, h);
                gradient.addColorStop(0, lineColor + '44');
                gradient.addColorStop(1, lineColor + '00');

                const labels = timestamps.map(t => _spkLabel(t, range));

                _sparklineInstances[ticker] = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels,
                        datasets: [{
                            data: points,
                            borderColor: lineColor,
                            borderWidth: 2,
                            pointRadius: 0,
                            pointHoverRadius: 4,
                            pointHoverBackgroundColor: lineColor,
                            pointHoverBorderColor: '#fff',
                            pointHoverBorderWidth: 2,
                            fill: true,
                            backgroundColor: gradient,
                            tension: 0,
                        }]
                    },
                    options: {
                        responsive: true,
                        animation: { duration: 250 },
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                enabled: true,
                                mode: 'index',
                                intersect: false,
                                backgroundColor: 'rgba(10,10,10,0.88)',
                                titleColor: '#aaa',
                                bodyColor: '#fff',
                                bodyFont: { family: 'DM Mono', weight: '600', size: 12 },
                                titleFont: { family: 'DM Sans', size: 10 },
                                padding: 8,
                                cornerRadius: 8,
                                displayColors: false,
                                callbacks: {
                                    title: ctx => ctx[0].label,
                                    label: ctx => '$' + ctx.parsed.y.toFixed(2),
                                },
                                // External handler for scrubbing price/pct display
                                external: (context) => {
                                    const { tooltip } = context;
                                    const priceEl = document.getElementById('price-' + ticker);
                                    const changeEl = document.getElementById('change-' + ticker);
                                    if (!tooltip || tooltip.opacity === 0) {
                                        // Restored on end — handled by afterEvent below
                                        return;
                                    }
                                    const idx = tooltip.dataPoints?.[0]?.dataIndex;
                                    if (idx == null) return;
                                    const hoverPrice = points[idx];
                                    const pctFromStart = ((hoverPrice - firstVal) / firstVal * 100);
                                    const pctStr = (pctFromStart >= 0 ? '+' : '') + pctFromStart.toFixed(2) + '%';
                                    const hoverColor = pctFromStart >= 0 ? 'green' : 'red';
                                    if (priceEl) priceEl.innerText = '$' + hoverPrice.toFixed(2);
                                    if (changeEl) { changeEl.innerText = pctStr; changeEl.className = 'c-change ' + hoverColor; }
                                }
                            }
                        },
                        interaction: { mode: 'index', intersect: false },
                        scales: {
                            x: { display: false },
                            y: {
                                display: true,
                                position: 'right',
                                grid: { display: false, drawBorder: false },
                                border: { display: false },
                                ticks: {
                                    maxTicksLimit: 4,
                                    color: '#999',
                                    font: { family: 'DM Mono', size: 10 },
                                    callback: v => '$' + (v >= 100 ? v.toFixed(0) : v.toFixed(2)),
                                    padding: 4,
                                },
                            }
                        },
                        elements: { line: { borderCapStyle: 'round' } },
                        onHover: null,
                    },
                    plugins: [{
                        // Restore price on touch end / mouse leave
                        id: 'restoreOnLeave',
                        afterEvent(chart, args) {
                            const e = args.event;
                            if (e.type === 'mouseout' || e.type === 'touchend') {
                                const priceEl = document.getElementById('price-' + ticker);
                                const changeEl = document.getElementById('change-' + ticker);
                                // Re-look up at restore time so we get the latest fetched price
                                const latestStock = deck.find(s => s.ticker === ticker) || (savedStocks && savedStocks.find(s => s.ticker === ticker));
                                const latestPrice = latestStock ? latestStock.price : null;
                                const latestChange = latestStock ? latestStock.change : null;
                                const latestColor = latestStock ? latestStock.color : 'grey';
                                if (priceEl && latestPrice && latestPrice !== '...') priceEl.innerHTML = latestPrice;
                                if (changeEl) {
                                    // Use range-specific change if available, else fall back to 1D
                                    const restoreChange = latestStock?._rangeChange || latestChange;
                                    const restoreColor = latestStock?._rangeColor || latestColor;
                                    if (restoreChange) {
                                        changeEl.innerText = restoreChange;
                                        changeEl.className = 'c-change ' + restoreColor;
                                    }
                                }
                            }
                        }
                    }, _makeRangePlugin(points)]
                });
            } catch (err) {
                console.warn('_renderSparkline error for', ticker, err);
            }
        }

        // Intraday ranges served by Twelve Data (free tier, no proxy needed)
        const _fmpIntraday = {
            '1D': { interval: '5min', outputsize: 78 },
            '1W': { interval: '1h',   outputsize: 40 },
        };

        // Fetch intraday points+timestamps from Twelve Data for 1D and 1W
        async function _fetchFMPChart(ticker, range) {
            const { interval, outputsize } = _fmpIntraday[range];
            const url = `https://api.twelvedata.com/time_series?symbol=${ticker}&interval=${interval}&outputsize=${outputsize}&apikey=${TWELVE_DATA_KEY}`;
            const json = await fetch(url).then(r => r.json());
            if (json.status === 'error' || !Array.isArray(json.values) || json.values.length < 2) throw new Error('No Twelve Data');
            // Twelve Data returns newest-first — reverse to chronological
            const sorted = [...json.values].reverse();
            return {
                points: sorted.map(v => parseFloat(v.close)),
                timestamps: sorted.map(v => new Date(v.datetime).getTime()),
            };
        }

        /**
         * Load sparkline data (with cache) then render.
         * Called on card open (loadSparkline) and on tab tap (switchSparkline).
         */
        async function loadSparkline(ticker, range, basePrice, baseChange, baseColor) {
            const cacheKey = ticker + ':' + range;
            if (_spkCache[cacheKey]) {
                const { points, timestamps } = _spkCache[cacheKey];
                _renderSparkline(ticker, points, timestamps, range);
                return;
            }
            try {
                let points, timestamps;
                if (_fmpIntraday[range]) {
                    // 1D / 1W — use Yahoo Finance (Polygon free tier blocks intraday)
                    ({ points, timestamps } = await _fetchFMPChart(ticker, range));
                } else {
                    // 1M+ — use Polygon daily aggregates
                    const { from, to, mult, timespan } = _polyRange(range);
                    const polyUrl = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/${mult}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=500&apiKey=${POLYGON_KEY}`;
                    const json = await fetch(polyUrl).then(r => r.json());
                    const results = json.results || [];
                    if (results.length < 2) return;
                    points = results.map(r => r.c);
                    timestamps = results.map(r => r.t);
                }
                _spkCache[cacheKey] = { points, timestamps };
                _renderSparkline(ticker, points, timestamps, range);
            } catch (err) {
                console.warn('loadSparkline error:', err);
            }
        }

        /**
         * Called by collapsed tab pills.
         */
        function switchSparkline(ticker, range, btn) {
            try {
                const tabRow = btn?.closest('.spk-tab-row');
                if (tabRow) {
                    tabRow.querySelectorAll('.spk-tab').forEach(t =>
                        t.classList.remove('spk-active', 'spk-active-green', 'spk-active-red'));
                    btn.classList.add('spk-active');
                }
                const stockObj = deck.find(s => s.ticker === ticker);
                loadSparkline(ticker, range,
                    stockObj?.price, stockObj?.change, stockObj?.color);
            } catch (err) {
                console.warn('switchSparkline error:', err);
            }
        }


        function triggerAvatarUpload() {
            if (!currentUser) { showToast('Sign in to add a photo'); return; }
            document.getElementById('avatar-file-input').click();
        }

        async function uploadAvatar(input) {
            const file = input.files[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5MB'); return; }

            showToast('Uploading...');

            try {
                const ext = file.name.split('.').pop();
                const path = `${currentUser.id}/avatar.${ext}`;

                const { error: upErr } = await supabaseClient.storage
                    .from('avatars')
                    .upload(path, file, { upsert: true, contentType: file.type });

                if (upErr) throw upErr;

                const { data: urlData } = supabaseClient.storage
                    .from('avatars')
                    .getPublicUrl(path);

                const avatarUrl = urlData.publicUrl + '?t=' + Date.now();

                await supabaseClient.from('user_profiles')
                    .update({ avatar_url: avatarUrl })
                    .eq('user_id', currentUser.id);

                window._avatarUrl = avatarUrl;
                applyAvatar(avatarUrl);
                showToast('Profile photo updated!');
            } catch (e) {
                console.error('Avatar upload error:', e);
                showToast('Upload failed. Try again.');
            }

            input.value = '';
        }

        function applyAvatar(url) {
            const img = document.getElementById('pr-avatar-img');
            const initials = document.getElementById('pr-avatar-text');
            const removeLink = document.getElementById('pr-remove-photo');
            if (!img || !initials) return;
            if (url) {
                img.src = url;
                img.style.display = 'block';
                initials.style.display = 'none';
                if (removeLink) removeLink.style.display = '';
            } else {
                img.style.display = 'none';
                initials.style.display = '';
                if (removeLink) removeLink.style.display = 'none';
            }
        }

        async function removeAvatar() {
            if (!currentUser) return;
            if (!confirm('Remove your profile photo?')) return;
            try {
                await supabaseClient.from('user_profiles')
                    .update({ avatar_url: null })
                    .eq('user_id', currentUser.id);
                window._avatarUrl = null;
                applyAvatar(null);
                showToast('Profile photo removed.');
            } catch (e) {
                showToast('Could not remove photo. Try again.');
            }
        }

        function renderProfile() {
            document.getElementById('pr-saved-count').innerText = savedStocks.length;
            if (currentUser) {
                (async () => {
                    const { count } = await supabaseClient
                        .from('seen_stocks')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', currentUser.id);
                    const el = document.getElementById('pr-swipes-count');
                    if (el) el.innerText = count || 0;
                })();
            }
            let sectors = new Set(savedStocks.map(s => s.sector));
            document.getElementById('pr-sectors-count').innerText = sectors.size;

            // Friend count
            (async () => {
                if (currentUser) {
                    const { data } = await supabaseClient
                        .from('friendships')
                        .select('id')
                        .or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`)
                        .eq('status', 'accepted');
                    const friendCountEl = document.getElementById('pr-friends-count');
                    if (friendCountEl) friendCountEl.innerText = (data || []).length;
                }
            })();

            const ints = document.getElementById('pr-interests');
            if (userInterests.length > 0) {
                ints.innerHTML = userInterests.map(i => `<div class="pr-chip">${i}</div>`).join('');
            } else {
                ints.innerHTML = '<div class="pr-chip">No interests set</div>';
            }

            // Risk Profile and Investing Goal — from quiz
            if (userProfile) {
                const riskBadge = document.getElementById('pr-risk-badge');
                const riskDesc = document.getElementById('pr-risk-desc');
                const goalDesc = document.getElementById('pr-goal-desc');

                const riskLabels = { safe: 'Conservative', balanced: 'Balanced', aggressive: 'Aggressive' };
                const riskDescs = {
                    safe: 'You prefer stable, lower-risk investments with steady returns.',
                    balanced: 'Targeting steady growth with a moderate tolerance for volatility.',
                    aggressive: 'You embrace high risk for the potential of high reward.'
                };
                if (riskBadge) riskBadge.textContent = riskLabels[userProfile.risk] || 'Balanced';
                if (riskDesc) riskDesc.textContent = riskDescs[userProfile.risk] || riskDescs.balanced;

                const goalMap = {
                    short: 'Short-term gains and active trading opportunities.',
                    medium: 'Medium-term growth over the next 1–3 years.',
                    long: 'Long-term wealth accumulation over 5+ years.'
                };
                if (goalDesc) goalDesc.textContent = goalMap[userProfile.horizon] || goalMap.long;
            }

            // Auth-aware header
            if (currentUser) {
                const username = window._username || currentUser.email || '';
                const displayName = window._username ? '@' + window._username : (currentUser.email || '');
                const initials = username.slice(0, 2).toUpperCase();
                const textEl = document.getElementById('pr-avatar-text');
                if (textEl) textEl.textContent = initials;
                document.getElementById('pr-user-email').textContent = displayName;
                document.getElementById('pr-member-label').textContent = 'Signed in';
                document.getElementById('pr-signout-row').style.display = '';
                const delRow = document.getElementById('pr-delete-row');
                if (delRow) delRow.style.display = currentUser ? 'flex' : 'none';

                // Load avatar — use cached URL or fetch from Supabase
                if (window._avatarUrl) {
                    applyAvatar(window._avatarUrl);
                } else {
                    (async () => {
                        const { data: prof } = await supabaseClient
                            .from('user_profiles').select('avatar_url').eq('user_id', currentUser.id).maybeSingle();
                        if (prof?.avatar_url) {
                            window._avatarUrl = prof.avatar_url;
                            applyAvatar(prof.avatar_url);
                        }
                    })();
                }
            } else {
                document.getElementById('pr-avatar-initials').textContent = 'G';
                document.getElementById('pr-user-email').textContent = 'Guest';
                document.getElementById('pr-member-label').textContent = 'Exploring as guest';
                document.getElementById('pr-signout-row').style.display = 'none';
                const delRow = document.getElementById('pr-delete-row');
                if (delRow) delRow.style.display = 'none';
            }
        }

        // --- Tooltip functionality ---
        function toggleMetricTooltip(e, type) {
            e.stopPropagation();
            document.querySelectorAll('.metric-tooltip').forEach(el => {
                el.classList.remove('active');
                el.style.left = '';
                el.style.right = '';
                el.style.transform = '';
                el.style.setProperty('--arrow-pos', '50%');
            });
            const cell = e.currentTarget.closest('.metric-cell');
            if (!cell) return;
            const tt = cell.querySelector('.metric-tooltip');
            if (tt) {
                tt.classList.add('active');
                const rect = tt.getBoundingClientRect();

                if (rect.left < 16) {
                    tt.style.left = '0';
                    tt.style.transform = 'none';
                    tt.style.setProperty('--arrow-pos', '24px');
                } else if (rect.right > window.innerWidth - 16) {
                    tt.style.left = 'auto';
                    tt.style.right = '0';
                    tt.style.transform = 'none';
                    tt.style.setProperty('--arrow-pos', 'calc(100% - 24px)');
                }
            }
        }

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.metric-cell')) {
                document.querySelectorAll('.metric-tooltip').forEach(el => el.classList.remove('active'));
            }
        });
        document.addEventListener('touchstart', (e) => {
            if (!e.target.closest('.metric-cell')) {
                document.querySelectorAll('.metric-tooltip').forEach(el => el.classList.remove('active'));
            }
        }, { passive: true });

        // ─── Alpha Screen ───
        let _alphaCrossfadeTimer = null;
        let _alphaTaglineTimer = null;
        let _alphaCurrentTagline = 0;
        let _alphaFeatureObserver = null;

        let _preAlphaActiveTab = null;

        function openAlphaScreen() {
            const activeNavBtn = document.querySelector('.nav-item.active');
            _preAlphaActiveTab = activeNavBtn ? activeNavBtn.id : null;
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            document.getElementById('nav-btn-alpha').classList.add('active');
            const scr = document.getElementById('alpha-screen');
            scr.style.display = 'flex';
            requestAnimationFrame(() => requestAnimationFrame(() => {
                scr.classList.add('active');
                startAlphaCrossfade();
                startAlphaTaglineRotation();
                startAlphaFeatureObserver();
            }));
        }

        function closeAlphaScreen() {
            const scr = document.getElementById('alpha-screen');
            stopAlphaCrossfade();
            stopAlphaTaglineRotation();
            stopAlphaFeatureObserver();
            scr.classList.remove('active');
            setTimeout(() => {
                scr.style.display = 'none';
                document.getElementById('nav-btn-alpha').classList.remove('active');
                if (_preAlphaActiveTab) {
                    const prev = document.getElementById(_preAlphaActiveTab);
                    if (prev) prev.classList.add('active');
                }
            }, 300);
        }

        function startAlphaFeatureObserver() {
            const scr = document.getElementById('alpha-screen');
            if (!scr) return;
            const rows = scr.querySelectorAll('.alpha-feature-row');
            if (!rows.length) return;
            _alphaFeatureObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('alpha-row-visible');
                        _alphaFeatureObserver.unobserve(entry.target);
                    }
                });
            }, { root: scr, threshold: 0.15 });
            rows.forEach(row => _alphaFeatureObserver.observe(row));
        }

        function stopAlphaFeatureObserver() {
            if (_alphaFeatureObserver) {
                _alphaFeatureObserver.disconnect();
                _alphaFeatureObserver = null;
            }
            document.querySelectorAll('#alpha-screen .alpha-feature-row').forEach(row => {
                row.classList.remove('alpha-row-visible');
            });
        }

        function startAlphaCrossfade() {
            const symEl = document.getElementById('alpha-symbol-text');
            if (!symEl) return;
            // Reset, force reflow, then play entrance animation
            symEl.style.animation = 'none';
            symEl.style.opacity   = '0';
            symEl.style.transform = 'translateY(20px)';
            symEl.offsetHeight; // trigger reflow
            symEl.style.animation = 'alphaEntrance 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards, alphaShimmer 3s ease-in-out infinite';
        }

        function stopAlphaCrossfade() {
            if (_alphaCrossfadeTimer) { clearTimeout(_alphaCrossfadeTimer); _alphaCrossfadeTimer = null; }
            const symEl = document.getElementById('alpha-symbol-text');
            if (symEl) {
                symEl.style.animation = 'none';
                symEl.style.opacity   = '0';
                symEl.style.transform = 'translateY(20px)';
            }
        }

        function startAlphaTaglineRotation() {
            const taglines = document.querySelectorAll('.alpha-tagline');
            _alphaCurrentTagline = 0;
            taglines.forEach((t, i) => t.classList.toggle('visible', i === 0));
            _alphaTaglineTimer = setInterval(() => {
                taglines[_alphaCurrentTagline].classList.remove('visible');
                _alphaCurrentTagline = (_alphaCurrentTagline + 1) % taglines.length;
                taglines[_alphaCurrentTagline].classList.add('visible');
            }, 3500);
        }

        function stopAlphaTaglineRotation() {
            if (_alphaTaglineTimer) { clearInterval(_alphaTaglineTimer); _alphaTaglineTimer = null; }
        }

        async function alphaNotifyMe() {
            const btn = document.getElementById('alpha-cta-btn');
            if (!btn || btn.disabled) return;

            // Require a logged-in (non-guest) user so we have a real email
            if (!currentUser || isGuest) {
                btn.textContent = 'Sign in to join the waitlist.';
                btn.style.fontSize = '13px';
                setTimeout(() => {
                    btn.textContent = 'Notify Me When Alpha Launches';
                    btn.style.fontSize = '16px';
                }, 3000);
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Joining…';

            const { error } = await supabaseClient
                .from('waitlist')
                .insert({ email: currentUser.email });

            // 23505 = unique_violation (already on waitlist) — treat as success
            if (error && error.code !== '23505') {
                console.error('Waitlist insert error:', error);
                btn.textContent = 'Something went wrong. Try again.';
                btn.style.fontSize = '13px';
                btn.disabled = false;
            } else {
                btn.textContent = "You're on the list. We'll let you know.";
                btn.style.fontSize = '13px';
            }

            setTimeout(() => {
                btn.textContent = 'Notify Me When Alpha Launches';
                btn.style.fontSize = '16px';
                btn.disabled = false;
            }, 3000);
        }

        function tradeOnWealthsimple(ticker, e) {
            if (e) e.stopPropagation();
            const referral = 'https://www.wealthsimple.com/invite/BBPNFE';
            let appLaunched = false;

            function onVisibilityChange() {
                if (document.hidden) appLaunched = true;
                document.removeEventListener('visibilitychange', onVisibilityChange);
            }
            document.addEventListener('visibilitychange', onVisibilityChange);

            // Try to open the Wealthsimple app
            window.location.href = 'wealthsimple://';

            // If the app didn't open after 800ms, send to referral signup
            setTimeout(() => {
                document.removeEventListener('visibilitychange', onVisibilityChange);
                if (!appLaunched) window.open(referral, '_blank');
            }, 800);
        }
