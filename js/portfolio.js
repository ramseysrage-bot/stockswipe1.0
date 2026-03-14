        let _pfSelected = new Set();
        let _pfAllocs = {};
        let _pfLineChart = null;
        let _pfPieChart = null;
        let _pfSDLineChart = null;
        let _pfSDPieChart = null;
        let _pfSuccessTimer = null;
        let _pfLoadTimer = null;
        let _savedPortfolios = [];
        let _lastPfAnalysis = null; // stores full edge function response for save/detail views

        function pfShowStep(step) {
            ['pf-hub', 'pf-picker', 'pf-sliders', 'pf-results', 'pf-saved', 'pf-saved-detail'].forEach(id => {
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
            pfShowStep('pf-picker');
            const list = document.getElementById('pf-picker-list');
            if (savedStocks.length === 0) {
                list.innerHTML = `<div style="text-align:center;padding:48px 0;font-family:'DM Sans',sans-serif;color:#aaa;font-size:14px;">Save some stocks first, then come back to build your portfolio.</div>`;
                document.getElementById('pf-build-btn-wrap').style.display = 'none';
                return;
            }
            list.innerHTML = '';
            savedStocks.forEach(s => {
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

        function openPfSliders() {
            pfShowStep('pf-sliders');
            const tickers = [..._pfSelected];
            // Init equal weight
            const eq = Math.floor(100 / tickers.length);
            let rem = 100 - eq * tickers.length;
            tickers.forEach((t, i) => {
                _pfAllocs[t] = eq + (i === 0 ? rem : 0);
            });
            pfRenderSliders();
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
            const pctEl = document.getElementById('pf-pct-' + changedTicker);
            if (pctEl) pctEl.textContent = newVal + '%';
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

        function pfEqualWeight() {
            const tickers = [..._pfSelected];
            const eq = Math.floor(100 / tickers.length);
            let rem = 100 - eq * tickers.length;
            tickers.forEach((t, i) => { _pfAllocs[t] = eq + (i === 0 ? rem : 0); });
            pfRenderSliders();
        }

        async function pfMarketCapWeight() {
            const btn = document.querySelector('#pf-sliders button[onclick="pfMarketCapWeight()"]');
            const prevText = btn ? btn.textContent : 'Market Cap';
            if (btn) { btn.textContent = 'Loading…'; btn.disabled = true; }

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
            if (btn) { btn.textContent = prevText; btn.disabled = false; }
        }

        async function openPfResults() {
            const tickers = [..._pfSelected];
            const allocations = tickers.map(t => _pfAllocs[t] || 0);

            // Disable the Analyse button immediately
            const analyseBtn = document.getElementById('pf-analyse-btn');
            if (analyseBtn) { analyseBtn.textContent = 'Analysing…'; analyseBtn.disabled = true; }

            // Show portfolio loading screen over the current step
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

            // Start the edge function call in parallel with the loading animation
            let analysisData = null;
            let analysisError = null;
            const analysePromise = supabaseClient.functions.invoke('analyse-portfolio', {
                body: { tickers, allocations, period: '1y' }
            }).then(({ data, error }) => {
                analysisData = data;
                analysisError = error;
            }).catch(err => {
                analysisError = err;
            });

            _pfLoadTimer = setTimeout(async () => {
                _pfLoadTimer = null;

                // Wait for the edge function if it hasn't resolved yet
                await analysePromise;

                // Re-enable button regardless of outcome
                if (analyseBtn) { analyseBtn.textContent = 'Analyse'; analyseBtn.disabled = false; }

                if (analysisError || !analysisData) {
                    // Hide loading overlay and bail out
                    if (loadEl) loadEl.style.display = 'none';
                    showToast('Could not analyse portfolio. Please try again.');
                    return;
                }

                _lastPfAnalysis = analysisData;
                pfShowStep('pf-results'); // also hides pf-loading
                _pfRenderResults(tickers, analysisData);
            }, 2900);
        }

        function _pfRenderResults(tickers, data) {
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
            const riskLabel    = volatility < 12 ? 'Low' : volatility < 20 ? 'Medium' : 'High';
            const riskColor    = riskLabel === 'Low' ? '#00C853' : riskLabel === 'Medium' ? '#FF9800' : '#E53935';
            const retColor     = totalReturn >= 0 ? '#00C853' : '#E53935';
            const annRetColor  = annReturn >= 0 ? '#00C853' : '#E53935';
            const alphaColor   = alpha >= 0 ? '#00C853' : '#E53935';
            const sharpeColor  = sharpe > 1 ? '#00C853' : sharpe >= 0 ? '#FF9800' : '#E53935';
            const sortinoColor = sortino > 1 ? '#00C853' : sortino >= 0 ? '#FF9800' : '#E53935';

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
                document.getElementById('pf-s-val2').textContent = volatility + '%';
                document.getElementById('pf-s-val3').textContent = (alpha >= 0 ? '+' : '') + alpha + '%';
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
                    <div style="font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;color:#0a0a0a;">Cumulative Return</div>
                    <div id="pf-chart-hover" style="text-align:right;">
                        <div id="pf-hover-label" style="font-family:'DM Mono',monospace;font-size:11px;color:#aaa;"></div>
                        <div style="display:flex;align-items:center;gap:10px;justify-content:flex-end;margin-top:2px;">
                            <span style="display:flex;align-items:center;gap:4px;">
                                <span style="width:8px;height:8px;border-radius:2px;background:#00C853;display:inline-block;"></span>
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
                        <div class="pf-stat-val" style="color:#E53935;">${maxDrawdown}%</div>
                        <div class="pf-stat-lbl" style="display:flex;align-items:center;gap:4px;">Max Drawdown
                            <span class="pf-tooltip-wrap" id="tip-mdd" onclick="pfToggleTip('tip-mdd',event)"><span class="pf-info-btn" style="width:14px;height:14px;font-size:9px;">i</span><span class="pf-tooltip-box" style="right:auto;left:50%;transform:translateX(-50%);">The largest peak-to-trough decline over the backtest period. Tells you the worst case you would have experienced.</span></span>
                        </div>
                    </div>
                    <div class="pf-stat-card">
                        <div class="pf-stat-val" style="color:#FF9800;">${volatility}%</div>
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
            disc.innerHTML = '⚠️ ' + (data.disclaimer || 'Past performance is not indicative of future results. StockSwype does not provide financial advice.');
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
                                    borderColor: '#00C853',
                                    backgroundColor: 'rgba(0,200,83,0.08)',
                                    borderWidth: 2.5,
                                    pointRadius: 0,
                                    pointHoverRadius: 5,
                                    pointHoverBackgroundColor: '#00C853',
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
                                tooltip: { enabled: false },
                            },
                            onHover: (event, elements, chart) => {
                                if (!elements || elements.length === 0) return;
                                const idx = elements[0].index;
                                const pfVal = data.portfolioCurve[idx];
                                const bchVal = data.spCurve[idx];
                                const pfRet = pfVal.toFixed(1);
                                const bchRet = bchVal.toFixed(1);
                                const labelEl = document.getElementById('pf-hover-label');
                                const pfEl = document.getElementById('pf-hover-portfolio');
                                const bchEl = document.getElementById('pf-hover-bench');
                                if (labelEl) labelEl.textContent = MONTHS[new Date(data.dates[idx]).getUTCMonth()];
                                if (pfEl) pfEl.textContent = (pfRet >= 0 ? '+' : '') + pfRet + '%';
                                if (bchEl) bchEl.textContent = (bchRet >= 0 ? '+' : '') + bchRet + '%';
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
                        }
                    });

                    // Set default hover readout to last data point
                    const lastIdx = data.dates.length - 1;
                    const defPf = data.portfolioCurve[lastIdx].toFixed(1);
                    const defBch = data.spCurve[lastIdx].toFixed(1);
                    const labelEl = document.getElementById('pf-hover-label');
                    const pfEl = document.getElementById('pf-hover-portfolio');
                    const bchEl = document.getElementById('pf-hover-bench');
                    if (labelEl) labelEl.textContent = MONTHS[new Date(data.dates[lastIdx]).getUTCMonth()];
                    if (pfEl) pfEl.textContent = (defPf >= 0 ? '+' : '') + defPf + '%';
                    if (bchEl) bchEl.textContent = (defBch >= 0 ? '+' : '') + defBch + '%';
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

        function savePfPortfolio() {
            const tickers = [..._pfSelected];
            const entry = {
                id: Date.now(),
                tickers,
                allocs: Object.assign({}, _pfAllocs),
                name: null,
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                totalReturn:    _lastPfAnalysis?.stats?.totalReturn    ?? 0,
                annReturn:      _lastPfAnalysis?.stats?.annualisedReturn ?? 0,
                volatility:     _lastPfAnalysis?.stats?.volatility     ?? 0,
                alpha:          _lastPfAnalysis?.stats?.alpha          ?? 0,
                sharpe:         _lastPfAnalysis?.stats?.sharpe         ?? 0,
                sortino:        _lastPfAnalysis?.stats?.sortino        ?? 0,
                maxDrawdown:    _lastPfAnalysis?.stats?.maxDrawdown    ?? 0,
                chartDates:     _lastPfAnalysis?.dates                 ?? [],
                portfolioCurve: _lastPfAnalysis?.portfolioCurve       ?? [],
                spCurve:        _lastPfAnalysis?.spCurve               ?? [],
                disclaimer:     _lastPfAnalysis?.disclaimer            ?? '',
            };
            _savedPortfolios.unshift(entry);
            const badge = document.getElementById('pf-saved-badge');
            if (badge) { badge.textContent = _savedPortfolios.length; badge.style.display = 'block'; }
            const btn = document.querySelector('#pf-save-btn-wrap button');
            if (btn) { btn.textContent = 'Saved ✓'; btn.disabled = true; btn.style.color = '#aaa'; btn.style.border = '2px solid #e0e0e0'; btn.style.boxShadow = 'none'; }
            showToast('Portfolio saved!');

            // Return to hub automatically so user doesn't have to back out manually
            setTimeout(() => {
                _pfSelected.clear();
                _pfAllocs = {};
                openPfHub();
                const hub = document.getElementById('pf-hub');
                if (hub) {
                    hub.style.animation = 'none';
                    void hub.offsetWidth; // force reflow
                    hub.style.animation = 'pfSlideHome 0.2s linear forwards';
                }
            }, 800);
        }

        function openPfSaved() {
            pfShowStep('pf-saved');
            const list = document.getElementById('pf-saved-list');
            if (!list) return;
            if (_savedPortfolios.length === 0) {
                list.innerHTML = `<div style="text-align:center;padding:48px 0;font-family:'DM Sans',sans-serif;color:#aaa;font-size:14px;">No saved portfolios yet.<br>Build and save your first one!</div>`;
                return;
            }
            list.innerHTML = '';
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

                headerRow.appendChild(nameDiv);
                headerRow.appendChild(pencil);
                headerRow.appendChild(plane);
                headerRow.appendChild(dateDiv);

                // Metrics
                const metricsDiv = document.createElement('div');
                metricsDiv.innerHTML = `
                    <div style="display:flex;gap:8px;">
                        <div style="flex:1;text-align:center;background:#fff;border-radius:10px;padding:10px 4px;">
                            <div style="font-family:'DM Mono',monospace;font-size:15px;font-weight:700;color:#00C853;">+${pf.totalReturn}%</div>
                            <div style="font-family:'DM Sans',sans-serif;font-size:10px;color:#aaa;margin-top:3px;">Return</div>
                        </div>
                        <div style="flex:1;text-align:center;background:#fff;border-radius:10px;padding:10px 4px;">
                            <div style="font-family:'DM Mono',monospace;font-size:15px;font-weight:700;color:#FF9800;">${pf.volatility}%</div>
                            <div style="font-family:'DM Sans',sans-serif;font-size:10px;color:#aaa;margin-top:3px;">Volatility</div>
                        </div>
                        <div style="flex:1;text-align:center;background:#fff;border-radius:10px;padding:10px 4px;">
                            <div style="font-family:'DM Mono',monospace;font-size:15px;font-weight:700;color:#00C853;">+${pf.alpha}%</div>
                            <div style="font-family:'DM Sans',sans-serif;font-size:10px;color:#aaa;margin-top:3px;">Alpha</div>
                        </div>
                    </div>`;

                item.appendChild(headerRow);
                item.appendChild(metricsDiv);
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
            const commit = () => {
                if (committed) return;
                committed = true;
                pf.name = input.value.trim() || currentName;
                openPfSaved();
            };
            input.addEventListener('blur', commit);
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
                if (e.key === 'Escape') { input.value = currentName; input.blur(); }
            });
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
            const riskLabel    = volatility < 12 ? 'Low' : volatility < 20 ? 'Medium' : 'High';
            const riskColor    = riskLabel === 'Low' ? '#00C853' : riskLabel === 'Medium' ? '#FF9800' : '#E53935';
            const retColor     = totalReturn >= 0 ? '#00C853' : '#E53935';
            const annRetColor  = annReturn >= 0 ? '#00C853' : '#E53935';
            const sharpeColor  = sharpe > 1 ? '#00C853' : sharpe >= 0 ? '#FF9800' : '#E53935';
            const sortinoColor = sortino > 1 ? '#00C853' : sortino >= 0 ? '#FF9800' : '#E53935';

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
                    <div style="font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;color:#0a0a0a;">Cumulative Return</div>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:2px;background:#00C853;display:inline-block;"></span><span style="font-family:'DM Mono',monospace;font-size:11px;color:#00C853;font-weight:700;">Portfolio</span></span>
                        <span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:2px;background:#aaa;display:inline-block;"></span><span style="font-family:'DM Mono',monospace;font-size:11px;color:#888;font-weight:600;">S&P 500</span></span>
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
                    <div class="pf-stat-card"><div class="pf-stat-val" style="color:#E53935;">${maxDrawdown.toFixed(1)}%</div><div class="pf-stat-lbl">Max Drawdown</div></div>
                    <div class="pf-stat-card"><div class="pf-stat-val" style="color:#FF9800;">${volatility.toFixed(1)}%</div><div class="pf-stat-lbl">Volatility</div></div>
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
            disc.innerHTML = '⚠️ ' + (pf.disclaimer || 'Past performance is not indicative of future results. StockSwype does not provide financial advice.');
            body.appendChild(disc);

            // Draw charts
            const palette = ['#00C853', '#2979FF', '#FF6D00', '#AA00FF', '#D50000', '#00B0FF', '#FFD600', '#64DD17'];
            requestAnimationFrame(() => {
                if (hasCurve) {
                    const lineCtx = document.getElementById('pf-sd-line-canvas');
                    if (lineCtx) {
                        _pfSDLineChart = new Chart(lineCtx, {
                            type: 'line',
                            data: {
                                labels: chartLabels,
                                datasets: [
                                    { label: 'Portfolio', data: portfolioCurve, borderColor: '#00C853', backgroundColor: 'rgba(0,200,83,0.08)', borderWidth: 2.5, pointRadius: 0, fill: true, tension: 0.4 },
                                    { label: 'S&P 500', data: spCurve, borderColor: '#aaa', backgroundColor: 'transparent', borderWidth: 1.5, pointRadius: 0, borderDash: [4, 4], tension: 0.4 }
                                ]
                            },
                            options: { responsive: true, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: { enabled: true } }, scales: { x: { grid: { display: false }, ticks: { font: { family: 'DM Mono', size: 10 }, color: '#aaa' } }, y: { grid: { color: '#f0f0f0' }, ticks: { font: { family: 'DM Mono', size: 10 }, color: '#aaa', callback: v => (v >= 0 ? '+' : '') + v.toFixed(1) + '%' } } } }
                        });
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
            const riskLabel    = volatility < 12 ? 'Low' : volatility < 20 ? 'Medium' : 'High';
            const riskColor    = riskLabel === 'Low' ? '#00C853' : riskLabel === 'Medium' ? '#FF9800' : '#E53935';
            const retColor     = totalReturn >= 0 ? '#00C853' : '#E53935';
            const annRetColor  = annReturn >= 0 ? '#00C853' : '#E53935';
            const sharpeColor  = sharpe > 1 ? '#00C853' : sharpe >= 0 ? '#FF9800' : '#E53935';
            const sortinoColor = sortino > 1 ? '#00C853' : sortino >= 0 ? '#FF9800' : '#E53935';
            const palette = ['#00C853', '#2979FF', '#FF6D00', '#AA00FF', '#D50000', '#00B0FF', '#FFD600', '#64DD17'];

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
                    <div style="font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;color:#0a0a0a;">Cumulative Return</div>
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
                    <div class="pf-stat-card"><div class="pf-stat-val" style="color:#E53935;">${typeof maxDrawdown === 'number' ? maxDrawdown.toFixed(1) : maxDrawdown}%</div><div class="pf-stat-lbl">Max Drawdown</div></div>
                    <div class="pf-stat-card"><div class="pf-stat-val" style="color:#FF9800;">${typeof volatility === 'number' ? volatility.toFixed(1) : volatility}%</div><div class="pf-stat-lbl">Volatility</div></div>
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
            disc.innerHTML = '⚠️ ' + (pf.disclaimer || 'Past performance is not indicative of future results. This is a read-only view of a shared portfolio. StockSwype does not provide financial advice.');
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
                                    { label: 'Portfolio', data: portfolioCurve, borderColor: '#00C853', backgroundColor: 'rgba(0,200,83,0.08)', borderWidth: 2.5, pointRadius: 0, fill: true, tension: 0.4 },
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
