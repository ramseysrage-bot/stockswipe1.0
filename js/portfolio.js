        function portfolioFillColor(context) {
            const chart = context.chart;
            const { ctx, chartArea, scales } = chart;
            if (!chartArea || !scales.y) return 'rgba(0,200,83,0.08)';
            const yZero = scales.y.getPixelForValue(0);
            const top = chartArea.top;
            const bottom = chartArea.bottom;
            const ratio = Math.min(1, Math.max(0, (yZero - top) / (bottom - top)));
            if (ratio === 0) return 'rgba(229,57,53,0.08)';
            if (ratio === 1) return 'rgba(0,200,83,0.08)';
            const grad = ctx.createLinearGradient(0, top, 0, bottom);
            grad.addColorStop(0, 'rgba(0,200,83,0.08)');
            grad.addColorStop(ratio, 'rgba(0,200,83,0.08)');
            grad.addColorStop(ratio, 'rgba(229,57,53,0.08)');
            grad.addColorStop(1, 'rgba(229,57,53,0.08)');
            return grad;
        }

        let _pfSelected = new Set();
        let _pfAllocs = {};
        let _pfSharpeCache = null; // cached result from sharpe-and-analyse
        let _pfLineChart = null;
        let _pfPieChart = null;
        let _pfSDLineChart = null;
        let _pfSDPieChart = null;
        let _pfSuccessTimer = null;
        let _pfLoadTimer = null;
        let _savedPortfolios = [];
        let _lastPfAnalysis = null; // stores full edge function response for save/detail views
        let _pfBucketMode = false;  // true when entering sliders from bucket analysis or weekly drop
        let _pfPickerFilter = null; // null = All, or bucket id string

        function pfShowStep(step) {
            ['pf-hub', 'pf-picker', 'pf-sliders', 'pf-results', 'pf-saved', 'pf-saved-detail', 'pf-weekly-drop'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
            // Destroy detail charts when leaving detail view
            if (_pfSDLineChart) { _pfSDLineChart.destroy(); _pfSDLineChart = null; }
            if (_pfSDPieChart) { _pfSDPieChart.destroy(); _pfSDPieChart = null; }
            // Cancel and hide loading overlay
            if (_pfLoadTimer) { clearTimeout(_pfLoadTimer); _pfLoadTimer = null; }
            const loadEl = document.getElementById('pf-loading');
            if (loadEl) loadEl.style.display = 'none';
            // Cancel and hide success overlay on any nav
            if (_pfSuccessTimer) { clearTimeout(_pfSuccessTimer); _pfSuccessTimer = null; }
            const successEl = document.getElementById('pf-success');
            if (successEl) { successEl.style.transition = ''; successEl.style.opacity = '1'; successEl.style.display = 'none'; }
            const target = document.getElementById(step);
            if (target) {
                target.style.display = 'flex';
                target.style.animation = 'none';
            }
        }

        function openPfHub() {
            pfShowStep('pf-hub');
            renderPfBuckets();
            _startHot7Timer();
            _renderHot7Tickers();
        }

        async function _renderHot7Tickers() {
            const el = document.getElementById('hot7-tickers');
            if (!el) return;
            try {
                const drop = _weeklyDropCache || await (async () => {
                    const { data } = await supabaseClient
                        .from('weekly_drops')
                        .select('stocks')
                        .eq('status', 'published')
                        .order('published_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    return data;
                })();
                if (!drop || !Array.isArray(drop.stocks) || !drop.stocks.length) {
                    el.innerHTML = '<div style="font-family:\'DM Sans\',sans-serif;font-size:11px;color:#555;">Coming soon</div>';
                    return;
                }
                const top3 = drop.stocks.slice(0, 3);
                const rest = drop.stocks.length - 3;
                el.innerHTML = top3.map(s =>
                    `<div style="font-family:'DM Mono',monospace;font-size:11px;font-weight:700;color:#fff;background:rgba(255,255,255,0.1);padding:5px 10px;border-radius:8px;">${s.ticker}</div>`
                ).join('') + (rest > 0
                    ? `<div style="font-family:'DM Sans',sans-serif;font-size:11px;color:#555;padding:5px 2px;">+${rest} more</div>`
                    : '');
            } catch (_) {
                el.innerHTML = '<div style="font-family:\'DM Sans\',sans-serif;font-size:11px;color:#555;">Coming soon</div>';
            }
        }

        let _hot7TimerInterval = null;
        function _startHot7Timer() {
            if (_hot7TimerInterval) clearInterval(_hot7TimerInterval);
            _tickHot7();
            _hot7TimerInterval = setInterval(_tickHot7, 1000);
        }

        function _tickHot7() {
            const dateEl  = document.getElementById('hot7-date');
            const badgeEl = document.getElementById('hot7-badge');
            if (!dateEl || !badgeEl) return;

            const now = new Date();

            // Most recent Monday 00:00 local time
            const lastMonday = new Date(now);
            const day = lastMonday.getDay(); // 0=Sun,1=Mon,...
            const daysBack = day === 0 ? 6 : day - 1;
            lastMonday.setDate(lastMonday.getDate() - daysBack);
            lastMonday.setHours(0, 0, 0, 0);

            // Next Monday 00:00 local time
            const nextMonday = new Date(lastMonday);
            nextMonday.setDate(nextMonday.getDate() + 7);

            // Date label: "Mon Mar 17"
            const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            dateEl.textContent = '· ' + monthNames[lastMonday.getMonth()] + ' ' + lastMonday.getDate();

            // Is it NEW? (within 24hrs of last Monday)
            const msSinceMonday = now - lastMonday;
            const isNew = msSinceMonday < 24 * 60 * 60 * 1000;

            // Countdown to next Monday
            const msLeft = nextMonday - now;
            const totalSecs = Math.max(0, Math.floor(msLeft / 1000));
            const d = Math.floor(totalSecs / 86400);
            const h = Math.floor((totalSecs % 86400) / 3600);
            const m = Math.floor((totalSecs % 3600) / 60);
            const s = totalSecs % 60;
            const pad = n => String(n).padStart(2, '0');
            const countdown = d > 0
                ? `${d}d ${pad(h)}h ${pad(m)}m`
                : `${pad(h)}:${pad(m)}:${pad(s)}`;

            if (isNew) {
                badgeEl.textContent = 'NEW';
                badgeEl.style.cssText = 'margin-left:auto;font-family:\'DM Mono\',monospace;font-size:9px;font-weight:700;color:#00C853;background:rgba(0,200,83,0.18);padding:3px 8px;border-radius:100px;letter-spacing:0.5px;';
            } else {
                badgeEl.textContent = 'Next · ' + countdown;
                badgeEl.style.cssText = 'margin-left:auto;font-family:\'DM Mono\',monospace;font-size:9px;font-weight:700;color:#00C853;background:rgba(0,200,83,0.18);padding:3px 8px;border-radius:100px;letter-spacing:0.5px;';
            }
        }

        function renderPfBuckets() {
            const el = document.getElementById('pf-buckets-section');
            if (!el || typeof BUCKET_DATA === 'undefined') return;

            const active = window.activeBucket;
            if (!active) { el.style.display = 'none'; return; }
            el.style.display = 'block';

            const otherBuckets = Object.values(BUCKET_DATA).filter(b => b.id !== active.id);
            const bucketSaves = savedStocks.filter(s => active.universe.has(s.ticker));

            el.innerHTML = `
                <div style="font-family:'DM Mono',monospace;font-size:10px;font-weight:600;color:#aaa;letter-spacing:1.5px;text-transform:uppercase;padding:0 0 12px;">Your Bucket</div>
                <div style="background:#f9f9f9;border:1.5px solid #eee;border-radius:20px;padding:20px;margin-bottom:16px;">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
                        <div style="width:44px;height:44px;border-radius:50%;background:rgba(0,200,83,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">${typeof getBucketIcon==='function'?getBucketIcon(active.id,22,'#00C853'):''}</div>
                        <div>
                            <div style="font-family:'DM Sans',sans-serif;font-size:16px;font-weight:700;color:#0a0a0a;">${active.name}</div>
                            <div style="font-family:'DM Sans',sans-serif;font-size:12px;color:#888;">${active.tagline}</div>
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
                        <div style="text-align:center;background:#fff;border-radius:12px;padding:10px 6px;">
                            <div style="font-family:'DM Mono',monospace;font-size:15px;font-weight:700;color:${active.color};">+${active.return_5y}%</div>
                            <div style="font-family:'DM Sans',sans-serif;font-size:9px;color:#aaa;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">5yr Rtn</div>
                        </div>
                        <div style="text-align:center;background:#fff;border-radius:12px;padding:10px 6px;">
                            <div style="font-family:'DM Mono',monospace;font-size:15px;font-weight:700;color:#0a0a0a;">${active.sharpe_5y}</div>
                            <div style="font-family:'DM Sans',sans-serif;font-size:9px;color:#aaa;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">Sharpe</div>
                        </div>
                        <div style="text-align:center;background:#fff;border-radius:12px;padding:10px 6px;">
                            <div style="font-family:'DM Mono',monospace;font-size:15px;font-weight:700;color:#0a0a0a;">${active.universe.size}</div>
                            <div style="font-family:'DM Sans',sans-serif;font-size:9px;color:#aaa;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">Stocks</div>
                        </div>
                    </div>
                    ${bucketSaves.length >= 2
                        ? `<button onclick="pfRunBucketAnalysis()" style="width:100%;margin-top:12px;background:${active.color}18;color:${active.color};border:1.5px solid ${active.color}40;border-radius:12px;padding:10px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;cursor:pointer;">Analyse my ${Math.min(bucketSaves.length,4)} picks →</button>`
                        : `<div style="margin-top:10px;text-align:center;font-family:'DM Sans',sans-serif;font-size:12px;color:#aaa;">Save ${2-bucketSaves.length} more ${active.name} stock${2-bucketSaves.length===1?'':'s'} to run analysis</div>`
                    }
                </div>

                <div style="font-family:'DM Mono',monospace;font-size:10px;font-weight:600;color:#aaa;letter-spacing:1.5px;text-transform:uppercase;padding:0 0 10px;">Other Buckets</div>
                <div style="position:relative;">
                <div style="position:absolute;top:0;left:0;bottom:4px;width:28px;background:linear-gradient(to right,#fff,transparent);z-index:2;pointer-events:none;"></div>
                <div style="position:absolute;top:0;right:0;bottom:4px;width:28px;background:linear-gradient(to left,#fff,transparent);z-index:2;pointer-events:none;"></div>
                <div style="display:flex;gap:10px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding-bottom:4px;">
                    ${otherBuckets.map(b => `
                    <div onclick="launchBucketExplore('${b.id}')" style="flex-shrink:0;width:130px;background:#f9f9f9;border:1.5px solid #eee;border-radius:16px;padding:14px 12px;cursor:pointer;-webkit-tap-highlight-color:transparent;">
                        <div style="margin-bottom:8px;width:36px;height:36px;border-radius:50%;background:#ebebeb;display:flex;align-items:center;justify-content:center;">${typeof getBucketIcon==='function'?getBucketIcon(b.id,18,'#888'):''}</div>
                        <div style="font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;color:#0a0a0a;margin-bottom:2px;">${b.name}</div>
                        <div style="font-family:'DM Mono',monospace;font-size:11px;color:${b.color};font-weight:600;margin-bottom:6px;">+${b.return_5y}%</div>
                        <div style="font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;color:#888;">Explore →</div>
                    </div>`).join('')}
                </div>
                </div>`;
        }

        function pfToggleTip(wrapId, event) {
            if (event) event.stopPropagation();
            const wrap = document.getElementById(wrapId);
            if (!wrap) return;
            const isOpen = wrap.classList.contains('open');
            document.querySelectorAll('.pf-tooltip-wrap.open').forEach(el => el.classList.remove('open'));
            if (!isOpen) wrap.classList.add('open');
        }

        // Close tooltips when tapping outside
        document.addEventListener('click', () => {
            document.querySelectorAll('.pf-tooltip-wrap.open').forEach(el => el.classList.remove('open'));
        });

        function openPfPicker() {
            _pfPickerFilter = null;
            pfShowStep('pf-picker');
            if (savedStocks.length === 0) {
                const list = document.getElementById('pf-picker-list');
                list.innerHTML = `<div style="text-align:center;padding:48px 0;font-family:'DM Sans',sans-serif;color:#aaa;font-size:14px;">Save some stocks first, then come back to build your portfolio.</div>`;
                document.getElementById('pf-build-btn-wrap').style.display = 'none';
                const chips = document.getElementById('pf-picker-chips');
                if (chips) chips.style.display = 'none';
                return;
            }
            _pfRenderPickerChips();
            pfRenderPickerList();
        }

        function _pfRenderPickerChips() {
            const chipsEl = document.getElementById('pf-picker-chips');
            if (!chipsEl || typeof BUCKET_DATA === 'undefined') return;
            const bucketsWithSaves = Object.values(BUCKET_DATA).filter(b =>
                savedStocks.some(s => b.universe.has(s.ticker))
            );
            if (bucketsWithSaves.length < 2) { chipsEl.style.display = 'none'; return; }
            chipsEl.style.display = 'block';
            const allActive = _pfPickerFilter === null;
            chipsEl.innerHTML = `
                <div style="display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding-bottom:4px;">
                    <div onclick="pfSetPickerFilter(null)" style="flex-shrink:0;padding:7px 14px;border-radius:100px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s;${allActive ? 'background:#0a0a0a;color:#fff;' : 'background:#f4f4f5;color:#888;'}">All</div>
                    ${bucketsWithSaves.map(b => {
                        const active = _pfPickerFilter === b.id;
                        return `<div onclick="pfSetPickerFilter('${b.id}')" style="flex-shrink:0;padding:7px 14px;border-radius:100px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s;${active ? `background:${b.color};color:#fff;` : 'background:#f4f4f5;color:#888;'}">${b.name}</div>`;
                    }).join('')}
                </div>`;
        }

        function pfSetPickerFilter(bucketId) {
            _pfPickerFilter = bucketId;
            _pfRenderPickerChips();
            pfRenderPickerList();
        }

        function pfRenderPickerList() {
            const list = document.getElementById('pf-picker-list');
            if (!list) return;
            let stocks = savedStocks;
            if (_pfPickerFilter && typeof BUCKET_DATA !== 'undefined') {
                const bucket = BUCKET_DATA[_pfPickerFilter];
                if (bucket) stocks = savedStocks.filter(s => bucket.universe.has(s.ticker));
            }
            if (stocks.length === 0) {
                list.innerHTML = `<div style="text-align:center;padding:48px 0;font-family:'DM Sans',sans-serif;color:#aaa;font-size:14px;">No saved stocks in this bucket yet.</div>`;
                document.getElementById('pf-build-btn-wrap').style.display = 'none';
                return;
            }
            list.innerHTML = '';
            stocks.forEach(s => {
                const sel = _pfSelected.has(s.ticker);
                const row = document.createElement('div');
                row.className = 'pf-stock-row' + (sel ? ' selected' : '');
                row.id = 'pf-row-' + s.ticker;
                const color = s.color === 'green' ? '#00C853' : s.color === 'red' ? '#E53935' : '#aaa';
                const bg = s.color === 'green' ? 'rgba(0,200,83,0.1)' : s.color === 'red' ? 'rgba(229,57,53,0.1)' : '#f4f4f5';
                row.innerHTML = `
                    <div class="pf-check">${sel ? '✓' : ''}</div>
                    <div class="pf-logo-wrap" style="position:relative;width:36px;height:36px;flex-shrink:0;">
                        <img id="pf-pick-logo-img-${s.ticker}" src="" alt="${s.ticker}" style="display:none;width:36px;height:36px;border-radius:10px;object-fit:contain;border:1px solid #eee;background:#fff;padding:2px;">
                        <div id="pf-pick-logo-fb-${s.ticker}" style="width:36px;height:36px;border-radius:10px;background:${bg};display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:9px;font-weight:700;color:${color};">${s.ticker.slice(0, 2)}</div>
                    </div>
                    <div class="pf-ticker-name">
                        <div class="pf-ticker">${s.ticker}</div>
                        <div class="pf-name">${s.name || ''}</div>
                    </div>
                    <div class="pf-price-tag">${(s.price != null && !isNaN(parseFloat(s.price))) ? '$' + parseFloat(s.price).toFixed(2) : '--'}</div>
                `;
                row.onclick = () => pfToggleStock(s.ticker);
                list.appendChild(row);
                const imgEl = document.getElementById('pf-pick-logo-img-' + s.ticker);
                const fbEl = document.getElementById('pf-pick-logo-fb-' + s.ticker);
                if (imgEl && fbEl) {
                    if (logoCache[s.ticker] !== undefined) injectLogo(imgEl, fbEl, s.ticker);
                    else fetchLogo(s.ticker).then(() => injectLogo(imgEl, fbEl, s.ticker));
                }
            });
            pfUpdateBuildBtn();
        }

        function pfToggleStock(ticker) {
            if (_pfSelected.has(ticker)) {
                _pfSelected.delete(ticker);
            } else {
                if (_pfSelected.size >= 4) { showToast('Max 4 stocks per portfolio.'); return; }
                _pfSelected.add(ticker);
            }
            const row = document.getElementById('pf-row-' + ticker);
            if (row) {
                row.classList.toggle('selected', _pfSelected.has(ticker));
                const chk = row.querySelector('.pf-check');
                if (chk) chk.textContent = _pfSelected.has(ticker) ? '✓' : '';
            }
            pfUpdateBuildBtn();
        }

        function pfUpdateBuildBtn() {
            const wrap = document.getElementById('pf-build-btn-wrap');
            if (wrap) wrap.style.display = _pfSelected.size >= 2 ? 'block' : 'none';
        }

        function pfSlidersBack() {
            if (_pfBucketMode) {
                _pfBucketMode = false;
                _pfSelected.clear();
                _pfAllocs = {};
                _pfSharpeCache = null;
                openPfHub();
            } else {
                openPfPicker();
            }
        }

        function pfRunBucketAnalysis() {
            const active = window.activeBucket;
            if (!active) return;
            const bucketSaves = savedStocks.filter(s => active.universe.has(s.ticker));
            if (bucketSaves.length < 2) {
                showToast(`Save at least 2 ${active.name} stocks first.`);
                return;
            }
            const picks = bucketSaves.slice(0, 4).map(s => s.ticker);
            _pfSelected = new Set(picks);
            _pfBucketMode = true;
            openPfSliders();
        }

        let _weeklyDropCache = null; // { week_id, stocks[] } cached for this session

        async function pfOpenWeeklyDrop() {
            pfShowStep('pf-weekly-drop');
            const list = document.getElementById('pf-wd-list');
            if (!list) return;

            // Show loading state
            list.innerHTML = '<div style="padding:32px;text-align:center;font-family:\'DM Sans\',sans-serif;font-size:13px;color:#aaa;">Loading picks...</div>';

            // Fetch latest weekly drop from DB (use cache within same session)
            if (!_weeklyDropCache) {
                try {
                    const { data, error } = await supabaseClient
                        .from('weekly_drops')
                        .select('week_id, published_at, stocks')
                        .order('published_at', { ascending: false })
                        .limit(1)
                        .single();
                    if (!error && data) _weeklyDropCache = data;
                } catch (_) {}
            }

            const drop = _weeklyDropCache;
            const items = drop?.stocks ?? [];

            // Update title with week date
            const titleEl = document.getElementById('pf-wd-title');
            if (titleEl && drop?.published_at) {
                const d = new Date(drop.published_at);
                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                titleEl.textContent = `Hot 7 · ${months[d.getMonth()]} ${d.getDate()}`;
            }

            list.innerHTML = '';

            if (!items.length) {
                list.innerHTML = '<div style="padding:32px;text-align:center;font-family:\'DM Sans\',sans-serif;font-size:13px;color:#aaa;">First drop arrives Monday.</div>';
                return;
            }

            items.forEach((item, i) => {
                const row = document.createElement('div');
                row.style.cssText = 'background:#f8f8f8;border-radius:16px;padding:14px 16px;display:flex;gap:12px;align-items:flex-start;';
                row.innerHTML = `
                    <div style="font-family:'DM Mono',monospace;font-size:11px;font-weight:700;color:#aaa;width:18px;flex-shrink:0;padding-top:11px;">${i + 1}</div>
                    <div style="position:relative;width:36px;height:36px;flex-shrink:0;">
                        <img id="pf-wd-logo-img-${item.ticker}" src="" alt="${item.ticker}" style="display:none;width:36px;height:36px;border-radius:10px;object-fit:contain;border:1px solid #eee;background:#fff;padding:2px;">
                        <div id="pf-wd-logo-fb-${item.ticker}" style="width:36px;height:36px;border-radius:10px;background:rgba(0,200,83,0.1);display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:9px;font-weight:700;color:#00C853;">${item.ticker.slice(0,2)}</div>
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-family:'DM Mono',monospace;font-size:13px;font-weight:700;color:#0a0a0a;margin-bottom:4px;">${item.ticker}</div>
                        <div style="font-family:'DM Sans',sans-serif;font-size:12px;color:#888;line-height:1.55;">${item.why}</div>
                    </div>
                `;
                list.appendChild(row);
                const imgEl = document.getElementById('pf-wd-logo-img-' + item.ticker);
                const fbEl  = document.getElementById('pf-wd-logo-fb-'  + item.ticker);
                if (imgEl && fbEl) {
                    if (logoCache[item.ticker] !== undefined) injectLogo(imgEl, fbEl, item.ticker);
                    else fetchLogo(item.ticker).then(() => injectLogo(imgEl, fbEl, item.ticker));
                }
            });
        }

        function pfCloseWeeklyDrop() {
            openPfHub();
        }

        function pfAnalyseWeeklyDrop() {
            const items = _weeklyDropCache?.stocks ?? [];
            const top4 = items.slice(0, 4).map(s => s.ticker);
            if (!top4.length) return;
            _pfSelected = new Set(top4);
            _pfBucketMode = true;
            openPfSliders();
        }

        function openPfSliders() {
            pfShowStep('pf-sliders');
            const tickers = [..._pfSelected];
            // Reset allocs to only the current selection (prevents stale keys from inflating the total)
            _pfAllocs = {};
            _pfSharpeCache = null;
            // Init equal weight
            const eq = Math.floor(100 / tickers.length);
            let rem = 100 - eq * tickers.length;
            tickers.forEach((t, i) => {
                _pfAllocs[t] = eq + (i === 0 ? rem : 0);
            });
            pfRenderSliders();
            pfUpdateWeightBtns('equal');
        }

        function pfRenderSliders() {
            const list = document.getElementById('pf-slider-list');
            list.innerHTML = '';
            const tickers = [..._pfSelected];
            tickers.forEach(ticker => {
                const s = savedStocks.find(x => x.ticker === ticker) || { ticker, name: '' };
                const pct = _pfAllocs[ticker] || 0;
                const wrap = document.createElement('div');
                wrap.className = 'pf-slider-row';
                wrap.innerHTML = `
                    <div class="pf-slider-top">
                        <div class="pf-logo-wrap" style="width:32px;height:32px;position:relative;">
                            <img id="pf-logo-img-${ticker}" src="" alt="${ticker}" style="display:none;width:32px;height:32px;border-radius:8px;object-fit:contain;border:1px solid #eee;background:#fff;padding:2px;">
                            <div id="pf-logo-fb-${ticker}" style="width:32px;height:32px;border-radius:8px;background:rgba(0,200,83,0.1);display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:9px;font-weight:700;color:#00C853;">${ticker.slice(0, 2)}</div>
                        </div>
                        <div style="flex:1;">
                            <div style="font-family:'DM Mono',monospace;font-size:12px;font-weight:700;color:#0a0a0a;">${ticker}</div>
                            <div style="font-family:'DM Sans',sans-serif;font-size:11px;color:#aaa;">${s.name || ''}</div>
                        </div>
                        <div class="pf-slider-pct" id="pf-pct-${ticker}">${pct}%</div>
                    </div>
                    <input type="range" class="pf-range" id="pf-range-${ticker}" min="0" max="100" value="${pct}">
                `;
                list.appendChild(wrap);
                const rangeEl = wrap.querySelector('.pf-range');
                rangeEl.addEventListener('input', () => pfSliderMoved(ticker, parseInt(rangeEl.value)));
                // Inject logo from cache using existing app pattern
                const imgEl = document.getElementById('pf-logo-img-' + ticker);
                const fbEl = document.getElementById('pf-logo-fb-' + ticker);
                if (imgEl && fbEl) {
                    if (logoCache[ticker] !== undefined) {
                        injectLogo(imgEl, fbEl, ticker);
                    } else {
                        fetchLogo(ticker).then(() => injectLogo(imgEl, fbEl, ticker));
                    }
                }
            });
            pfUpdateTotal();
        }

        function pfSliderMoved(changedTicker, newVal) {
            _pfAllocs[changedTicker] = newVal;
            _pfSharpeCache = null;
            const pctEl = document.getElementById('pf-pct-' + changedTicker);
            if (pctEl) pctEl.textContent = newVal + '%';
            pfUpdateWeightBtns(null);
            pfUpdateTotal();
        }

        function pfUpdateTotal() {
            const total = Object.values(_pfAllocs).reduce((a, b) => a + b, 0);
            const lbl = document.getElementById('pf-total-label');
            const btn = document.getElementById('pf-analyse-btn');
            if (lbl) {
                lbl.textContent = total + '%';
                lbl.style.color = total === 100 ? '#00C853' : '#E53935';
            }
            if (btn) {
                const ok = total === 100;
                btn.disabled = !ok;
                btn.style.background = ok ? '#fff' : '#f4f4f5';
                btn.style.color = ok ? '#00C853' : '#bbb';
                btn.style.border = ok ? '2px solid #00C853' : '2px solid #e0e0e0';
                btn.style.boxShadow = ok ? '0 4px 20px rgba(0,200,83,0.15)' : 'none';
                btn.style.cursor = ok ? 'pointer' : 'not-allowed';
                btn.textContent = ok ? 'Analyse' : 'Analyse';
            }
        }

        function pfUpdateWeightBtns(mode) {
            const ids = { equal: 'pf-btn-equal', marketcap: 'pf-btn-mcap', sharpe: 'pf-btn-sharpe' };
            Object.entries(ids).forEach(([key, id]) => {
                const btn = document.getElementById(id);
                if (!btn) return;
                const active = key === mode;
                btn.style.background = active ? '#0a0a0a' : '#f4f4f5';
                btn.style.color = active ? '#fff' : '#888';
            });
        }

        function pfResultsBack() {
            if (_pfBucketMode) {
                _pfBucketMode = false;
                _pfSelected.clear();
                _pfAllocs = {};
                _pfSharpeCache = null;
                openPfHub();
            } else {
                pfShowStep('pf-sliders');
                pfRenderSliders();
                pfUpdateTotal();
            }
        }

        function pfEqualWeight() {
            const tickers = [..._pfSelected];
            const eq = Math.floor(100 / tickers.length);
            let rem = 100 - eq * tickers.length;
            tickers.forEach((t, i) => { _pfAllocs[t] = eq + (i === 0 ? rem : 0); });
            pfRenderSliders();
            pfUpdateWeightBtns('equal');
        }

        async function pfSharpeOptimize() {
            const btn = document.getElementById('pf-btn-sharpe');
            const prevHTML = btn ? btn.innerHTML : 'Sharpe α';
            if (btn) { btn.textContent = '…'; btn.disabled = true; }
            _pfSharpeCache = null;
            const tickers = [..._pfSelected];
            const attemptFetch = () => supabaseClient.functions.invoke('sharpe-and-analyse', {
                body: { tickers, period: '1y' }
            });
            try {
                let { data, error } = await attemptFetch();
                // Single retry after 2s if first attempt fails (handles transient 429s)
                if (error || !data || !data.weights) {
                    await new Promise(r => setTimeout(r, 2000));
                    ({ data, error } = await attemptFetch());
                }
                if (error || !data || !data.weights) throw new Error(error?.message || 'No weights returned');
                tickers.forEach(t => { _pfAllocs[t] = data.weights[t] || 0; });
                _pfSharpeCache = data;
                pfRenderSliders();
                pfUpdateWeightBtns('sharpe');
            } catch (e) {
                showToast('Could not optimise. Please try again.');
            } finally {
                if (btn) { btn.innerHTML = prevHTML; btn.disabled = false; }
            }
        }

        async function pfMarketCapWeight() {
            const btn = document.getElementById('pf-btn-mcap');
            const prevText = btn ? btn.textContent : 'Mkt Cap';
            if (btn) { btn.textContent = '…'; btn.disabled = true; }

            const tickers = [..._pfSelected];
            const fetchResults = await Promise.allSettled(
                tickers.map(t =>
                    fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${t}&token=${FINNHUB_KEY}`)
                        .then(r => r.json())
                        .then(d => ({ ticker: t, mcap: d.marketCapitalization || null }))
                        .catch(() => ({ ticker: t, mcap: null }))
                )
            );

            const mcaps = {};
            const failed = [];
            fetchResults.forEach(r => {
                if (r.status === 'fulfilled') {
                    if (r.value.mcap) mcaps[r.value.ticker] = r.value.mcap;
                    else failed.push(r.value.ticker);
                }
            });

            failed.forEach(t => showToast(`Could not load market cap for ${t}, using equal weight instead.`));

            const eqWeight = parseFloat((100 / tickers.length).toFixed(1));
            const totalMcap = tickers.reduce((s, t) => s + (mcaps[t] || 0), 0);
            tickers.forEach(t => {
                if (mcaps[t] && totalMcap > 0) {
                    _pfAllocs[t] = parseFloat((mcaps[t] / totalMcap * 100).toFixed(1));
                } else {
                    _pfAllocs[t] = eqWeight;
                }
            });
            // Adjust rounding drift so total stays exactly 100
            const total = tickers.reduce((s, t) => s + _pfAllocs[t], 0);
            const drift = parseFloat((100 - total).toFixed(1));
            if (drift !== 0) _pfAllocs[tickers[0]] = parseFloat((_pfAllocs[tickers[0]] + drift).toFixed(1));

            pfRenderSliders();
            pfUpdateWeightBtns('marketcap');
            if (btn) { btn.textContent = prevText; btn.disabled = false; }
        }

        async function openPfResults() {
            const allTickers = [..._pfSelected];
            const tickers = allTickers.filter(t => (_pfAllocs[t] || 0) > 0);
            const allocations = tickers.map(t => _pfAllocs[t]);

            const analyseBtn = document.getElementById('pf-analyse-btn');
            if (analyseBtn) { analyseBtn.textContent = 'Analysing…'; analyseBtn.disabled = true; }

            const loadEl = document.getElementById('pf-loading');
            const loadBar = document.getElementById('pf-load-bar');
            const loadPills = document.getElementById('pf-load-pills');
            if (loadEl && loadBar && loadPills) {
                loadPills.innerHTML = '';
                tickers.forEach(t => {
                    const pill = document.createElement('div');
                    pill.className = 'loader-pill';
                    pill.textContent = t;
                    loadPills.appendChild(pill);
                });
                loadBar.style.width = '0%';
                loadEl.style.display = 'flex';
                let progress = 0;
                const pfBarInterval = setInterval(() => {
                    progress += 2;
                    loadBar.style.width = progress + '%';
                    if (progress >= 100) clearInterval(pfBarInterval);
                }, 55);
                loadPills.querySelectorAll('.loader-pill').forEach((pill, idx) => {
                    setTimeout(() => pill.classList.add('visible'), 300 + idx * 280);
                });
            }

            // If Sharpe mode: analysis already done — use cache, no second fetch
            let analysisData = null;
            let analysisError = null;
            let analysePromise;
            if (_pfSharpeCache) {
                analysisData = _pfSharpeCache;
                analysePromise = Promise.resolve();
            } else {
                const doAnalyse = () => supabaseClient.functions.invoke('analyse-portfolio', {
                    body: { tickers, allocations, period: '1y' }
                });
                analysePromise = doAnalyse().then(async ({ data, error }) => {
                    if (error || !data) {
                        await new Promise(r => setTimeout(r, 2000));
                        return doAnalyse();
                    }
                    return { data, error };
                }).then(({ data, error }) => {
                    analysisData = data;
                    analysisError = error;
                }).catch(err => {
                    analysisError = err;
                });
            }

            _pfLoadTimer = setTimeout(async () => {
                _pfLoadTimer = null;
                await analysePromise;

                if (analyseBtn) { analyseBtn.textContent = 'Analyse'; analyseBtn.disabled = false; }

                if (analysisError || !analysisData) {
                    if (loadEl) loadEl.style.display = 'none';
                    showToast('Could not analyse portfolio. Please try again.');
                    return;
                }

                _lastPfAnalysis = analysisData;
                pfShowStep('pf-results');
                _pfRenderResults(tickers, analysisData);
            }, 2900);
        }

        function _pfRenderResults(tickers, data) {
            let _pfScrubAnchor = null;
            // Reset save button
            const saveWrap = document.getElementById('pf-save-btn-wrap');
            if (saveWrap) {
                saveWrap.style.display = 'none';
                const saveBtn = saveWrap.querySelector('button');
                if (saveBtn) { saveBtn.textContent = 'Save Portfolio'; saveBtn.disabled = false; saveBtn.style.color = '#00C853'; saveBtn.style.border = '2px solid #00C853'; saveBtn.style.boxShadow = '0 4px 20px rgba(0,200,83,0.15)'; }
            }

            // Title
            const title = document.getElementById('pf-result-title');
            if (title) title.textContent = tickers.join(' · ');

            const body = document.getElementById('pf-results-body');
            body.innerHTML = '';

            // --- Real data from edge function ---
            const totalReturn  = parseFloat(data.stats.totalReturn.toFixed(1));
            const annReturn    = parseFloat(data.stats.annualisedReturn.toFixed(1));
            const volatility   = parseFloat(data.stats.volatility.toFixed(1));
            const alpha        = parseFloat(data.stats.alpha.toFixed(1));
            const sharpe       = parseFloat(data.stats.sharpe);
            const sortino      = parseFloat(data.stats.sortino);
            const maxDrawdown  = parseFloat(data.stats.maxDrawdown.toFixed(1));
            const riskLabel    = volatility < 20 ? 'Low' : volatility < 40 ? 'Medium' : volatility < 60 ? 'High' : 'Very High';
            const volColor     = volatility < 20 ? '#888' : volatility < 40 ? '#F59E0B' : volatility < 60 ? '#FF6600' : '#E53935';
            const riskColor    = volColor;
            const retColor     = totalReturn >= 0 ? '#00C853' : '#E53935';
            const annRetColor  = annReturn >= 0 ? '#00C853' : '#E53935';
            const alphaColor   = alpha >= 0 ? '#00C853' : '#E53935';
            const sharpeColor  = sharpe > 1 ? '#00C853' : sharpe >= 0 ? '#FF9800' : '#E53935';
            const sortinoColor = sortino > 1 ? '#00C853' : sortino >= 0 ? '#FF9800' : '#E53935';
            const chartLineColor = totalReturn >= 0 ? '#00C853' : '#E53935';
            // Build sparse x-axis labels from dates (month abbreviation every ~30 points)
            const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const chartLabels = data.dates.map((d, i) => {
                if (i === 0 || i % 30 === 0 || i === data.dates.length - 1) {
                    return MONTHS[new Date(d).getUTCMonth()];
                }
                return '';
            });

            // --- Success Overlay ---
            const successEl = document.getElementById('pf-success');
            if (successEl) {
                document.getElementById('pf-s-val1').textContent = (totalReturn >= 0 ? '+' : '') + totalReturn + '%';
                document.getElementById('pf-s-val1').style.color = totalReturn >= 0 ? '#00C853' : '#E53935';
                document.getElementById('pf-s-val2').textContent = volatility + '%';
                const val3El = document.getElementById('pf-s-val3');
                val3El.textContent = (alpha >= 0 ? '+' : '') + alpha + '%';
                val3El.style.color = alpha >= 0 ? '' : '#E53935';
                ['pf-s-stat1', 'pf-s-stat2', 'pf-s-stat3'].forEach(id => {
                    const el = document.getElementById(id);
                    el.classList.remove('pop');
                    el.style.opacity = '0';
                    void el.offsetWidth; // force reflow to reset animation
                });
                successEl.style.transition = '';
                successEl.style.opacity = '1';
                successEl.style.display = 'flex';
                setTimeout(() => document.getElementById('pf-s-stat1').classList.add('pop'), 300);
                setTimeout(() => document.getElementById('pf-s-stat2').classList.add('pop'), 800);
                setTimeout(() => document.getElementById('pf-s-stat3').classList.add('pop'), 1300);
                _pfSuccessTimer = setTimeout(() => {
                    successEl.style.transition = 'opacity 1s ease';
                    successEl.style.opacity = '0';
                    setTimeout(() => {
                        successEl.style.display = 'none';
                        successEl.style.transition = '';
                        // Show save button after overlay fades
                        const saveWrap = document.getElementById('pf-save-btn-wrap');
                        if (saveWrap) saveWrap.style.display = 'block';
                    }, 1050);
                }, 4800);
            }

            // Destroy old charts if they exist
            if (_pfLineChart) { _pfLineChart.destroy(); _pfLineChart = null; }
            if (_pfPieChart) { _pfPieChart.destroy(); _pfPieChart = null; }

            // Line chart section
            const lineWrap = document.createElement('div');
            lineWrap.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                    <div>
                        <div style="font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;color:#0a0a0a;">Cumulative Return</div>
                        <div style="font-family:'DM Sans',sans-serif;font-size:11px;color:#aaa;margin-top:1px;">1-year historical · not a forecast</div>
                    </div>
                    <div id="pf-chart-hover" style="text-align:right;">
                        <div id="pf-hover-label" style="font-family:'DM Mono',monospace;font-size:11px;color:#aaa;"></div>
                        <div style="display:flex;align-items:center;gap:10px;justify-content:flex-end;margin-top:2px;">
                            <span style="display:flex;align-items:center;gap:4px;">
                                <span id="pf-hover-pf-swatch" style="width:8px;height:8px;border-radius:2px;background:#00C853;display:inline-block;"></span>
                                <span id="pf-hover-portfolio" style="font-family:'DM Mono',monospace;font-size:12px;font-weight:700;color:#00C853;"></span>
                            </span>
                            <span style="display:flex;align-items:center;gap:4px;">
                                <span style="width:8px;height:8px;border-radius:2px;background:#aaa;display:inline-block;"></span>
                                <span id="pf-hover-bench" style="font-family:'DM Mono',monospace;font-size:12px;font-weight:600;color:#888;"></span>
                            </span>
                        </div>
                    </div>
                </div>
                <div style="background:#f8f8f8;border-radius:16px;padding:16px;position:relative;">
                    <canvas id="pf-line-canvas" height="180"></canvas>
                </div>
            `;
            body.appendChild(lineWrap);

            // Pie chart section
            const pieWrap = document.createElement('div');
            pieWrap.innerHTML = `
                <div style="font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;color:#0a0a0a;margin-bottom:12px;">Allocation</div>
                <div style="background:#f8f8f8;border-radius:16px;padding:16px;display:flex;align-items:center;gap:16px;">
                    <div style="width:140px;height:140px;flex-shrink:0;"><canvas id="pf-pie-canvas"></canvas></div>
                    <div id="pf-pie-legend" style="display:flex;flex-direction:column;gap:8px;flex:1;"></div>
                </div>
            `;
            body.appendChild(pieWrap);

            // Stats row
            const statsWrap = document.createElement('div');
            statsWrap.innerHTML = `
                <div style="font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;color:#0a0a0a;margin-bottom:12px;">Performance (1-year backtest)</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <div class="pf-stat-card">
                        <div class="pf-stat-val" style="color:${retColor};">${totalReturn >= 0 ? '+' : ''}${totalReturn}%</div>
                        <div class="pf-stat-lbl" style="display:flex;align-items:center;gap:4px;">Total Return
                            <span class="pf-tooltip-wrap" id="tip-tr" onclick="pfToggleTip('tip-tr',event)"><span class="pf-info-btn" style="width:14px;height:14px;font-size:9px;">i</span><span class="pf-tooltip-box" style="right:auto;left:50%;transform:translateX(-50%);">Total gain or loss over the 1-year backtest period.</span></span>
                        </div>
                    </div>
                    <div class="pf-stat-card">
                        <div class="pf-stat-val" style="color:${annRetColor};">${annReturn >= 0 ? '+' : ''}${annReturn}%</div>
                        <div class="pf-stat-lbl" style="display:flex;align-items:center;gap:4px;">Annualised
                            <span class="pf-tooltip-wrap" id="tip-ann" onclick="pfToggleTip('tip-ann',event)"><span class="pf-info-btn" style="width:14px;height:14px;font-size:9px;">i</span><span class="pf-tooltip-box" style="right:auto;left:50%;transform:translateX(-50%);">Return expressed as an annual rate, accounting for compounding.</span></span>
                        </div>
                    </div>
                    <div class="pf-stat-card">
                        <div class="pf-stat-val" style="color:${alphaColor};">${alpha >= 0 ? '+' : ''}${alpha}%</div>
                        <div class="pf-stat-lbl" style="display:flex;align-items:center;gap:4px;">Alpha vs S&amp;P 500
                            <span class="pf-tooltip-wrap" id="tip-alpha" onclick="pfToggleTip('tip-alpha',event)"><span class="pf-info-btn" style="width:14px;height:14px;font-size:9px;">i</span><span class="pf-tooltip-box" style="right:auto;left:50%;transform:translateX(-50%);">How much your portfolio outperformed (or underperformed) the S&amp;P 500. Positive alpha means you beat the market.</span></span>
                        </div>
                    </div>
                    <div class="pf-stat-card">
                        <div class="pf-stat-val" style="color:${volColor};">${volatility}%</div>
                        <div class="pf-stat-lbl" style="display:flex;align-items:center;gap:4px;">Volatility
                            <span class="pf-tooltip-wrap" id="tip-vol" onclick="pfToggleTip('tip-vol',event)"><span class="pf-info-btn" style="width:14px;height:14px;font-size:9px;">i</span><span class="pf-tooltip-box" style="right:auto;left:50%;transform:translateX(-50%);">Annualised standard deviation of returns. Higher means more price swings.</span></span>
                        </div>
                    </div>
                </div>
            `;
            body.appendChild(statsWrap);

            // Risk Metrics section
            const riskMetrics = document.createElement('div');
            riskMetrics.innerHTML = `
                <div style="font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;color:#0a0a0a;margin-bottom:12px;">Risk Metrics</div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
                    <div class="pf-risk-card">
                        <div class="pf-stat-val" style="font-size:22px;color:${sharpeColor};">${sharpe}</div>
                        <div class="pf-risk-card-lbl">
                            <span style="font-family:'DM Sans',sans-serif;font-size:11px;color:#aaa;">Sharpe</span>
                            <span class="pf-tooltip-wrap" id="tip-sharpe" onclick="pfToggleTip('tip-sharpe',event)"><span class="pf-info-btn" style="width:14px;height:14px;font-size:9px;">i</span><span class="pf-tooltip-box" style="right:auto;left:50%;transform:translateX(-50%);">Measures return per unit of risk. Above 1.0 is good, above 2.0 is excellent.</span></span>
                        </div>
                    </div>
                    <div class="pf-risk-card">
                        <div class="pf-stat-val" style="font-size:22px;color:${sortinoColor};">${sortino}</div>
                        <div class="pf-risk-card-lbl">
                            <span style="font-family:'DM Sans',sans-serif;font-size:11px;color:#aaa;">Sortino</span>
                            <span class="pf-tooltip-wrap" id="tip-sortino" onclick="pfToggleTip('tip-sortino',event)"><span class="pf-info-btn" style="width:14px;height:14px;font-size:9px;">i</span><span class="pf-tooltip-box" style="right:auto;left:50%;transform:translateX(-50%);">Like Sharpe, but only penalises downside volatility. A fairer measure if your portfolio has asymmetric returns.</span></span>
                        </div>
                    </div>
                    <div class="pf-risk-card">
                        <div class="pf-stat-val" style="font-size:22px;color:#E53935;">${maxDrawdown}%</div>
                        <div class="pf-risk-card-lbl">
                            <span style="font-family:'DM Sans',sans-serif;font-size:11px;color:#aaa;">Max DD</span>
                            <span class="pf-tooltip-wrap" id="tip-maxdd" onclick="pfToggleTip('tip-maxdd',event)"><span class="pf-info-btn" style="width:14px;height:14px;font-size:9px;">i</span><span class="pf-tooltip-box" style="right:auto;left:50%;transform:translateX(-50%);">The largest peak-to-trough decline over the backtest period. Tells you the worst case you would have experienced.</span></span>
                        </div>
                    </div>
                </div>
            `;
            body.appendChild(riskMetrics);

            // Risk badge
            const riskWrap = document.createElement('div');
            riskWrap.innerHTML = `
                <div style="background:#f8f8f8;border-radius:16px;padding:16px;display:flex;align-items:center;justify-content:space-between;">
                    <div>
                        <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#888;margin-bottom:2px;">Risk Rating</div>
                        <div style="font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;color:#0a0a0a;">Based on annualised volatility</div>
                    </div>
                    <div style="background:${riskColor}20;color:${riskColor};font-family:'DM Mono',monospace;font-size:13px;font-weight:700;padding:8px 16px;border-radius:100px;">${riskLabel}</div>
                </div>
            `;
            body.appendChild(riskWrap);

            // Disclaimer from edge function
            const disc = document.createElement('div');
            disc.style.cssText = 'font-family:"DM Sans",sans-serif;font-size:11px;color:#bbb;text-align:center;line-height:1.6;padding:16px 24px;';
            disc.innerHTML = '! ' + (data.disclaimer || 'Assumes daily rebalancing to target weights. Excludes transaction costs, taxes, and slippage — real returns will differ. Past performance is not indicative of future results. StockSwype does not provide financial advice.');
            body.appendChild(disc);

            // Draw charts after DOM settles
            requestAnimationFrame(() => {
                // Line chart
                const lineCtx = document.getElementById('pf-line-canvas');
                if (lineCtx) {
                    _pfLineChart = new Chart(lineCtx, {
                        type: 'line',
                        data: {
                            labels: chartLabels,
                            datasets: [
                                {
                                    label: 'Portfolio',
                                    data: data.portfolioCurve,
                                    borderColor: chartLineColor,
                                    backgroundColor: portfolioFillColor,
                                    borderWidth: 2.5,
                                    pointRadius: 0,
                                    pointHoverRadius: 5,
                                    pointHoverBackgroundColor: chartLineColor,
                                    pointHoverBorderColor: '#fff',
                                    pointHoverBorderWidth: 2,
                                    fill: true,
                                    tension: 0.4,
                                },
                                {
                                    label: 'S&P 500',
                                    data: data.spCurve,
                                    borderColor: '#aaa',
                                    backgroundColor: 'transparent',
                                    borderWidth: 1.5,
                                    borderDash: [4, 4],
                                    pointRadius: 0,
                                    pointHoverRadius: 4,
                                    pointHoverBackgroundColor: '#aaa',
                                    pointHoverBorderColor: '#fff',
                                    pointHoverBorderWidth: 2,
                                    fill: false,
                                    tension: 0.4,
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            interaction: {
                                mode: 'index',
                                intersect: false,
                            },
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    enabled: false,
                                    external: (context) => {
                                        const { tooltip } = context;
                                        if (!tooltip || tooltip.opacity === 0) return;
                                        const idx = tooltip.dataPoints?.[0]?.dataIndex;
                                        if (idx == null) return;
                                        const pfVal = data.portfolioCurve[idx];
                                        const spVal = data.spCurve[idx];
                                        const pfColor = pfVal >= 0 ? '#00C853' : '#E53935';
                                        const labelEl = document.getElementById('pf-hover-label');
                                        const pfEl = document.getElementById('pf-hover-portfolio');
                                        const bchEl = document.getElementById('pf-hover-bench');
                                        const swatchEl = document.getElementById('pf-hover-pf-swatch');
                                        if (labelEl) labelEl.textContent = MONTHS[new Date(data.dates[idx]).getUTCMonth()];
                                        if (pfEl) { pfEl.textContent = (pfVal >= 0 ? '+' : '') + pfVal.toFixed(1) + '%'; pfEl.style.color = pfColor; }
                                        if (bchEl) bchEl.textContent = (spVal >= 0 ? '+' : '') + spVal.toFixed(1) + '%';
                                        if (swatchEl) swatchEl.style.background = pfColor;
                                    }
                                },
                            },
                            scales: {
                                x: {
                                    grid: { display: false },
                                    ticks: { font: { size: 10 } }
                                },
                                y: {
                                    grid: { color: '#f0f0f0' },
                                    ticks: {
                                        font: { size: 10 },
                                        callback: v => (v >= 0 ? '+' : '') + v.toFixed(1) + '%'
                                    }
                                }
                            }
                        },
                        plugins: [{
                            id: 'pfResultsScrub',
                            beforeEvent(chart, args) {
                                if (args.event.type === 'mousedown' || args.event.type === 'touchstart') {
                                    _pfScrubAnchor = null;
                                }
                            },
                            afterEvent(chart, args) {
                                const e = args.event;
                                if (e.type === 'mouseout' || e.type === 'touchend') {
                                    const lastIdx = data.dates.length - 1;
                                    const defPf = data.portfolioCurve[lastIdx];
                                    const defSp = data.spCurve[lastIdx];
                                    const pfColor = defPf >= 0 ? '#00C853' : '#E53935';
                                    const labelEl = document.getElementById('pf-hover-label');
                                    const pfEl = document.getElementById('pf-hover-portfolio');
                                    const bchEl = document.getElementById('pf-hover-bench');
                                    const swatchEl = document.getElementById('pf-hover-pf-swatch');
                                    if (labelEl) labelEl.textContent = MONTHS[new Date(data.dates[lastIdx]).getUTCMonth()];
                                    if (pfEl) { pfEl.textContent = (defPf >= 0 ? '+' : '') + defPf.toFixed(1) + '%'; pfEl.style.color = pfColor; }
                                    if (bchEl) bchEl.textContent = (defSp >= 0 ? '+' : '') + defSp.toFixed(1) + '%';
                                    if (swatchEl) swatchEl.style.background = pfColor;
                                }
                            }
                        }, {
                            id: 'pfSp500Label',
                            afterDraw(chart) {
                                const { ctx, chartArea, scales } = chart;
                                const spData = chart.data.datasets[1]?.data;
                                if (!spData || !spData.length) return;
                                const lastVal = spData[spData.length - 1];
                                const y = scales.y.getPixelForValue(lastVal);
                                ctx.save();
                                ctx.fillStyle = '#aaa';
                                ctx.font = '600 9px DM Mono, monospace';
                                ctx.textAlign = 'right';
                                ctx.fillText('S&P 500', chartArea.right - 2, y - 5);
                                ctx.restore();
                            }
                        }]
                    });

                    // Set default hover readout to last data point
                    const lastIdx = data.dates.length - 1;
                    const defPf = data.portfolioCurve[lastIdx].toFixed(1);
                    const defBch = data.spCurve[lastIdx].toFixed(1);
                    const initPfColor = parseFloat(defPf) >= 0 ? '#00C853' : '#E53935';
                    const labelEl = document.getElementById('pf-hover-label');
                    const pfEl = document.getElementById('pf-hover-portfolio');
                    const bchEl = document.getElementById('pf-hover-bench');
                    const swatchEl = document.getElementById('pf-hover-pf-swatch');
                    if (labelEl) labelEl.textContent = MONTHS[new Date(data.dates[lastIdx]).getUTCMonth()];
                    if (pfEl) { pfEl.textContent = (defPf >= 0 ? '+' : '') + defPf + '%'; pfEl.style.color = initPfColor; }
                    if (bchEl) bchEl.textContent = (defBch >= 0 ? '+' : '') + defBch + '%';
                    if (swatchEl) swatchEl.style.background = initPfColor;
                }

                // Pie chart
                const pieCtx = document.getElementById('pf-pie-canvas');
                const palette = ['#00C853', '#00BFA5', '#69F0AE', '#1DE9B6', '#64FFDA', '#B9F6CA', '#CCFF90', '#F4FF81'];
                const pieData = tickers.map(t => _pfAllocs[t] || 0);
                if (pieCtx) {
                    _pfPieChart = new Chart(pieCtx, {
                        type: 'doughnut',
                        data: {
                            labels: tickers,
                            datasets: [{
                                data: pieData,
                                backgroundColor: tickers.map((_, i) => palette[i % palette.length]),
                                borderWidth: 0,
                            }]
                        },
                        options: {
                            responsive: true,
                            cutout: '60%',
                            plugins: { legend: { display: false } }
                        }
                    });
                }

                // Legend
                const legend = document.getElementById('pf-pie-legend');
                if (legend) {
                    tickers.forEach((t, i) => {
                        const item = document.createElement('div');
                        item.style.cssText = 'display:flex;align-items:center;gap:8px;';
                        item.innerHTML = `
                            <div style="width:10px;height:10px;border-radius:3px;background:${palette[i % palette.length]};flex-shrink:0;"></div>
                            <span style="font-family:'DM Mono',monospace;font-size:12px;font-weight:600;color:#0a0a0a;">${t}</span>
                            <span style="font-family:'DM Sans',sans-serif;font-size:12px;color:#888;margin-left:auto;">${_pfAllocs[t] || 0}%</span>
                        `;
                        legend.appendChild(item);
                    });
                }
            });
        }

        async function savePfPortfolio() {
            if (isGuest) { showToast('Sign in to save portfolios.'); return; }
            const tickers = [..._pfSelected];
            const entry = {
                user_id:        currentUser.id,
                tickers,
                allocs:         Object.assign({}, _pfAllocs),
                name:           null,
                date:           new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                total_return:   _lastPfAnalysis?.stats?.totalReturn    ?? 0,
                ann_return:     _lastPfAnalysis?.stats?.annualisedReturn ?? 0,
                volatility:     _lastPfAnalysis?.stats?.volatility     ?? 0,
                alpha:          _lastPfAnalysis?.stats?.alpha          ?? 0,
                sharpe:         _lastPfAnalysis?.stats?.sharpe         ?? 0,
                sortino:        _lastPfAnalysis?.stats?.sortino        ?? 0,
                max_drawdown:   _lastPfAnalysis?.stats?.maxDrawdown    ?? 0,
                chart_dates:    _lastPfAnalysis?.dates                 ?? [],
                portfolio_curve: _lastPfAnalysis?.portfolioCurve      ?? [],
                sp_curve:       _lastPfAnalysis?.spCurve               ?? [],
                disclaimer:     _lastPfAnalysis?.disclaimer            ?? '',
            };

            const btn = document.querySelector('#pf-save-btn-wrap button');
            if (btn) { btn.textContent = 'Saving…'; btn.disabled = true; }

            const { data: saved, error } = await supabaseClient
                .from('saved_portfolios')
                .insert(entry)
                .select()
                .single();

            if (error) {
                if (btn) { btn.textContent = 'Save Portfolio'; btn.disabled = false; }
                showToast('Could not save portfolio. Please try again.');
                return;
            }

            // Normalise db row to local format
            _savedPortfolios.unshift(_dbRowToLocal(saved));
            const badge = document.getElementById('pf-saved-badge');
            if (badge) { badge.textContent = _savedPortfolios.length; badge.style.display = 'block'; }
            if (btn) { btn.textContent = 'Saved ✓'; btn.style.color = '#aaa'; btn.style.border = '2px solid #e0e0e0'; btn.style.boxShadow = 'none'; }
            showToast('Portfolio saved!');

            setTimeout(() => {
                _pfSelected.clear();
                _pfAllocs = {};
                _pfSharpeCache = null;
                openPfHub();
                const hub = document.getElementById('pf-hub');
                if (hub) {
                    hub.style.animation = 'none';
                    void hub.offsetWidth;
                    hub.style.animation = 'pfSlideHome 0.2s linear forwards';
                }
            }, 800);
        }

        // Convert a Supabase db row to the local portfolio object shape
        function _dbRowToLocal(row) {
            return {
                id:             row.id,
                tickers:        row.tickers,
                allocs:         row.allocs,
                name:           row.name,
                date:           row.date,
                totalReturn:    row.total_return,
                annReturn:      row.ann_return,
                volatility:     row.volatility,
                alpha:          row.alpha,
                sharpe:         row.sharpe,
                sortino:        row.sortino,
                maxDrawdown:    row.max_drawdown,
                chartDates:     row.chart_dates    || [],
                portfolioCurve: row.portfolio_curve || [],
                spCurve:        row.sp_curve        || [],
                disclaimer:     row.disclaimer      || '',
            };
        }

        async function openPfSaved() {
            pfShowStep('pf-saved');
            const list = document.getElementById('pf-saved-list');
            if (!list) return;

            if (isGuest || !currentUser) {
                list.innerHTML = `<div style="text-align:center;padding:48px 0;font-family:'DM Sans',sans-serif;color:#aaa;font-size:14px;">Sign in to view saved portfolios.</div>`;
                return;
            }

            list.innerHTML = `<div style="text-align:center;padding:48px 0;font-family:'DM Sans',sans-serif;color:#aaa;font-size:14px;">Loading…</div>`;

            const { data: rows, error } = await supabaseClient
                .from('saved_portfolios')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });

            if (error) {
                list.innerHTML = `<div style="text-align:center;padding:48px 0;font-family:'DM Sans',sans-serif;color:#aaa;font-size:14px;">Could not load portfolios.</div>`;
                return;
            }

            _savedPortfolios = (rows || []).map(_dbRowToLocal);

            const badge = document.getElementById('pf-saved-badge');
            if (badge) {
                badge.textContent = _savedPortfolios.length;
                badge.style.display = _savedPortfolios.length > 0 ? 'block' : 'none';
            }

            list.innerHTML = '';
            if (_savedPortfolios.length === 0) {
                list.innerHTML = `<div style="text-align:center;padding:48px 0;font-family:'DM Sans',sans-serif;color:#aaa;font-size:14px;">No saved portfolios yet.<br>Build and save your first one!</div>`;
                return;
            }
            _savedPortfolios.forEach(pf => {
                const item = document.createElement('div');
                item.style.cssText = 'background:#f8f8f8;border-radius:16px;padding:16px;cursor:pointer;transition:transform 0.12s ease;';
                item.addEventListener('pointerdown', () => item.style.transform = 'scale(0.98)');
                item.addEventListener('pointerup', () => item.style.transform = '');
                item.addEventListener('pointerleave', () => item.style.transform = '');
                item.onclick = () => viewSavedPortfolio(pf.id);

                // Header: name + pencil + date
                const headerRow = document.createElement('div');
                headerRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:12px;';

                const nameDiv = document.createElement('div');
                nameDiv.style.cssText = 'font-family:"DM Mono",monospace;font-size:12px;font-weight:700;color:#0a0a0a;line-height:1.4;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
                nameDiv.textContent = pf.name || pf.tickers.join(' · ');

                const pencil = document.createElement('div');
                pencil.style.cssText = 'cursor:pointer;color:#ccc;padding:3px;flex-shrink:0;line-height:1;border-radius:6px;transition:color 0.15s;';
                pencil.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
                pencil.addEventListener('mouseenter', () => pencil.style.color = '#00C853');
                pencil.addEventListener('mouseleave', () => pencil.style.color = '#ccc');
                pencil.onclick = (e) => { e.stopPropagation(); renameSavedPortfolio(pf.id, nameDiv); };

                const plane = document.createElement('div');
                plane.title = 'Send to a friend';
                plane.style.cssText = 'cursor:pointer;color:#ccc;padding:3px;flex-shrink:0;line-height:1;border-radius:6px;transition:color 0.15s;';
                plane.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;
                plane.addEventListener('mouseenter', () => plane.style.color = '#00C853');
                plane.addEventListener('mouseleave', () => plane.style.color = '#ccc');
                plane.onclick = (e) => { e.stopPropagation(); openPortfolioShareModal(pf.id); };

                const dateDiv = document.createElement('div');
                dateDiv.style.cssText = 'font-family:"DM Sans",sans-serif;font-size:11px;color:#aaa;flex-shrink:0;';
                dateDiv.textContent = pf.date;

                const trash = document.createElement('div');
                trash.title = 'Delete portfolio';
                trash.style.cssText = 'cursor:pointer;color:#ccc;padding:3px;flex-shrink:0;line-height:1;border-radius:6px;transition:color 0.15s;';
                trash.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;
                trash.addEventListener('mouseenter', () => trash.style.color = '#E53935');
                trash.addEventListener('mouseleave', () => trash.style.color = '#ccc');
                trash.onclick = (e) => { e.stopPropagation(); deleteSavedPortfolio(pf.id, item); };

                headerRow.appendChild(nameDiv);
                headerRow.appendChild(pencil);
                headerRow.appendChild(plane);
                headerRow.appendChild(trash);
                headerRow.appendChild(dateDiv);

                // Metrics
                const _retC  = (pf.totalReturn || 0) >= 0 ? '#00C853' : '#E53935';
                const _alpC  = (pf.alpha || 0) >= 0 ? '#00C853' : '#E53935';
                const _vol   = pf.volatility || 0;
                const _volC  = _vol < 20 ? '#888' : _vol < 40 ? '#F59E0B' : _vol < 60 ? '#FF6600' : '#E53935';
                const _retStr = `${(pf.totalReturn || 0) >= 0 ? '+' : ''}${pf.totalReturn}%`;
                const _alpStr = `${(pf.alpha || 0) >= 0 ? '+' : ''}${pf.alpha}%`;
                const metricsDiv = document.createElement('div');
                metricsDiv.innerHTML = `
                    <div style="display:flex;gap:8px;">
                        <div style="flex:1;text-align:center;background:#fff;border-radius:10px;padding:10px 4px;">
                            <div style="font-family:'DM Mono',monospace;font-size:15px;font-weight:700;color:${_retC};">${_retStr}</div>
                            <div style="font-family:'DM Sans',sans-serif;font-size:10px;color:#aaa;margin-top:3px;">Return</div>
                        </div>
                        <div style="flex:1;text-align:center;background:#fff;border-radius:10px;padding:10px 4px;">
                            <div style="font-family:'DM Mono',monospace;font-size:15px;font-weight:700;color:${_volC};">${pf.volatility}%</div>
                            <div style="font-family:'DM Sans',sans-serif;font-size:10px;color:#aaa;margin-top:3px;">Volatility</div>
                        </div>
                        <div style="flex:1;text-align:center;background:#fff;border-radius:10px;padding:10px 4px;">
                            <div style="font-family:'DM Mono',monospace;font-size:15px;font-weight:700;color:${_alpC};">${_alpStr}</div>
                            <div style="font-family:'DM Sans',sans-serif;font-size:10px;color:#aaa;margin-top:3px;">Alpha</div>
                        </div>
                    </div>`;

                const tradeBtn = document.createElement('button');
                tradeBtn.className = 'ws-trade-btn';
                tradeBtn.textContent = 'Trade on Wealthsimple';
                tradeBtn.style.marginTop = '12px';
                tradeBtn.onclick = (e) => { e.stopPropagation(); tradeOnWealthsimple(null, e); };

                const tradeDisclaimer = document.createElement('div');
                tradeDisclaimer.style.cssText = 'font-family:"DM Sans",sans-serif;font-size:11px;color:#999;text-align:center;margin-top:6px;pointer-events:none;';
                tradeDisclaimer.textContent = 'Availability may vary based on equity.';

                item.appendChild(headerRow);
                item.appendChild(metricsDiv);
                item.appendChild(tradeBtn);
                item.appendChild(tradeDisclaimer);
                list.appendChild(item);
            });
        }

        function renameSavedPortfolio(id, nameDiv) {
            const pf = _savedPortfolios.find(p => p.id === id);
            if (!pf) return;
            const currentName = pf.name || pf.tickers.join(' · ');
            const input = document.createElement('input');
            input.type = 'text';
            input.value = currentName;
            input.style.cssText = 'font-family:"DM Mono",monospace;font-size:12px;font-weight:700;color:#0a0a0a;background:transparent;border:none;border-bottom:1.5px solid #00C853;outline:none;width:100%;padding:2px 0;';
            nameDiv.replaceWith(input);
            input.focus();
            input.select();
            let committed = false;
            const commit = async () => {
                if (committed) return;
                committed = true;
                const newName = input.value.trim() || currentName;
                pf.name = newName;
                if (!isGuest && currentUser) {
                    await supabaseClient
                        .from('saved_portfolios')
                        .update({ name: newName })
                        .eq('id', pf.id)
                        .eq('user_id', currentUser.id);
                }
                openPfSaved();
            };
            input.addEventListener('blur', commit);
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
                if (e.key === 'Escape') { input.value = currentName; input.blur(); }
            });
        }

        async function deleteSavedPortfolio(id, itemEl) {
            if (!currentUser) return;
            // Fade out the card immediately for snappy feel
            itemEl.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            itemEl.style.opacity = '0';
            itemEl.style.transform = 'scale(0.95)';
            const { error } = await supabaseClient
                .from('saved_portfolios')
                .delete()
                .eq('id', id)
                .eq('user_id', currentUser.id);
            if (error) {
                itemEl.style.opacity = '1';
                itemEl.style.transform = '';
                showToast('Could not delete portfolio. Please try again.');
                return;
            }
            _savedPortfolios = _savedPortfolios.filter(p => p.id !== id);
            const badge = document.getElementById('pf-saved-badge');
            if (badge) {
                badge.textContent = _savedPortfolios.length;
                badge.style.display = _savedPortfolios.length > 0 ? 'block' : 'none';
            }
            setTimeout(() => {
                itemEl.remove();
                const list = document.getElementById('pf-saved-list');
                if (list && _savedPortfolios.length === 0) {
                    list.innerHTML = `<div style="text-align:center;padding:48px 0;font-family:'DM Sans',sans-serif;color:#aaa;font-size:14px;">No saved portfolios yet.<br>Build and save your first one!</div>`;
                }
            }, 200);
        }

        function openPortfolioShareModal(pfId) {
            const pf = _savedPortfolios.find(p => p.id === pfId);
            if (!pf) return;
            _currentSharePortfolioId = pfId;
            _currentShareTicker = null;
            _currentShareArticle = null;
            const titleEl = document.getElementById('share-modal-title');
            if (titleEl) titleEl.textContent = `Send "${pf.name || pf.tickers.join(' · ')}" to...`;
            openShareModal(null);
            loadShareFriends();
        }

        async function sendPortfolioMessage(recipientId, recipientUsername, rowEl) {
            if (!currentUser) { showToast('Sign in to share.'); return; }
            const pf = _savedPortfolios.find(p => p.id === _currentSharePortfolioId);
            if (!pf) return;
            const pfTicker = pf.tickers.slice(0, 3).join(',');
            try {
                // Duplicate check: same portfolio ticker key already sent to this recipient
                const { data: existing } = await supabaseClient
                    .from('messages')
                    .select('id')
                    .eq('sender_id', currentUser.id)
                    .eq('recipient_id', recipientId)
                    .eq('ticker', pfTicker)
                    .maybeSingle();
                if (existing) {
                    showToast("Your friend got it the first time. Don't be 'that' guy.");
                    if (rowEl) {
                        rowEl.classList.remove('share-row-shake');
                        void rowEl.offsetWidth;
                        rowEl.classList.add('share-row-shake');
                        rowEl.addEventListener('animationend', () => rowEl.classList.remove('share-row-shake'), { once: true });
                    }
                    return;
                }
                const payload = JSON.stringify({
                    type: 'portfolio_share',
                    name: pf.name || pf.tickers.join(' · '),
                    tickers: pf.tickers,
                    allocs: pf.allocs || {},
                    totalReturn:    pf.totalReturn,
                    annReturn:      pf.annReturn,
                    volatility:     pf.volatility,
                    alpha:          pf.alpha,
                    sharpe:         pf.sharpe,
                    sortino:        pf.sortino,
                    maxDrawdown:    pf.maxDrawdown,
                    chartDates:     pf.chartDates     || [],
                    portfolioCurve: pf.portfolioCurve || [],
                    spCurve:        pf.spCurve        || [],
                    disclaimer:     pf.disclaimer     || '',
                });
                await supabaseClient.from('messages').insert({
                    sender_id: currentUser.id,
                    recipient_id: recipientId,
                    ticker: pfTicker,
                    message: payload,
                    read: false
                });
                _currentSharePortfolioId = null;
                closeShareModal();
                showToast(`Portfolio sent to @${recipientUsername}!`);
                updateMessagesBadge();
            } catch (e) {
                showToast('Could not send. Try again.');
            }
        }

        function viewSavedPortfolio(id) {
            const pf = _savedPortfolios.find(p => p.id === id);
            if (!pf) return;
            pfShowStep('pf-saved-detail');
            // Bubbly spring animation
            const detailEl = document.getElementById('pf-saved-detail');
            if (detailEl) {
                detailEl.style.animation = 'none';
                void detailEl.offsetWidth;
                detailEl.style.animation = 'pfDetailPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards';
            }
            document.getElementById('pf-sd-name').textContent = pf.name || pf.tickers.join(' · ');
            document.getElementById('pf-sd-tickers').textContent = pf.tickers.join(' · ');
            document.getElementById('pf-sd-date').textContent = pf.date;
            const body = document.getElementById('pf-sd-body');
            body.innerHTML = '';
            _pfRenderDetailBody(body, pf);
        }

        function _pfRenderDetailBody(body, pf) {
            const tickers = pf.tickers;
            const allocs = pf.allocs || {};
            const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const totalReturn  = pf.totalReturn  || 0;
            const annReturn    = pf.annReturn    || 0;
            const volatility   = pf.volatility   || 0;
            const alpha        = pf.alpha        || 0;
            const sharpe       = pf.sharpe       || 0;
            const sortino      = pf.sortino      || 0;
            const maxDrawdown  = pf.maxDrawdown  || 0;
            const riskLabel    = volatility < 20 ? 'Low' : volatility < 40 ? 'Medium' : volatility < 60 ? 'High' : 'Very High';
            const volColor     = volatility < 20 ? '#888' : volatility < 40 ? '#F59E0B' : volatility < 60 ? '#FF6600' : '#E53935';
            const riskColor    = volColor;
            const retColor     = totalReturn >= 0 ? '#00C853' : '#E53935';
            const annRetColor  = annReturn >= 0 ? '#00C853' : '#E53935';
            const alphaColor   = alpha >= 0 ? '#00C853' : '#E53935';
            const sharpeColor  = sharpe > 1 ? '#00C853' : sharpe >= 0 ? '#FF9800' : '#E53935';
            const sortinoColor = sortino > 1 ? '#00C853' : sortino >= 0 ? '#FF9800' : '#E53935';
            const chartLineColor = totalReturn >= 0 ? '#00C853' : '#E53935';
            // Build chart data from stored real data, or empty placeholder
            const hasCurve = pf.chartDates && pf.chartDates.length > 1;
            const chartLabels = hasCurve ? pf.chartDates.map((d, i) => {
                if (i === 0 || i % 30 === 0 || i === pf.chartDates.length - 1) return MONTHS[new Date(d).getUTCMonth()];
                return '';
            }) : [];
            const portfolioCurve = hasCurve ? pf.portfolioCurve : [];
            const spCurve = hasCurve ? pf.spCurve : [];

            // Line chart
            const lineWrap = document.createElement('div');
            lineWrap.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                    <div>
                        <div style="font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;color:#0a0a0a;">Cumulative Return</div>
                        <div style="font-family:'DM Sans',sans-serif;font-size:11px;color:#aaa;margin-top:1px;">1-year historical · not a forecast</div>
                    </div>
                    <div id="pf-sd-chart-hover" style="text-align:right;">
                        <div id="pf-sd-hover-label" style="font-family:'DM Mono',monospace;font-size:11px;color:#aaa;"></div>
                        <div style="display:flex;align-items:center;gap:10px;justify-content:flex-end;margin-top:2px;">
                            <span style="display:flex;align-items:center;gap:4px;"><span id="pf-sd-hover-pf-swatch" style="width:8px;height:8px;border-radius:2px;background:#00C853;display:inline-block;"></span><span id="pf-sd-hover-portfolio" style="font-family:'DM Mono',monospace;font-size:12px;color:#00C853;font-weight:700;"></span></span>
                            <span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:2px;background:#aaa;display:inline-block;"></span><span id="pf-sd-hover-bench" style="font-family:'DM Mono',monospace;font-size:12px;color:#888;font-weight:600;"></span></span>
                        </div>
                    </div>
                </div>
                ${hasCurve ? '<div style="background:#f8f8f8;border-radius:16px;padding:16px;"><canvas id="pf-sd-line-canvas" height="180"></canvas></div>' : '<div style="background:#f8f8f8;border-radius:16px;padding:24px;text-align:center;font-family:\'DM Sans\',sans-serif;font-size:13px;color:#aaa;">No chart data available</div>'}`;
            body.appendChild(lineWrap);

            // Pie chart
            const pieWrap = document.createElement('div');
            pieWrap.innerHTML = `
                <div style="font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;color:#0a0a0a;margin-bottom:12px;">Allocation</div>
                <div style="background:#f8f8f8;border-radius:16px;padding:16px;display:flex;align-items:center;gap:16px;">
                    <div style="width:140px;height:140px;flex-shrink:0;"><canvas id="pf-sd-pie-canvas"></canvas></div>
                    <div id="pf-sd-pie-legend" style="display:flex;flex-direction:column;gap:8px;flex:1;"></div>
                </div>`;
            body.appendChild(pieWrap);

            // Stats grid
            const statsWrap = document.createElement('div');
            statsWrap.innerHTML = `
                <div style="font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;color:#0a0a0a;margin-bottom:12px;">Performance (1-year backtest)</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <div class="pf-stat-card"><div class="pf-stat-val" style="color:${retColor};">${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(1)}%</div><div class="pf-stat-lbl">Total Return</div></div>
                    <div class="pf-stat-card"><div class="pf-stat-val" style="color:${annRetColor};">${annReturn >= 0 ? '+' : ''}${annReturn.toFixed(1)}%</div><div class="pf-stat-lbl">Annualised</div></div>
                    <div class="pf-stat-card"><div class="pf-stat-val" style="color:${alphaColor};">${alpha >= 0 ? '+' : ''}${typeof alpha === 'number' ? alpha.toFixed(1) : alpha}%</div><div class="pf-stat-lbl">Alpha vs S&amp;P 500</div></div>
                    <div class="pf-stat-card"><div class="pf-stat-val" style="color:${volColor};">${volatility.toFixed(1)}%</div><div class="pf-stat-lbl">Volatility</div></div>
                </div>`;
            body.appendChild(statsWrap);

            // Risk metrics
            const riskMetrics = document.createElement('div');
            riskMetrics.innerHTML = `
                <div style="font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;color:#0a0a0a;margin-bottom:12px;">Risk Metrics</div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
                    <div class="pf-risk-card"><div class="pf-stat-val" style="font-size:22px;color:${sharpeColor};">${sharpe}</div><div class="pf-risk-card-lbl"><span style="font-family:'DM Sans',sans-serif;font-size:11px;color:#aaa;">Sharpe</span></div></div>
                    <div class="pf-risk-card"><div class="pf-stat-val" style="font-size:22px;color:${sortinoColor};">${sortino}</div><div class="pf-risk-card-lbl"><span style="font-family:'DM Sans',sans-serif;font-size:11px;color:#aaa;">Sortino</span></div></div>
                    <div class="pf-risk-card"><div class="pf-stat-val" style="font-size:22px;color:#E53935;">${maxDrawdown.toFixed(1)}%</div><div class="pf-risk-card-lbl"><span style="font-family:'DM Sans',sans-serif;font-size:11px;color:#aaa;">Max DD</span></div></div>
                </div>`;
            body.appendChild(riskMetrics);

            // Risk badge
            const riskWrap = document.createElement('div');
            riskWrap.innerHTML = `
                <div style="background:#f8f8f8;border-radius:16px;padding:16px;display:flex;align-items:center;justify-content:space-between;">
                    <div><div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#888;margin-bottom:2px;">Risk Rating</div><div style="font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;color:#0a0a0a;">Based on annualised volatility</div></div>
                    <div style="background:${riskColor}20;color:${riskColor};font-family:'DM Mono',monospace;font-size:13px;font-weight:700;padding:8px 16px;border-radius:100px;">${riskLabel}</div>
                </div>`;
            body.appendChild(riskWrap);

            // Disclaimer
            const disc = document.createElement('div');
            disc.style.cssText = 'font-family:"DM Sans",sans-serif;font-size:11px;color:#bbb;text-align:center;line-height:1.6;padding:16px 24px;';
            disc.innerHTML = '! ' + (pf.disclaimer || 'Assumes daily rebalancing to target weights. Excludes transaction costs, taxes, and slippage — real returns will differ. Past performance is not indicative of future results. StockSwype does not provide financial advice.');
            body.appendChild(disc);

            // Draw charts
            const palette = ['#00C853', '#2979FF', '#FF6D00', '#AA00FF', '#D50000', '#00B0FF', '#FFD600', '#64DD17'];
            requestAnimationFrame(() => {
                if (hasCurve) {
                    const lineCtx = document.getElementById('pf-sd-line-canvas');
                    if (lineCtx) {
                        let _pfSdScrubAnchor = null;
                        const sdLastIdx = portfolioCurve.length - 1;
                        _pfSDLineChart = new Chart(lineCtx, {
                            type: 'line',
                            data: {
                                labels: chartLabels,
                                datasets: [
                                    { label: 'Portfolio', data: portfolioCurve, borderColor: chartLineColor, backgroundColor: portfolioFillColor, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: chartLineColor, pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2, fill: true, tension: 0.4 },
                                    { label: 'S&P 500', data: spCurve, borderColor: '#aaa', backgroundColor: 'transparent', borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 4, pointHoverBackgroundColor: '#aaa', pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2, borderDash: [4, 4], tension: 0.4 }
                                ]
                            },
                            options: {
                                responsive: true,
                                interaction: { mode: 'index', intersect: false },
                                plugins: {
                                    legend: { display: false },
                                    tooltip: {
                                        enabled: false,
                                        external: (context) => {
                                            const { tooltip } = context;
                                            if (!tooltip || tooltip.opacity === 0) return;
                                            const idx = tooltip.dataPoints?.[0]?.dataIndex;
                                            if (idx == null) return;
                                            const pfVal = portfolioCurve[idx];
                                            const spVal = spCurve[idx];
                                            const pfColor = pfVal >= 0 ? '#00C853' : '#E53935';
                                            const labelEl = document.getElementById('pf-sd-hover-label');
                                            const pfEl = document.getElementById('pf-sd-hover-portfolio');
                                            const bchEl = document.getElementById('pf-sd-hover-bench');
                                            const swatchEl = document.getElementById('pf-sd-hover-pf-swatch');
                                            if (labelEl) labelEl.textContent = MONTHS[new Date(pf.chartDates[idx]).getUTCMonth()];
                                            if (pfEl) { pfEl.textContent = (pfVal >= 0 ? '+' : '') + pfVal.toFixed(1) + '%'; pfEl.style.color = pfColor; }
                                            if (bchEl) bchEl.textContent = (spVal >= 0 ? '+' : '') + spVal.toFixed(1) + '%';
                                            if (swatchEl) swatchEl.style.background = pfColor;
                                        }
                                    }
                                },
                                scales: {
                                    x: { grid: { display: false }, ticks: { font: { family: 'DM Mono', size: 10 }, color: '#aaa' } },
                                    y: { grid: { color: '#f0f0f0' }, ticks: { font: { family: 'DM Mono', size: 10 }, color: '#aaa', callback: v => (v >= 0 ? '+' : '') + v.toFixed(1) + '%' } }
                                }
                            },
                            plugins: [{
                                id: 'pfSdScrub',
                                beforeEvent(chart, args) {
                                    if (args.event.type === 'mousedown' || args.event.type === 'touchstart') {
                                        _pfSdScrubAnchor = null;
                                    }
                                },
                                afterEvent(chart, args) {
                                    const e = args.event;
                                    if (e.type === 'mouseout' || e.type === 'touchend') {
                                        _pfSdScrubAnchor = null;
                                        const defPf = portfolioCurve[sdLastIdx];
                                        const defSp = spCurve[sdLastIdx];
                                        const pfColor = defPf >= 0 ? '#00C853' : '#E53935';
                                        const labelEl = document.getElementById('pf-sd-hover-label');
                                        const pfEl = document.getElementById('pf-sd-hover-portfolio');
                                        const bchEl = document.getElementById('pf-sd-hover-bench');
                                        const swatchEl = document.getElementById('pf-sd-hover-pf-swatch');
                                        if (labelEl) labelEl.textContent = MONTHS[new Date(pf.chartDates[sdLastIdx]).getUTCMonth()];
                                        if (pfEl) { pfEl.textContent = (defPf >= 0 ? '+' : '') + defPf.toFixed(1) + '%'; pfEl.style.color = pfColor; }
                                        if (bchEl) bchEl.textContent = (defSp >= 0 ? '+' : '') + defSp.toFixed(1) + '%';
                                        if (swatchEl) swatchEl.style.background = pfColor;
                                    }
                                }
                            }, {
                                id: 'pfSdSp500Label',
                                afterDraw(chart) {
                                    const { ctx, chartArea, scales } = chart;
                                    const spData = chart.data.datasets[1]?.data;
                                    if (!spData || !spData.length) return;
                                    const lastVal = spData[spData.length - 1];
                                    const y = scales.y.getPixelForValue(lastVal);
                                    ctx.save();
                                    ctx.fillStyle = '#aaa';
                                    ctx.font = '600 9px DM Mono, monospace';
                                    ctx.textAlign = 'right';
                                    ctx.fillText('S&P 500', chartArea.right - 2, y - 5);
                                    ctx.restore();
                                }
                            }]
                        });
                        // Set default readout to last data point
                        const sdInitPfColor = portfolioCurve[sdLastIdx] >= 0 ? '#00C853' : '#E53935';
                        const labelEl = document.getElementById('pf-sd-hover-label');
                        const pfEl = document.getElementById('pf-sd-hover-portfolio');
                        const bchEl = document.getElementById('pf-sd-hover-bench');
                        const swatchEl = document.getElementById('pf-sd-hover-pf-swatch');
                        if (labelEl) labelEl.textContent = MONTHS[new Date(pf.chartDates[sdLastIdx]).getUTCMonth()];
                        if (pfEl) { pfEl.textContent = (portfolioCurve[sdLastIdx] >= 0 ? '+' : '') + portfolioCurve[sdLastIdx].toFixed(1) + '%'; pfEl.style.color = sdInitPfColor; }
                        if (bchEl) bchEl.textContent = (spCurve[sdLastIdx] >= 0 ? '+' : '') + spCurve[sdLastIdx].toFixed(1) + '%';
                        if (swatchEl) swatchEl.style.background = sdInitPfColor;
                    }
                }
                const pieCtx = document.getElementById('pf-sd-pie-canvas');
                const pieData = tickers.map(t => allocs[t] || Math.floor(100 / tickers.length));
                if (pieCtx) {
                    _pfSDPieChart = new Chart(pieCtx, {
                        type: 'doughnut',
                        data: { labels: tickers, datasets: [{ data: pieData, backgroundColor: tickers.map((_, i) => palette[i % palette.length]), borderWidth: 0 }] },
                        options: { responsive: true, cutout: '60%', plugins: { legend: { display: false } } }
                    });
                }
                const legend = document.getElementById('pf-sd-pie-legend');
                if (legend) {
                    tickers.forEach((t, i) => {
                        const row = document.createElement('div');
                        row.style.cssText = 'display:flex;align-items:center;gap:8px;';
                        row.innerHTML = `<div style="width:10px;height:10px;border-radius:3px;background:${palette[i % palette.length]};flex-shrink:0;"></div><span style="font-family:'DM Mono',monospace;font-size:12px;font-weight:600;color:#0a0a0a;">${t}</span><span style="font-family:'DM Sans',sans-serif;font-size:12px;color:#888;margin-left:auto;">${allocs[t] || Math.floor(100 / tickers.length)}%</span>`;
                        legend.appendChild(row);
                    });
                }
            });
        }

        // --- Shared Portfolio View ---
        let _pfSharedLineChart = null;
        let _pfSharedPieChart = null;

        function openSharedPortfolio(pfData, senderUsername) {
            const screen = document.getElementById('pf-shared-screen');
            if (!screen) return;
            // Populate header
            document.getElementById('pf-shared-name').textContent = pfData.name || pfData.tickers.join(' · ');
            document.getElementById('pf-shared-tickers').textContent = pfData.tickers.join(' · ');
            document.getElementById('pf-shared-badge').textContent = `Viewing @${senderUsername}'s Portfolio`;
            // Destroy stale charts
            if (_pfSharedLineChart) { _pfSharedLineChart.destroy(); _pfSharedLineChart = null; }
            if (_pfSharedPieChart) { _pfSharedPieChart.destroy(); _pfSharedPieChart = null; }
            // Clear and render body
            const body = document.getElementById('pf-shared-body');
            body.innerHTML = '';
            _pfRenderSharedBody(body, pfData);
            // Slide in
            screen.style.display = 'flex';
            requestAnimationFrame(() => requestAnimationFrame(() => screen.classList.add('active')));
        }

        function closePfShared() {
            const screen = document.getElementById('pf-shared-screen');
            if (!screen) return;
            screen.classList.remove('active');
            setTimeout(() => { screen.style.display = 'none'; }, 400);
        }

        function _pfRenderSharedBody(body, pf) {
            const tickers = pf.tickers || [];
            const allocs = pf.allocs || {};
            const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const totalReturn  = pf.totalReturn  || 0;
            const annReturn    = pf.annReturn    || 0;
            const volatility   = pf.volatility   || 0;
            const alpha        = pf.alpha        || 0;
            const sharpe       = pf.sharpe       || 0;
            const sortino      = pf.sortino      || 0;
            const maxDrawdown  = pf.maxDrawdown  || 0;
            const riskLabel    = volatility < 20 ? 'Low' : volatility < 40 ? 'Medium' : volatility < 60 ? 'High' : 'Very High';
            const volColor     = volatility < 20 ? '#888' : volatility < 40 ? '#F59E0B' : volatility < 60 ? '#FF6600' : '#E53935';
            const riskColor    = volColor;
            const retColor     = totalReturn >= 0 ? '#00C853' : '#E53935';
            const annRetColor  = annReturn >= 0 ? '#00C853' : '#E53935';
            const alphaColor   = alpha >= 0 ? '#00C853' : '#E53935';
            const sharpeColor  = sharpe > 1 ? '#00C853' : sharpe >= 0 ? '#FF9800' : '#E53935';
            const sortinoColor = sortino > 1 ? '#00C853' : sortino >= 0 ? '#FF9800' : '#E53935';
            const chartLineColor = totalReturn >= 0 ? '#00C853' : '#E53935';            const palette = ['#00C853', '#2979FF', '#FF6D00', '#AA00FF', '#D50000', '#00B0FF', '#FFD600', '#64DD17'];

            const hasCurve = pf.chartDates && pf.chartDates.length > 1;
            const chartLabels = hasCurve ? pf.chartDates.map((d, i) => {
                if (i === 0 || i % 30 === 0 || i === pf.chartDates.length - 1) return MONTHS[new Date(d).getUTCMonth()];
                return '';
            }) : [];
            const portfolioCurve = hasCurve ? pf.portfolioCurve : [];
            const spCurve = hasCurve ? pf.spCurve : [];

            // Line chart
            const lineWrap = document.createElement('div');
            lineWrap.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                    <div>
                        <div style="font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;color:#0a0a0a;">Cumulative Return</div>
                        <div style="font-family:'DM Sans',sans-serif;font-size:11px;color:#aaa;margin-top:1px;">1-year historical · not a forecast</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:2px;background:#00C853;display:inline-block;"></span><span style="font-family:'DM Mono',monospace;font-size:11px;color:#00C853;font-weight:700;">Portfolio</span></span>
                        <span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:2px;background:#aaa;display:inline-block;"></span><span style="font-family:'DM Mono',monospace;font-size:11px;color:#888;font-weight:600;">S&P 500</span></span>
                    </div>
                </div>
                ${hasCurve ? '<div style="background:#f8f8f8;border-radius:16px;padding:16px;"><canvas id="pf-sh-line-canvas" height="180"></canvas></div>' : '<div style="background:#f8f8f8;border-radius:16px;padding:24px;text-align:center;font-family:\'DM Sans\',sans-serif;font-size:13px;color:#aaa;">No chart data available</div>'}`;
            body.appendChild(lineWrap);

            // Pie chart
            const pieWrap = document.createElement('div');
            pieWrap.innerHTML = `
                <div style="font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;color:#0a0a0a;margin-bottom:12px;">Allocation</div>
                <div style="background:#f8f8f8;border-radius:16px;padding:16px;display:flex;align-items:center;gap:16px;">
                    <div style="width:140px;height:140px;flex-shrink:0;"><canvas id="pf-sh-pie-canvas"></canvas></div>
                    <div id="pf-sh-pie-legend" style="display:flex;flex-direction:column;gap:8px;flex:1;"></div>
                </div>`;
            body.appendChild(pieWrap);

            // Stats grid
            const statsWrap = document.createElement('div');
            statsWrap.innerHTML = `
                <div style="font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;color:#0a0a0a;margin-bottom:12px;">Performance (1-year backtest)</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <div class="pf-stat-card"><div class="pf-stat-val" style="color:${retColor};">${totalReturn >= 0 ? '+' : ''}${typeof totalReturn === 'number' ? totalReturn.toFixed(1) : totalReturn}%</div><div class="pf-stat-lbl">Total Return</div></div>
                    <div class="pf-stat-card"><div class="pf-stat-val" style="color:${annRetColor};">${annReturn >= 0 ? '+' : ''}${typeof annReturn === 'number' ? annReturn.toFixed(1) : annReturn}%</div><div class="pf-stat-lbl">Annualised</div></div>
                    <div class="pf-stat-card"><div class="pf-stat-val" style="color:${alphaColor};">${alpha >= 0 ? '+' : ''}${typeof alpha === 'number' ? alpha.toFixed(1) : alpha}%</div><div class="pf-stat-lbl">Alpha vs S&amp;P 500</div></div>
                    <div class="pf-stat-card"><div class="pf-stat-val" style="color:${volColor};">${typeof volatility === 'number' ? volatility.toFixed(1) : volatility}%</div><div class="pf-stat-lbl">Volatility</div></div>
                </div>`;
            body.appendChild(statsWrap);

            // Risk metrics
            const riskMetrics = document.createElement('div');
            riskMetrics.innerHTML = `
                <div style="font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;color:#0a0a0a;margin-bottom:12px;">Risk Metrics</div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
                    <div class="pf-risk-card"><div class="pf-stat-val" style="font-size:22px;color:${sharpeColor};">${sharpe}</div><div class="pf-risk-card-lbl"><span style="font-family:'DM Sans',sans-serif;font-size:11px;color:#aaa;">Sharpe</span></div></div>
                    <div class="pf-risk-card"><div class="pf-stat-val" style="font-size:22px;color:${sortinoColor};">${sortino}</div><div class="pf-risk-card-lbl"><span style="font-family:'DM Sans',sans-serif;font-size:11px;color:#aaa;">Sortino</span></div></div>
                    <div class="pf-risk-card"><div class="pf-stat-val" style="font-size:22px;color:#E53935;">${typeof maxDrawdown === 'number' ? maxDrawdown.toFixed(1) : maxDrawdown}%</div><div class="pf-risk-card-lbl"><span style="font-family:'DM Sans',sans-serif;font-size:11px;color:#aaa;">Max DD</span></div></div>
                </div>`;
            body.appendChild(riskMetrics);

            // Risk badge
            const riskWrap = document.createElement('div');
            riskWrap.innerHTML = `
                <div style="background:#f8f8f8;border-radius:16px;padding:16px;display:flex;align-items:center;justify-content:space-between;">
                    <div><div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#888;margin-bottom:2px;">Risk Rating</div><div style="font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;color:#0a0a0a;">Based on annualised volatility</div></div>
                    <div style="background:${riskColor}20;color:${riskColor};font-family:'DM Mono',monospace;font-size:13px;font-weight:700;padding:8px 16px;border-radius:100px;">${riskLabel}</div>
                </div>`;
            body.appendChild(riskWrap);

            // Disclaimer
            const disc = document.createElement('div');
            disc.style.cssText = 'font-family:"DM Sans",sans-serif;font-size:11px;color:#bbb;text-align:center;line-height:1.6;padding:16px 24px;';
            disc.innerHTML = '! ' + (pf.disclaimer || 'Past performance is not indicative of future results. Assumes daily rebalancing to target weights. Excludes transaction costs, taxes, and slippage — real returns will differ. Past performance is not indicative of future results. StockSwype does not provide financial advice.');
            body.appendChild(disc);

            // Draw charts
            requestAnimationFrame(() => {
                if (hasCurve) {
                    const lineCtx = document.getElementById('pf-sh-line-canvas');
                    if (lineCtx) {
                        _pfSharedLineChart = new Chart(lineCtx, {
                            type: 'line',
                            data: {
                                labels: chartLabels,
                                datasets: [
                                    { label: 'Portfolio', data: portfolioCurve, borderColor: chartLineColor, backgroundColor: portfolioFillColor, borderWidth: 2.5, pointRadius: 0, fill: true, tension: 0.4 },
                                    { label: 'S&P 500', data: spCurve, borderColor: '#aaa', backgroundColor: 'transparent', borderWidth: 1.5, pointRadius: 0, borderDash: [4, 4], tension: 0.4 }
                                ]
                            },
                            options: { responsive: true, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: { enabled: true } }, scales: { x: { grid: { display: false }, ticks: { font: { family: 'DM Mono', size: 10 }, color: '#aaa' } }, y: { grid: { color: '#f0f0f0' }, ticks: { font: { family: 'DM Mono', size: 10 }, color: '#aaa', callback: v => (v >= 0 ? '+' : '') + v.toFixed(1) + '%' } } } }
                        });
                    }
                }
                const pieCtx = document.getElementById('pf-sh-pie-canvas');
                const pieData = tickers.map(t => allocs[t] || Math.floor(100 / tickers.length));
                if (pieCtx) {
                    _pfSharedPieChart = new Chart(pieCtx, {
                        type: 'doughnut',
                        data: { labels: tickers, datasets: [{ data: pieData, backgroundColor: tickers.map((_, i) => palette[i % palette.length]), borderWidth: 0 }] },
                        options: { responsive: true, cutout: '60%', plugins: { legend: { display: false } } }
                    });
                }
                const legend = document.getElementById('pf-sh-pie-legend');
                if (legend) {
                    tickers.forEach((t, i) => {
                        const row = document.createElement('div');
                        row.style.cssText = 'display:flex;align-items:center;gap:8px;';
                        row.innerHTML = `<div style="width:10px;height:10px;border-radius:3px;background:${palette[i % palette.length]};flex-shrink:0;"></div><span style="font-family:'DM Mono',monospace;font-size:12px;font-weight:600;color:#0a0a0a;">${t}</span><span style="font-family:'DM Sans',sans-serif;font-size:12px;color:#888;margin-left:auto;">${allocs[t] || Math.floor(100 / tickers.length)}%</span>`;
                        legend.appendChild(row);
                    });
                }
            });
        }

        // --- Chart Zoom Modal ---
