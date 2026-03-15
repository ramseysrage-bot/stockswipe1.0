        let _ageAccepted = false;
        let _termsAccepted = false;

        const CHECK_SVG = `<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

        function _setCheckboxState(boxId, rowId, checked) {
            const box = document.getElementById(boxId);
            const row = document.getElementById(rowId);
            if (checked) {
                box.style.background = '#00C853';
                box.style.borderColor = '#00C853';
                box.innerHTML = CHECK_SVG;
                row.style.borderColor = '#00C853';
                row.style.background = 'rgba(0,200,83,0.04)';
            } else {
                box.style.background = '';
                box.style.borderColor = '#ccc';
                box.innerHTML = '';
                row.style.borderColor = '#eee';
                row.style.background = '#f8f8f8';
            }
        }

        function _updateContinueBtn() {
            const btn = document.getElementById('username-continue-btn');
            const allAccepted = _ageAccepted && _termsAccepted;
            btn.style.background = allAccepted ? '#0a0a0a' : '#ccc';
            btn.style.cursor = allAccepted ? 'pointer' : 'not-allowed';
        }

        function toggleAgeCheckbox() {
            _ageAccepted = !_ageAccepted;
            _setCheckboxState('age-checkbox', 'age-checkbox-row', _ageAccepted);
            _updateContinueBtn();
        }

        function toggleTermsCheckbox() {
            _termsAccepted = !_termsAccepted;
            _setCheckboxState('terms-checkbox', 'terms-checkbox-row', _termsAccepted);
            _updateContinueBtn();
        }

        function openInfoOverlay(type) {
            const overlay = document.getElementById('info-overlay');
            const title = document.getElementById('info-overlay-title');
            const body = document.getElementById('info-overlay-body');

            const content = {
                about: {
                    title: 'About StockSwype',
                    html: `
                        <div style="text-align:center;margin-bottom:28px;">
                            <div style="font-family:'DM Mono',monospace;font-size:13px;font-weight:500;letter-spacing:3.5px;text-transform:uppercase;background:linear-gradient(130deg,#00C853,#69F0AE 55%,#00BFA5);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px;">StockSwype</div>
                            <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#aaa;">Version 1.0</div>
                        </div>
                        <p>StockSwype is a stock discovery app built for curious investors. Swipe through stocks tailored to your interests, save ones you like, and stay on top of the news that matters to your watchlist.</p>
                        <p style="margin-top:16px;">We built StockSwype to make investing feel less overwhelming. Whether you're just starting out or building a serious portfolio, StockSwype helps you discover companies worth your attention — without the noise.</p>
                        <p style="margin-top:16px;">Market data is provided for informational purposes only and does not constitute financial advice. Always do your own research before making any investment decisions.</p>
                        <div style="margin-top:32px;padding-top:24px;border-top:1px solid #f0f0f0;font-family:'DM Mono',monospace;font-size:11px;color:#bbb;text-align:center;letter-spacing:1px;">MADE WITH ♥ FOR INVESTORS</div>
                    `
                },
                privacy: {
                    title: 'Privacy Policy',
                    html: `
                        <p style="font-size:12px;color:#aaa;margin-bottom:20px;">Last updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p><strong>1. Information We Collect</strong></p>
                        <p style="margin-top:8px;">When you sign in with Google, we collect your email address and Google profile information solely to create and manage your StockSwype account. We also store your saved stocks, swiping preferences, and quiz responses to personalise your experience.</p>
                        <p style="margin-top:16px;"><strong>2. How We Use Your Information</strong></p>
                        <p style="margin-top:8px;">Your data is used exclusively to provide and improve the StockSwype service — personalising your feed, powering the watchlist, and enabling the friends feature. We do not sell, rent, or share your personal information with third parties for marketing purposes.</p>
                        <p style="margin-top:16px;"><strong>3. Data Storage</strong></p>
                        <p style="margin-top:8px;">Your data is stored securely using Supabase, a trusted backend-as-a-service platform. All data is encrypted in transit using HTTPS.</p>
                        <p style="margin-top:16px;"><strong>4. Third-Party Services</strong></p>
                        <p style="margin-top:8px;">StockSwype uses Finnhub for market news and price data. No personal information is shared with Finnhub. Authentication is handled by Google OAuth via Supabase.</p>
                        <p style="margin-top:16px;"><strong>5. Data Retention & Deletion</strong></p>
                        <p style="margin-top:8px;">You may request deletion of your account and all associated data at any time by contacting us. Upon request, your data will be permanently deleted within 30 days.</p>
                        <p style="margin-top:16px;"><strong>6. Children's Privacy</strong></p>
                        <p style="margin-top:8px;">StockSwype is not directed at children under 13. We do not knowingly collect personal information from children under 13.</p>
                        <p style="margin-top:16px;"><strong>7. Contact</strong></p>
                        <p style="margin-top:8px;">For privacy-related questions or data deletion requests, please contact us at support@stockswype.com.</p>
                    `
                },
                terms: {
                    title: 'Terms & Conditions',
                    html: `
                        <p style="font-size:12px;color:#aaa;margin-bottom:20px;">Last updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p><strong>1. Acceptance of Terms</strong></p>
                        <p style="margin-top:8px;">By using StockSwype, you agree to these Terms & Conditions. If you do not agree, please do not use the app.</p>
                        <p style="margin-top:16px;"><strong>2. Not Financial Advice</strong></p>
                        <p style="margin-top:8px;">StockSwype is an informational tool only. Nothing in this app constitutes financial, investment, legal, or tax advice. Always consult a qualified financial advisor before making investment decisions. Past performance is not indicative of future results.</p>
                        <p style="margin-top:16px;"><strong>3. Accuracy of Information</strong></p>
                        <p style="margin-top:8px;">Market data, prices, and news are sourced from third-party providers and may be delayed or inaccurate. StockSwype makes no guarantees about the accuracy, completeness, or timeliness of any information displayed.</p>
                        <p style="margin-top:16px;"><strong>4. User Accounts</strong></p>
                        <p style="margin-top:8px;">You are responsible for maintaining the security of your account. You agree not to use StockSwype for any unlawful purpose or in any way that could harm other users.</p>
                        <p style="margin-top:16px;"><strong>5. Intellectual Property</strong></p>
                        <p style="margin-top:8px;">All content, design, and code within StockSwype is the property of StockSwype. You may not reproduce or distribute any part of the app without written permission.</p>
                        <p style="margin-top:16px;"><strong>6. Limitation of Liability</strong></p>
                        <p style="margin-top:8px;">StockSwype is provided "as is" without warranties of any kind. We are not liable for any financial losses, damages, or decisions made based on information presented in the app.</p>
                        <p style="margin-top:16px;"><strong>7. Changes to Terms</strong></p>
                        <p style="margin-top:8px;">We reserve the right to update these terms at any time. Continued use of StockSwype after changes constitutes acceptance of the new terms.</p>
                    `
                }
            };

            const page = content[type];
            if (!page) return;

            title.textContent = page.title;
            body.innerHTML = page.html;
            overlay.style.display = 'flex';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => { overlay.style.opacity = '1'; });
            });
        }

        function closeInfoOverlay() {
            const overlay = document.getElementById('info-overlay');
            overlay.style.opacity = '0';
            setTimeout(() => { overlay.style.display = 'none'; }, 250);
        }

        function showToast(msg) {
            const toast = document.getElementById('toast');
            toast.innerText = msg;
            toast.classList.add('visible');
            setTimeout(() => toast.classList.remove('visible'), 2500);
        }

        // --- Watchlist Logic ---
        function showWatchlist() {
            document.getElementById('feed').classList.remove('active');
            document.getElementById('watchlist').classList.add('active');
            renderWatchlist();
            fetchSavedStockPrices();
        }

        function hideWatchlist() {
            document.getElementById('watchlist').classList.remove('active');
            document.getElementById('feed').classList.add('active');
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            document.getElementById('nav-btn-home').classList.add('active');
        }

        function clearAllSaved() {
            if (savedStocks.length === 0) return;
            if (!confirm('Remove all saved stocks?')) return;
            savedStocks = [];
            document.getElementById('saved-count').innerText = '0';
            if (currentUser && !isGuest) {
                supabaseClient.from('saved_stocks')
                    .delete()
                    .eq('user_id', currentUser.id)
                    .then(() => { }).catch(() => { });
            }
            renderWatchlist();
        }

        let wlFilter = 'All';

        function renderWatchlist() {
            const list = document.getElementById('wl-list-container');
            const countStr = savedStocks.length === 1 ? '1 STOCK SWYPED' : `${savedStocks.length} STOCKS SWYPED`;
            document.getElementById('wl-count').innerText = countStr;

            if (savedStocks.length === 0) {
                list.innerHTML = `
                    <div class="wl-empty">
                        <div class="wl-empty-icon">★</div>
                        <div class="wl-empty-title">Nothing swyped yet</div>
                        <div class="wl-empty-sub">Swipe right on stocks you like to build your swyped list.</div>
                    </div>
                `;
                return;
            }

            // Sector breakdown — count stocks by primary sector
            const sectorCounts = {};
            savedStocks.forEach(s => {
                const sec = s.sector || 'Other';
                sectorCounts[sec] = (sectorCounts[sec] || 0) + 1;
            });
            const topSectors = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
            const pillColors = [
                { bg: 'rgba(0,200,83,0.12)', text: '#00a844' },
                { bg: 'rgba(99,102,241,0.12)', text: '#4f46e5' },
                { bg: 'rgba(245,158,11,0.12)', text: '#d97706' },
                { bg: 'rgba(239,68,68,0.12)', text: '#dc2626' }
            ];
            const pillsHTML = topSectors.map(([sec, cnt], i) =>
                `<div class="wl-sector-pill" style="background:${pillColors[i].bg};color:${pillColors[i].text};">${sec} ${cnt}</div>`
            ).join('');

            // Daily stats
            const gainers = savedStocks.filter(s => s.color === 'green');
            const losers = savedStocks.filter(s => s.color === 'red');
            const changes = savedStocks.map(s => parseFloat(s.change) || 0);
            const avg = changes.length ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;
            const avgSign = avg >= 0 ? '+' : '';
            const pnlColor = avg >= 0 ? '#00C853' : '#E53935';

            // Apply filter/sort
            let filtered = [...savedStocks];
            if (wlFilter === 'Gainers') filtered = filtered.filter(s => s.color === 'green');
            else if (wlFilter === 'Losers') filtered = filtered.filter(s => s.color === 'red');
            else if (wlFilter === 'A-Z') filtered.sort((a, b) => a.ticker.localeCompare(b.ticker));
            else if (wlFilter === 'Industry') filtered.sort((a, b) => (a.sector || 'Other').localeCompare(b.sector || 'Other'));

            const mkBtn = (label) =>
                `<div class="wl-filter-btn${wlFilter === label ? ' wl-f-active' : ''}" onclick="setWlFilter('${label}')">${label}</div>`;

            list.innerHTML = `
                <div class="wl-summary-card">
                    <div class="wl-sector-pills">${pillsHTML}</div>
                    <div class="wl-summary-line">Today: <strong>${gainers.length} up</strong>, ${losers.length} down</div>
                    <div class="wl-pnl-line" style="color:${pnlColor};">Avg daily move: ${avgSign}${avg.toFixed(2)}% across your watchlist</div>
                </div>
                <div class="wl-filter-bar">
                    ${mkBtn('All')}${mkBtn('Gainers')}${mkBtn('Losers')}${mkBtn('A-Z')}${mkBtn('Industry')}
                </div>
                ${wlFilter === 'Industry'
                    ? (() => {
                        let html = '';
                        let lastSector = null;
                        filtered.forEach(s => {
                            const sec = s.sector || 'Other';
                            if (sec !== lastSector) {
                                html += `<div style="font-family:'DM Mono',monospace;font-size:10px;font-weight:600;color:#aaa;letter-spacing:1.5px;text-transform:uppercase;padding:16px 24px 6px;">${sec}</div>`;
                                lastSector = sec;
                            }
                            html += wlRow(s);
                        });
                        return html;
                    })()
                    : filtered.map(s => wlRow(s)).join('')
                }
            `;

            applyWatchlistLogos();
            applyWlSwipe();
        }

        function setWlFilter(f) {
            wlFilter = f;
            renderWatchlist();
        }

        function wlRow(stock) {
            const color = stock.color === 'green' ? '#00C853' : '#E53935';
            const bg = stock.color === 'green' ? 'rgba(0,200,83,0.1)' : 'rgba(229,57,53,0.1)';
            const t = stock.ticker;
            return `
                <div class="wl-row-wrap" data-ticker="${t}">
                    <div class="wl-remove-btn" onclick="removeFromSaved('${t}')">Remove</div>
                    <div class="wl-item wl-item-sliding" onclick="openWlDetail('${t}')">
                        <div class="wl-item-left">
                            <div style="position:relative;flex-shrink:0;width:44px;height:44px;">
                                <img id="wl-logo-${t}" class="logo-avatar" src="" alt="${t}" style="display:none;">
                                <div id="wl-logo-fb-${t}" class="wl-badge" style="color:${color};background:${bg};position:absolute;inset:0;">${t}</div>
                            </div>
                            <div class="wl-names">
                                <div class="wl-t">${t}</div>
                                <div class="wl-n">${stock.name}</div>
                            </div>
                        </div>
                        ${stock.change && stock.change !== '...' ? `<div style="font-family:'DM Mono',monospace;font-size:11px;font-weight:600;color:${color};background:${bg};padding:3px 8px;border-radius:8px;white-space:nowrap;margin-right:8px;">${stock.change}</div>` : ''}
                        <button class="wl-share-btn" onclick="shareStock('${t}', event)" aria-label="Send ${t} to a friend">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }

        // Wire logos into rendered rows
        function applyWatchlistLogos() {
            savedStocks.forEach(stock => {
                const imgEl = document.getElementById('wl-logo-' + stock.ticker);
                const fbEl = document.getElementById('wl-logo-fb-' + stock.ticker);
                if (!imgEl || !fbEl) return;
                if (logoCache[stock.ticker] !== undefined) {
                    injectLogo(imgEl, fbEl, stock.ticker);
                } else {
                    fetchLogo(stock.ticker).then(() => injectLogo(imgEl, fbEl, stock.ticker));
                }
            });
        }

        // Attach swipe-left-to-reveal-remove touch handlers
        let openSwipeItem = null; // currently-revealed .wl-item-sliding element

        function snapSwipeItem(item) {
            item.style.transition = 'transform 0.2s ease';
            item.style.transform = 'translateX(0)';
            item._wlRevealed = false;
        }

        function applyWlSwipe() {
            document.querySelectorAll('.wl-row-wrap').forEach(wrap => {
                const item = wrap.querySelector('.wl-item-sliding');
                item._wlRevealed = false;
                let startX = 0, startY = 0, curDx = 0, tracking = false;

                item.addEventListener('touchstart', e => {
                    startX = e.touches[0].clientX;
                    startY = e.touches[0].clientY;
                    curDx = 0;
                    tracking = true;
                    item.style.transition = 'none';
                }, { passive: true });

                item.addEventListener('touchmove', e => {
                    if (!tracking) return;
                    const dx = e.touches[0].clientX - startX;
                    const dy = e.touches[0].clientY - startY;
                    // Cancel tracking if mostly vertical scroll
                    if (Math.abs(dy) > Math.abs(dx) + 10) { tracking = false; return; }
                    curDx = dx;
                    if (curDx < 0) {
                        item.style.transform = `translateX(${Math.max(curDx, -80)}px)`;
                    } else if (item._wlRevealed && curDx > 0) {
                        item.style.transform = `translateX(${Math.min(-80 + curDx, 0)}px)`;
                    }
                }, { passive: true });

                item.addEventListener('touchend', () => {
                    if (!tracking) return;
                    tracking = false;
                    item.style.transition = 'transform 0.2s ease';
                    if (!item._wlRevealed && curDx < -50) {
                        // Snap open — close any other open row first
                        if (openSwipeItem && openSwipeItem !== item) snapSwipeItem(openSwipeItem);
                        item.style.transform = 'translateX(-80px)';
                        item._wlRevealed = true;
                        openSwipeItem = item;
                    } else if (item._wlRevealed && curDx > 30) {
                        snapSwipeItem(item);
                        if (openSwipeItem === item) openSwipeItem = null;
                    } else {
                        item.style.transform = item._wlRevealed ? 'translateX(-80px)' : 'translateX(0)';
                    }
                });

                // Prevent tap-to-open detail when row is revealed
                item.addEventListener('click', e => {
                    if (item._wlRevealed) {
                        e.stopPropagation();
                        e.preventDefault();
                        snapSwipeItem(item);
                        if (openSwipeItem === item) openSwipeItem = null;
                    }
                }, true);
            });
        }

        function removeFromSaved(ticker) {
            savedStocks = savedStocks.filter(s => s.ticker !== ticker);
            document.getElementById('saved-count').innerText = savedStocks.length;
            renderWatchlist();
            if (currentUser && !isGuest) {
                supabaseClient.from('saved_stocks')
                    .delete()
                    .eq('user_id', currentUser.id)
                    .eq('ticker', ticker)
                    .catch(() => { });
            }
        }

        function openShareModal(e) {
            if (e) e.stopPropagation();
            document.getElementById('share-overlay').classList.add('active');
            document.getElementById('share-modal').classList.add('active');
        }

        function closeShareModal() {
            document.getElementById('share-overlay').classList.remove('active');
            document.getElementById('share-modal').classList.remove('active');
            // Reset title and portfolio share state
            const titleEl = document.getElementById('share-modal-title');
            if (titleEl) titleEl.textContent = 'Send to a Friend';
            _currentSharePortfolioId = null;
        }

        let _currentShareTicker = null;
        let _currentShareArticle = null;
        let _currentSharePortfolioId = null;

        function avatarHTML(username, avatarUrl, size, fontSize) {
            size = size || 40; fontSize = fontSize || 13;
            const initials = (username || '?').slice(0, 2).toUpperCase();
            const r = Math.floor(size / 2);
            if (avatarUrl) {
                return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:' + r + 'px;overflow:hidden;flex-shrink:0;"><img src="' + avatarUrl + '" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentNode.innerHTML=\'<div style=&quot;width:' + size + 'px;height:' + size + 'px;border-radius:' + r + 'px;background:rgba(0,200,83,0.12);display:flex;align-items:center;justify-content:center;font-family:DM Sans,sans-serif;font-weight:700;font-size:' + fontSize + 'px;color:#00C853;&quot;>' + initials + '</div>\'"/></div>';
            }
            return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:' + r + 'px;background:rgba(0,200,83,0.12);display:flex;align-items:center;justify-content:center;font-family:DM Sans,sans-serif;font-weight:700;font-size:' + fontSize + 'px;color:#00C853;flex-shrink:0;">' + initials + '</div>';
        }

        function shareStock(ticker, e) {
            if (e) e.stopPropagation();
            _currentShareTicker = ticker;
            openShareModal(e);
            loadShareFriends();
        }

        function shareCardStock(ticker, e) {
            shareStock(ticker, e);
        }

        async function loadShareFriends() {
            const body = document.getElementById('share-modal-body');
            if (!body) return;
            if (!currentUser) {
                body.innerHTML = `<div class="share-empty-text">Sign in to share stocks with friends.</div>`;
                return;
            }
            body.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#aaa;text-align:center;padding:20px;">Loading...</div>`;
            try {
                const { data: rows } = await supabaseClient
                    .from('friendships')
                    .select('*')
                    .or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`)
                    .eq('status', 'accepted');

                if (!rows || rows.length === 0) {
                    body.innerHTML = `
                        <div class="share-empty-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00C853" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                        </div>
                        <div class="share-empty-text">No friends yet</div>
                        <button class="share-find-btn" onclick="closeShareModal(); navTo('friends')">Find Friends</button>`;
                    return;
                }

                body.innerHTML = '';
                const sendHeader = document.createElement('div');
                sendHeader.style.cssText = "font-family:'DM Sans',sans-serif;font-size:12px;color:#aaa;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:12px;";
                sendHeader.textContent = 'Send to...';
                body.appendChild(sendHeader);
                for (const f of rows) {
                    const friendId = f.requester_id === currentUser.id ? f.addressee_id : f.requester_id;
                    const { data: prof } = await supabaseClient
                        .from('user_profiles').select('username, avatar_url').eq('user_id', friendId).maybeSingle();
                    const uname = prof?.username || 'Unknown';
                    const row = document.createElement('div');
                    row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #f4f4f5;cursor:pointer;';
                    row.innerHTML = avatarHTML(uname, prof?.avatar_url, 42, 14);
                    const nameEl = document.createElement('div');
                    nameEl.style.cssText = "font-family:'DM Sans',sans-serif;font-weight:600;font-size:15px;color:#0a0a0a;";
                    nameEl.textContent = '@' + uname;
                    row.appendChild(nameEl);
                    const arrow = document.createElement('div');
                    arrow.style.cssText = 'margin-left:auto;';
                    arrow.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="#00C853" stroke="none"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
                    row.appendChild(arrow);
                    row.addEventListener('click', () => {
                        if (_currentSharePortfolioId) { sendPortfolioMessage(friendId, uname, row); }
                        else if (_currentShareArticle) { sendArticleMessage(friendId, uname); }
                        else { sendStockMessage(friendId, uname); }
                    });
                    body.appendChild(row);
                }
            } catch (e) {
                body.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#aaa;text-align:center;padding:20px;">Something went wrong.</div>`;
            }
        }

        async function sendStockMessage(recipientId, recipientUsername) {
            if (!currentUser || !_currentShareTicker) return;
            try {
                // Check if this exact stock was already sent to this person
                const { data: existing } = await supabaseClient
                    .from('messages')
                    .select('id')
                    .eq('sender_id', currentUser.id)
                    .eq('recipient_id', recipientId)
                    .eq('ticker', _currentShareTicker)
                    .maybeSingle();

                if (existing) {
                    showToast("Your friend got it the first time. Don't be 'that' guy.");
                    return;
                }

                await supabaseClient.from('messages').insert({
                    sender_id: currentUser.id,
                    recipient_id: recipientId,
                    ticker: _currentShareTicker,
                    message: '',
                    read: false
                });
                closeShareModal();
                showToast(`${_currentShareTicker} sent to @${recipientUsername}!`);
                updateMessagesBadge();
            } catch (e) { showToast('Could not send. Try again.'); }
        }

        async function sendArticleMessage(recipientId, recipientUsername) {
            if (!currentUser || !_currentShareArticle) return;
            const url = _currentShareArticle.url || '';
            const ticker = _currentShareTicker || 'NEWS';
            try {
                await supabaseClient.from('messages').insert({
                    sender_id: currentUser.id,
                    recipient_id: recipientId,
                    ticker: ticker,
                    message: url,
                    read: false
                });
                closeShareModal();
                _currentShareArticle = null;
                showToast(`Article sent to @${recipientUsername}!`);
                updateMessagesBadge();
            } catch (e) { showToast('Could not send. Try again.'); }
        }

        function _inboxDismissed() {
            try { return new Set(JSON.parse(localStorage.getItem('inbox_dismissed_' + currentUser?.id) || '[]')); }
            catch { return new Set(); }
        }
        function _dismissInboxItem(id) {
            const s = _inboxDismissed(); s.add(String(id));
            localStorage.setItem('inbox_dismissed_' + currentUser?.id, JSON.stringify([...s]));
        }

        async function loadInbox() {
            const inbox = document.getElementById('fr-inbox');
            if (!inbox || !currentUser) return;
            try {
                const { data: msgs } = await supabaseClient
                    .from('messages')
                    .select('*')
                    .eq('recipient_id', currentUser.id)
                    .order('created_at', { ascending: false })
                    .limit(20);

                const dismissed = _inboxDismissed();
                const visibleMsgs = (msgs || []).filter(m => !dismissed.has(String(m.id)));
                if (visibleMsgs.length === 0) {
                    inbox.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#bbb;padding:4px 20px 20px;">No messages yet. Share a stock with a friend!</div>`;
                    return;
                }

                // Mark all as read
                await supabaseClient.from('messages')
                    .update({ read: true })
                    .eq('recipient_id', currentUser.id)
                    .eq('read', false);

                inbox.innerHTML = '';
                const frag = document.createDocumentFragment();
                for (const msg of visibleMsgs) {
                    const { data: prof } = await supabaseClient
                        .from('user_profiles').select('username, avatar_url').eq('user_id', msg.sender_id).maybeSingle();
                    const uname = prof?.username || 'Someone';
                    const timeAgo = getTimeAgo(new Date(msg.created_at));
                    let pfData = null;
                    try { const p = JSON.parse(msg.message); if (p.type === 'portfolio_share') pfData = p; } catch { }
                    const isArticle = !pfData && msg.message && msg.message.startsWith('http');
                    const row = document.createElement('div');
                    row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid #f4f4f5;cursor:pointer;';
                    row.innerHTML = avatarHTML(uname, prof?.avatar_url, 40, 13);
                    const textWrap = document.createElement('div');
                    textWrap.style.cssText = 'flex:1;min-width:0;';
                    const labelEl = document.createElement('div');
                    labelEl.style.cssText = "font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;color:#0a0a0a;line-height:1.4;";
                    if (pfData) {
                        labelEl.innerHTML = `@${uname} sent you their portfolio: <span style="color:#00C853;">"${pfData.name}"</span>`;
                    } else {
                        labelEl.appendChild(document.createTextNode(isArticle ? `@${uname} sent you an article about ` : `@${uname} sent you `));
                        const tickerSpan = document.createElement('span');
                        tickerSpan.style.cssText = 'color:#00C853;font-weight:700;';
                        tickerSpan.textContent = msg.ticker || '';
                        labelEl.appendChild(tickerSpan);
                    }
                    const timeEl = document.createElement('div');
                    timeEl.style.cssText = "font-family:'DM Sans',sans-serif;font-size:12px;color:#aaa;margin-top:2px;";
                    timeEl.textContent = timeAgo;
                    textWrap.appendChild(labelEl);
                    textWrap.appendChild(timeEl);
                    row.appendChild(textWrap);
                    if (!msg.read) {
                        const dot = document.createElement('div');
                        dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:#00C853;flex-shrink:0;';
                        row.appendChild(dot);
                    }
                    const delBtn = document.createElement('button');
                    delBtn.textContent = '×';
                    delBtn.style.cssText = 'background:none;border:none;color:#666;font-size:18px;line-height:1;padding:0 0 0 10px;cursor:pointer;flex-shrink:0;transition:color 0.15s;font-family:"DM Sans",sans-serif;';
                    delBtn.addEventListener('mouseenter', () => delBtn.style.color = '#E53935');
                    delBtn.addEventListener('mouseleave', () => delBtn.style.color = '#666');
                    delBtn.addEventListener('touchstart', () => delBtn.style.color = '#E53935', { passive: true });
                    delBtn.addEventListener('touchend', () => delBtn.style.color = '#666', { passive: true });
                    delBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        _dismissInboxItem(msg.id);
                        row.remove();
                        if (!document.getElementById('fr-inbox')?.querySelector('div[style*="border-bottom"]')) loadInbox();
                    });
                    row.appendChild(delBtn);
                    if (pfData) {
                        const captured = pfData;
                        row.addEventListener('click', () => openSharedPortfolio(captured, uname));
                    } else if (isArticle) {
                        const url = msg.message;
                        row.addEventListener('click', () => window.open(url, '_blank', 'noopener,noreferrer'));
                    } else {
                        const ticker = msg.ticker;
                        row.addEventListener('click', () => openStockFromMessage(ticker));
                    }
                    frag.appendChild(row);
                }
                inbox.appendChild(frag);
                updateMessagesBadge();
            } catch (e) {
                inbox.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#bbb;padding:4px 20px 20px;">Could not load messages.</div>`;
            }
        }

        function getTimeAgo(date) {
            const seconds = Math.floor((new Date() - date) / 1000);
            if (seconds < 60) return 'just now';
            if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
            if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
            return Math.floor(seconds / 86400) + 'd ago';
        }

        async function openStockFromMessage(ticker) {
            const { data } = await supabaseClient
                .from('stock_editorial').select('*').eq('ticker', ticker).maybeSingle();
            if (!data) { showToast('Stock not found'); return; }

            const sector = (() => { try { const a = JSON.parse(data.cats || '[]'); return Array.isArray(a) ? a[0] : data.cats; } catch { return data.cats || ''; } })();
            const bullets = data.why ? (Array.isArray(data.why) ? data.why : (() => { try { return JSON.parse(data.why); } catch { return [data.why]; } })()) : ['Shared with you by a friend.'];

            let chartData = {};
            ['1D', '1W', '1M', '3M', '1Y'].forEach(r => {
                let pts = [], p = 100;
                for (let i = 0; i <= 20; i++) { p += (Math.random() - 0.5) * 2; pts.push({ x: i, y: p }); }
                chartData[r] = pts;
            });

            const stockObj = {
                ticker: data.ticker,
                name: data.name || data.ticker,
                desc: data.description || '',
                why: data.why || '',
                tags: data.tags ? (Array.isArray(data.tags) ? data.tags : data.tags.split(',').map(t => t.trim())) : [],
                similar: data.similar || [],
                risk: data.risk || 'Moderate',
                ceo: data.ceo || '-',
                hq: data.hq || '-',
                founded: data.founded || '-',
                employees: data.employees || '-',
                bizModel: data.biz || '',
                short_desc: data.short_desc || '',
                sector,
                price: '...', change: '...', color: 'grey',
                analystClass: 'ab-hold', analyst: 'Hold',
                mcap: '-', pe: '-', ps: '-', div: '-', eps: '-',
                high52: '-', low52: '-', rev: '-', netInc: '-', vol: '-', beta: '-',
                ret1w: '0', ret1m: '0', ret6m: '0', ret1y: '0',
                perfDesc: 'Performance data loading...',
                sentiment: 50,
                riskIcon: data.risk === 'High' ? '🚀' : (data.risk === 'Safe' ? '🛡️' : '⚖️'),
                riskDesc: data.risk === 'High' ? 'High volatility growth play' : (data.risk === 'Safe' ? 'Stable blue-chip company' : 'Balanced growth potential'),
                bullets,
                anBuyPct: 33, anHoldPct: 33, anSellPct: 34, anStr: 'Loading...', anTarget: '-', anUpside: '-',
                chartData,
                priceLoaded: false
            };

            deck.push(stockObj);
            navTo('home');
            setTimeout(() => {
                renderStack();
                expandCard(deck.length - 1);
            }, 300);
        }

        async function updateMessagesBadge() {
            if (!currentUser) return;
            try {
                const { data } = await supabaseClient
                    .from('messages')
                    .select('id')
                    .eq('recipient_id', currentUser.id)
                    .eq('read', false);
                const badge = document.getElementById('friends-badge');
                if (badge) badge.style.display = (data && data.length > 0) ? 'block' : 'none';
            } catch (e) { }
        }

        async function clearInbox() {
            if (!currentUser) return;
            if (!confirm('Clear all inbox messages?')) return;
            try {
                const { data: msgs } = await supabaseClient
                    .from('messages').select('id').eq('recipient_id', currentUser.id);
                const s = _inboxDismissed();
                (msgs || []).forEach(m => s.add(String(m.id)));
                localStorage.setItem('inbox_dismissed_' + currentUser.id, JSON.stringify([...s]));
                loadInbox();
                updateMessagesBadge();
            } catch (e) { showToast('Could not clear inbox.'); }
        }

        // ── Watchlist detail modal ────────────────────────────────────────────────
        let wlDetailChart = null;

        function openWlDetail(ticker) {
            const stock = savedStocks.find(s => s.ticker === ticker);
            if (!stock) return;

            // Push stock to deck so expandCard() can read deck[deck.length - 1]
            const idx = deck.length;
            deck.push(stock);

            const priceDisplay = stock.priceLoaded ? stock.price : '<div style="width:60px;height:24px;background:#333;border-radius:12px;opacity:0.5"></div>';
            const changeDisplay = stock.priceLoaded ? stock.change : '';

            const cardHTML = `
                <div class="swipe-card" id="card-${idx}" style="z-index:${idx}">
                    <div class="card-stamp stamp-pass">BEAR</div>
                    <div class="card-stamp stamp-save">BULL</div>
                    <div class="pull-down-btn" onclick="collapseCard()">↓ Close</div>
                    <div class="card-inner">
                        <div class="c-header" style="align-items:flex-start;position:relative;">
                            <div style="display:flex;flex-direction:row;align-items:flex-start;gap:12px;">
                                <div style="position:relative;flex-shrink:0;margin-top:-4px;">
                                    <img id="card-logo-${stock.ticker}" class="card-logo-avatar" src="" alt="" style="display:none;width:56px;height:56px;border-radius:14px;">
                                    <div id="card-logo-fallback-${stock.ticker}" style="width:56px;height:56px;border-radius:14px;background:#f2f2f2;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;color:#555;font-family:'DM Mono',monospace;flex-shrink:0;">${stock.ticker.slice(0, 2)}</div>
                                </div>
                                <div style="display:flex;flex-direction:column;gap:6px;padding-top:0px;">
                                    <div class="c-ticker">${stock.ticker}</div>
                                    <div class="c-name">${stock.name}</div>
                                </div>
                            </div>
                            <div style="display:flex;flex-direction:column;align-items:flex-end;justify-content:flex-start;gap:6px;padding-top:0px;">
                                <div class="c-price" id="price-${stock.ticker}">${priceDisplay}</div>
                                <div class="c-change ${stock.color}" id="change-${stock.ticker}">${changeDisplay}</div>
                            </div>
                        </div>
                        <div class="chart-container collapsed-only" id="chart-cont-${stock.ticker}">
                            <canvas id="sparkline-${stock.ticker}" style="width:100%;height:100%;display:block;"></canvas>
                        </div>
                        <div class="spk-tab-row collapsed-only" id="spk-tabs-${stock.ticker}">
                            <div class="spk-tab spk-active" onclick="switchSparkline('${stock.ticker}','1D',this)">1D</div>
                            <div class="spk-tab" onclick="switchSparkline('${stock.ticker}','1W',this)">1W</div>
                            <div class="spk-tab" onclick="switchSparkline('${stock.ticker}','1M',this)">1M</div>
                            <div class="spk-tab" onclick="switchSparkline('${stock.ticker}','3M',this)">3M</div>
                            <div class="spk-tab" onclick="switchSparkline('${stock.ticker}','6M',this)">6M</div>
                            <div class="spk-tab" onclick="switchSparkline('${stock.ticker}','1Y',this)">1Y</div>
                            <div class="spk-tab" onclick="switchSparkline('${stock.ticker}','5Y',this)">5Y</div>
                        </div>
                        <div class="exp-chart-wrap expanded-only" id="exp-chart-wrap-${stock.ticker}">
                            <div class="exp-chart-loading" id="exp-chart-loading-${stock.ticker}">Loading chart…</div>
                            <canvas id="exp-canvas-${stock.ticker}" height="200" style="width:100%;display:block;"></canvas>
                            <div class="exp-tab-row" id="exp-tabs-${stock.ticker}">
                                <div class="exp-tab exp-tab-active" onclick="switchExpandedChart('${stock.ticker}', '1D', this)">1D</div>
                                <div class="exp-tab" onclick="switchExpandedChart('${stock.ticker}', '1W', this)">1W</div>
                                <div class="exp-tab" onclick="switchExpandedChart('${stock.ticker}', '1M', this)">1M</div>
                                <div class="exp-tab" onclick="switchExpandedChart('${stock.ticker}', '3M', this)">3M</div>
                                <div class="exp-tab" onclick="switchExpandedChart('${stock.ticker}', '6M', this)">6M</div>
                                <div class="exp-tab" onclick="switchExpandedChart('${stock.ticker}', '1Y', this)">1Y</div>
                                <div class="exp-tab" onclick="switchExpandedChart('${stock.ticker}', '5Y', this)">5Y</div>
                            </div>
                        </div>
                        <div class="c-short-desc collapsed-only">${stock.bizModel}</div>
                        <div class="collapsed-only" style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
                            <div class="c-sect">${stock.sector}</div>
                            <button class="card-share-btn" onclick="shareCardStock('${stock.ticker}', event)" aria-label="Share ${stock.ticker}" style="margin-left:auto;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="#00C853" stroke="none"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                            </button>
                        </div>
                        <div class="expanded-only">
                            <div class="badge-row">
                                <div class="c-sect">${stock.sector}</div>
                            </div>
                            <div class="c-section">
                                <div class="c-sec-title">Company Snapshot</div>
                                <div class="c-desc">${stock.desc}</div>
                                <div class="snap-grid">
                                    <div class="snap-cell"><div class="snap-lbl">Founded</div><div class="snap-val">${stock.founded}</div></div>
                                    <div class="snap-cell"><div class="snap-lbl">HQ</div><div class="snap-val">${stock.hq}</div></div>
                                    <div class="snap-cell"><div class="snap-lbl">Employees</div><div class="snap-val">${stock.employees}</div></div>
                                    <div class="snap-cell"><div class="snap-lbl">CEO</div><div class="snap-val">${stock.ceo}</div></div>
                                </div>
                                <div class="snap-biz">${stock.bizModel}</div>
                            </div>
                            <div class="c-section">
                                <div class="c-sec-title">Why this stock</div>
                                <div class="why-title">WHY IT'S IN YOUR FEED</div>
                                <div class="why-bullets">
                                    ${(stock.bullets || []).map(b => `<div class="why-bullet">${b}</div>`).join('')}
                                </div>
                            </div>
                            <div class="c-section">
                                <div class="c-sec-title">Key Metrics</div>
                                <div class="metrics-grid">
                                    <div class="metric-cell"><div class="metric-name-row"><div class="metric-lbl">P/E RATIO</div><div class="metric-btn" onclick="toggleMetricTooltip(event, 'pe')">i</div></div><div class="metric-val" id="pe-${stock.ticker}">${stock.pe}</div><div class="metric-tooltip">Price-to-Earnings. How much investors pay for $1 of profit.</div></div>
                                    <div class="metric-cell"><div class="metric-name-row"><div class="metric-lbl">P/S RATIO</div><div class="metric-btn" onclick="toggleMetricTooltip(event, 'ps')">i</div></div><div class="metric-val" id="ps-${stock.ticker}">${stock.ps}</div><div class="metric-tooltip">Price-to-Sales. Compares the stock price to revenue.</div></div>
                                    <div class="metric-cell"><div class="metric-name-row"><div class="metric-lbl">EPS</div><div class="metric-btn" onclick="toggleMetricTooltip(event, 'eps')">i</div></div><div class="metric-val" id="eps-${stock.ticker}">${stock.eps}</div><div class="metric-tooltip">Earnings Per Share.</div></div>
                                    <div class="metric-cell"><div class="metric-name-row"><div class="metric-lbl">MARKET CAP</div><div class="metric-btn" onclick="toggleMetricTooltip(event, 'mcap')">i</div></div><div class="metric-val" id="mcap-${stock.ticker}">${stock.mcap}</div><div class="metric-tooltip">The total value of all shares combined.</div></div>
                                    <div class="metric-cell"><div class="metric-name-row"><div class="metric-lbl">DIV YIELD</div><div class="metric-btn" onclick="toggleMetricTooltip(event, 'div')">i</div></div><div class="metric-val" id="div-${stock.ticker}">${stock.div}</div><div class="metric-tooltip">Annual cash payment to shareholders as a % of stock price.</div></div>
                                    <div class="metric-cell"><div class="metric-name-row"><div class="metric-lbl">BETA</div><div class="metric-btn" onclick="toggleMetricTooltip(event, 'beta')">i</div></div><div class="metric-val" id="beta-${stock.ticker}">${stock.beta}</div><div class="metric-tooltip">Measures volatility vs. the market.</div></div>
                                    <div class="metric-cell"><div class="metric-name-row"><div class="metric-lbl">52W HIGH/LOW</div><div class="metric-btn" onclick="toggleMetricTooltip(event, 'highlow')">i</div></div><div class="metric-val" id="highlow-${stock.ticker}">${stock.high52} / ${stock.low52}</div><div class="metric-tooltip">52-week price range.</div></div>
                                    <div class="metric-cell"><div class="metric-name-row"><div class="metric-lbl">REVENUE</div><div class="metric-btn" onclick="toggleMetricTooltip(event, 'rev')">i</div></div><div class="metric-val" id="rev-${stock.ticker}">${stock.rev}</div><div class="metric-tooltip">Total money the company brought in before expenses.</div></div>
                                    <div class="metric-cell"><div class="metric-name-row"><div class="metric-lbl">NET INCOME</div><div class="metric-btn" onclick="toggleMetricTooltip(event, 'netinc')">i</div></div><div class="metric-val" id="netinc-${stock.ticker}">${stock.netInc}</div><div class="metric-tooltip">What's left after all expenses, taxes, and costs.</div></div>
                                    <div class="metric-cell"><div class="metric-name-row"><div class="metric-lbl">VOLUME</div><div class="metric-btn" onclick="toggleMetricTooltip(event, 'vol')">i</div></div><div class="metric-val" id="vol-${stock.ticker}">${stock.vol}</div><div class="metric-tooltip">How many shares traded today.</div></div>
                                </div>
                            </div>
                            <div class="c-section">
                                <div class="c-sec-title">How It Performed vs The Market</div>
                                <div class="perf-desc" style="color:#999;font-size:12px;margin-bottom:10px;">Excess return vs S&amp;P 500</div>
                                <div class="perf-row">
                                    <div class="perf-badge neg" id="rel-1m-${stock.ticker}"><span class="pb-label">1M</span><span class="pb-val">-</span></div>
                                    <div class="perf-badge neg" id="rel-3m-${stock.ticker}"><span class="pb-label">3M</span><span class="pb-val">-</span></div>
                                    <div class="perf-badge neg" id="rel-6m-${stock.ticker}"><span class="pb-label">6M</span><span class="pb-val">-</span></div>
                                    <div class="perf-badge neg" id="rel-1y-${stock.ticker}"><span class="pb-label">1Y</span><span class="pb-val">-</span></div>
                                </div>
                            </div>
                            <div class="c-section">
                                <div class="c-sec-title">Risk & Sentiment</div>
                                <div class="rs-row">
                                    <div class="rs-card">
                                        <div class="rs-lbl">Risk level</div>
                                        <div class="rs-val-row"><span class="rs-icon">${stock.riskIcon}</span><span class="rs-val" id="risk-val-${stock.ticker}">${stock.risk}</span></div>
                                        <div class="rs-desc" id="risk-desc-${stock.ticker}">${stock.riskDesc}</div>
                                    </div>
                                    <div class="rs-card">
                                        <div class="rs-lbl">Market sentiment</div>
                                        <div class="rs-val-row"><span class="rs-val" id="sentiment-val-${stock.ticker}">${stock.sentiment}% Bullish</span></div>
                                        <div class="sentiment-bar-bg">
                                            <div class="sentiment-bar-fill" id="sentiment-fill-${stock.ticker}" style="width: ${stock.sentiment}%; background: ${stock.sentiment > 50 ? '#00C853' : '#E53935'}"></div>
                                        </div>
                                        <div class="sentiment-labels"><span>Bearish</span><span>Bullish</span></div>
                                    </div>
                                </div>
                            </div>
                            <div class="c-section">
                                <div class="c-sec-title">Wall Street Says</div>
                                <div class="tgt-row">
                                    <div class="tgt-buy" id="tgt-buy-${stock.ticker}" style="width: ${stock.anBuyPct}%;"></div>
                                    <div class="tgt-hold" id="tgt-hold-${stock.ticker}" style="width: ${stock.anHoldPct}%;"></div>
                                    <div class="tgt-sell" id="tgt-sell-${stock.ticker}" style="width: ${stock.anSellPct}%;"></div>
                                </div>
                                <div class="tgt-lbls" id="tgt-lbls-${stock.ticker}">${stock.anStr}</div>
                            </div>

                        <button class="card-share-pill" onclick="shareCardStock('${stock.ticker}', event)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#00C853" stroke="none"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                            Send to a Friend
                        </button>
                        <button class="ws-trade-btn" onclick="tradeOnWealthsimple('${stock.ticker}', event)" style="margin-top:8px;margin-bottom:8px;">Trade on Wealthsimple</button>
                        <div style="font-family:'DM Sans',sans-serif;font-size:11px;color:#999;text-align:center;margin-top:6px;pointer-events:none;">Availability may vary based on equity.</div>
                        </div> <!-- /expanded-only -->
                    </div>
                </div>`;

            const stack = document.getElementById('card-stack');
            stack.insertAdjacentHTML('beforeend', cardHTML);
            const cardEl = document.getElementById('card-' + idx);
            topCard = cardEl;
            initDrag(cardEl);

            // Apply logo
            const imgEl = document.getElementById('card-logo-' + ticker);
            const fbEl = document.getElementById('card-logo-fallback-' + ticker);
            if (imgEl && fbEl) {
                if (logoCache[ticker] !== undefined) injectLogo(imgEl, fbEl, ticker);
                else fetchLogo(ticker).then(() => injectLogo(imgEl, fbEl, ticker));
            }

            // Switch to feed screen and expand
            expandCardSource = 'saved';
            document.getElementById('watchlist').classList.remove('active');
            document.getElementById('feed').classList.add('active');
            expandCard();
        }

        function closeWlDetail() {
            document.getElementById('wl-detail-modal').classList.remove('active');
            if (wlDetailChart) { wlDetailChart.destroy(); wlDetailChart = null; }
        }

        function switchWlDetailChart(ticker, range, btn) {
            const row = btn.closest('.wl-detail-tab-row');
            if (row) row.querySelectorAll('.wl-detail-tab').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            const stock = savedStocks.find(s => s.ticker === ticker);
            if (stock) loadWlDetailChart(stock, range);
        }

        function loadWlDetailChart(stock, range) {
            const canvas = document.getElementById('wl-detail-canvas');
            if (!canvas) return;
            const points = (stock.chartData && stock.chartData[range]) || [];
            const isPos = points.length < 2 || points[points.length - 1].y >= points[0].y;
            const lineColor = isPos ? '#00c853' : '#ef5350';
            if (wlDetailChart) { wlDetailChart.destroy(); wlDetailChart = null; }
            wlDetailChart = new Chart(canvas.getContext('2d'), {
                type: 'line',
                data: {
                    labels: points.map((_, i) => i),
                    datasets: [{
                        data: points.map(p => p.y),
                        borderColor: lineColor,
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.4,
                        fill: true,
                        backgroundColor: (ctx) => {
                            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 180);
                            g.addColorStop(0, isPos ? 'rgba(0,200,83,0.18)' : 'rgba(239,83,80,0.18)');
                            g.addColorStop(1, 'rgba(255,255,255,0)');
                            return g;
                        }
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 300 },
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    scales: { x: { display: false }, y: { display: false } }
                }
            });
        }

        // --- Navigation Logic ---
