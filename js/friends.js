        // ───────────────────────────────────────────────────────────

        // --- Render Screens ---
        async function renderFriends() {
            const list = document.getElementById('fr-list');
            if (!list) return;
            if (!currentUser) {
                list.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:14px;color:#888;text-align:center;padding:40px 24px;">Sign in to connect with friends.</div>`;
                return;
            }

            list.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#aaa;text-align:center;padding:24px;">Loading...</div>`;

            try {
                // Fetch all friendships involving current user
                const { data: rows } = await supabaseClient
                    .from('friendships')
                    .select('*')
                    .or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`);

                const friendships = rows || [];

                // Separate into categories
                const accepted = friendships.filter(f => f.status === 'accepted');
                const sentPending = friendships.filter(f => f.status === 'pending' && f.requester_id === currentUser.id);
                const incoming = friendships.filter(f => f.status === 'pending' && f.addressee_id === currentUser.id);

                let html = '';
                let friendData = [];

                // ── Incoming requests ──────────────────────────────────────────
                if (incoming.length > 0) {
                    html += `<div style="font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;color:#aaa;letter-spacing:1px;text-transform:uppercase;padding:0 20px 10px;">Friend Requests</div>`;
                    for (const f of incoming) {
                        const { data: prof } = await supabaseClient
                            .from('user_profiles').select('username, avatar_url').eq('user_id', f.requester_id).maybeSingle();
                        const uname = prof?.username || 'Unknown';
                        html += `
                            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid #f0f0f0;">
                                <div style="display:flex;align-items:center;gap:12px;">
                                    ${avatarHTML(uname, prof?.avatar_url, 40, 13)}
                                    <div style="font-family:'DM Sans',sans-serif;font-weight:600;font-size:15px;color:#0a0a0a;">@${uname}</div>
                                </div>
                                <div style="display:flex;gap:8px;">
                                    <button onclick="respondFriendRequest('${f.id}','accepted')" style="background:#00C853;color:#fff;border:none;border-radius:10px;padding:7px 14px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;">Accept</button>
                                    <button onclick="respondFriendRequest('${f.id}','declined')" style="background:#f4f4f5;color:#888;border:none;border-radius:10px;padding:7px 14px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;">Decline</button>
                                </div>
                            </div>`;
                    }
                }

                // ── Accepted friends ───────────────────────────────────────────
                if (accepted.length > 0) {
                    html += `<div style="font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;color:#aaa;letter-spacing:1px;text-transform:uppercase;padding:16px 20px 10px;">Friends</div>`;

                    // Collect all friend profiles + tickers first
                    for (const f of accepted) {
                        const friendId = f.requester_id === currentUser.id ? f.addressee_id : f.requester_id;
                        const { data: prof } = await supabaseClient
                            .from('user_profiles').select('username, avatar_url').eq('user_id', friendId).maybeSingle();
                        const { data: saved } = await supabaseClient
                            .from('saved_stocks').select('ticker').eq('user_id', friendId).order('saved_at', { ascending: false }).limit(5);
                        friendData.push({ f, friendId, prof, tickerList: (saved || []).map(s => s.ticker) });
                    }

                    // Build HTML per friend
                    for (const { f, friendId, prof, tickerList } of friendData) {
                        const uname = prof?.username || 'Unknown';

                        const tickerPills = tickerList.map(t =>
                            `<div style="background:#f4f4f5;border-radius:8px;padding:4px 8px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;color:#0a0a0a;">${t}</div>`
                        ).join('');

                        html += `
                            <div style="padding:14px 20px;border-bottom:1px solid #f0f0f0;">
                                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                                    <div onclick="showFriendHistory('${friendId}', '${uname}', '${prof?.avatar_url || ''}')" style="display:flex;align-items:center;gap:12px;cursor:pointer;-webkit-tap-highlight-color:transparent;">
                                        ${avatarHTML(uname, prof?.avatar_url, 40, 13)}
                                        <div style="font-family:'DM Sans',sans-serif;font-weight:600;font-size:15px;color:#0a0a0a;">@${uname}</div>
                                    </div>
                                    <div style="position:relative;">
                                        <button onclick="toggleFriendMenu('fmenu-${f.id}', event)" data-menu-toggle style="background:none;border:none;font-size:20px;color:#bbb;cursor:pointer;padding:2px 8px;line-height:1;font-family:'DM Sans',sans-serif;">⋮</button>
                                        <div id="fmenu-${f.id}" class="friend-action-menu" style="display:none;position:absolute;right:0;top:calc(100% + 4px);background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.14);border:1px solid #f0f0f0;z-index:200;min-width:176px;overflow:hidden;">
                                            <div onclick="reportFriend('${f.id}', '${uname}')" style="padding:13px 16px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;color:#E53935;cursor:pointer;border-bottom:1px solid #f4f4f5;-webkit-tap-highlight-color:transparent;">Report @${uname}</div>
                                            <div onclick="removeFriend('${f.id}')" style="padding:13px 16px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;color:#0a0a0a;cursor:pointer;-webkit-tap-highlight-color:transparent;">Remove @${uname}</div>
                                        </div>
                                    </div>
                                </div>
                                ${tickerList.length > 0 ? `<div style="display:flex;gap:6px;flex-wrap:wrap;">${tickerPills}</div>` : `<div style="font-family:'DM Sans',sans-serif;font-size:12px;color:#bbb;">No saved stocks yet</div>`}
                            </div>`;
                    }
                }

                // ── Sent pending ───────────────────────────────────────────────
                if (sentPending.length > 0) {
                    html += `<div style="font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;color:#aaa;letter-spacing:1px;text-transform:uppercase;padding:16px 20px 10px;">Pending</div>`;
                    for (const f of sentPending) {
                        const { data: prof } = await supabaseClient
                            .from('user_profiles').select('username, avatar_url').eq('user_id', f.addressee_id).maybeSingle();
                        const uname = prof?.username || 'Unknown';
                        html += `
                            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid #f0f0f0;">
                                <div style="display:flex;align-items:center;gap:12px;">
                                    ${avatarHTML(uname, prof?.avatar_url, 40, 13)}
                                    <div style="font-family:'DM Sans',sans-serif;font-weight:600;font-size:15px;color:#0a0a0a;">@${uname}</div>
                                </div>
                                <div style="font-family:'DM Sans',sans-serif;font-size:12px;color:#aaa;background:#f4f4f5;border-radius:10px;padding:6px 12px;">Pending</div>
                            </div>`;
                    }
                }

                // ── Empty state ────────────────────────────────────────────────
                if (accepted.length === 0 && incoming.length === 0 && sentPending.length === 0) {
                    renderFriendGraph([]);
                    html = `
                        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 32px;text-align:center;">
                            <div style="font-family:'DM Sans',sans-serif;font-weight:700;font-size:17px;color:#0a0a0a;margin-bottom:8px;">No friends yet</div>
                            <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:#888;line-height:1.5;">Search for friends by username above.</div>
                        </div>`;
                }

                list.innerHTML = html;

                // Build graph nodes from accepted friends data
                const graphNodes = friendData.map(({ prof, friendId, tickerList }) => ({
                    id: friendId,
                    username: prof?.username || '?',
                    avatar: prof?.avatar_url || null,
                    tickerList: tickerList || [],
                }));
                renderFriendGraph(graphNodes);

            } catch (e) {
                console.error('renderFriends error:', e);
                list.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:14px;color:#888;text-align:center;padding:40px;">Something went wrong.</div>`;
            }
            updateFriendsBadge();
        }

        let _frGraphExpanded = false;
        let _frGraphNodes = [];
        let _frOverlaps = {};   // friendId -> [shared tickers]
        let _frTrending = [];   // [{ticker, count, friends:[uname]}]

        async function renderFriendGraph(friends) {
            _frGraphNodes = friends;
            _frGraphExpanded = false;

            // Compute overlap & trending data
            _frOverlaps = {};
            _frTrending = [];
            if (currentUser && friends.length > 0) {
                const { data: myData } = await supabaseClient
                    .from('saved_stocks').select('ticker').eq('user_id', currentUser.id);
                const myTickers = new Set((myData || []).map(s => s.ticker));

                const counts = {};
                friends.forEach(f => {
                    _frOverlaps[f.id] = (f.tickerList || []).filter(t => myTickers.has(t));
                    (f.tickerList || []).forEach(t => {
                        if (!counts[t]) counts[t] = { count: 0, friends: [] };
                        counts[t].count++;
                        counts[t].friends.push(f.username);
                    });
                });
                _frTrending = Object.entries(counts)
                    .sort((a, b) => b[1].count - a[1].count)
                    .slice(0, 15)
                    .map(([ticker, v]) => ({ ticker, ...v }));
            }

            const wrap = document.getElementById('fr-graph');
            if (!wrap) return;
            wrap.style.height = '180px';
            wrap.style.transition = 'height 0.35s cubic-bezier(0.4,0,0.2,1)';
            _frDrawGraph(friends, 180);
            _frInitPillDrag();
        }

        function _frInitPillDrag() {
            // No-op: interaction handled by toggleFrGraph() via onclick in HTML
        }

        function toggleFrGraph() {
            const existing = document.getElementById('fr-graph-overlay');
            if (existing) {
                existing.style.transform = 'translateY(100%)';
                existing.style.opacity = '0';
                setTimeout(() => existing.remove(), 340);
                return;
            }

            const overlay = document.createElement('div');
            overlay.id = 'fr-graph-overlay';
            overlay.style.cssText = 'position:fixed;inset:0;z-index:3000;background:#edf0f3;display:flex;flex-direction:column;padding-top:54px;padding-bottom:84px;transform:translateY(100%);opacity:0;transition:transform 0.38s cubic-bezier(0.32,0.72,0,1),opacity 0.22s ease;';

            // Header — matches .news-header sizing/position with close button
            const header = document.createElement('div');
            header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:16px 24px 8px;flex-shrink:0;';
            header.innerHTML = `
                <div style="font-family:'DM Sans',sans-serif;font-size:24px;font-weight:600;color:#0a0a0a;">Network</div>
                <button onclick="toggleFrGraph()" style="background:#f4f4f5;border:none;border-radius:50%;width:32px;height:32px;font-size:18px;color:#666;cursor:pointer;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;">×</button>
            `;
            overlay.appendChild(header);

            // Feature 4: Trending strip
            if (_frTrending.length > 0) {
                const strip = document.createElement('div');
                strip.style.cssText = 'display:flex;align-items:center;gap:8px;padding:0 20px 12px;flex-shrink:0;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;';
                const label = document.createElement('span');
                label.style.cssText = "font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;color:#999;white-space:nowrap;flex-shrink:0;";
                label.textContent = 'Trending:';
                strip.appendChild(label);
                _frTrending.forEach(({ ticker, count }) => {
                    const pill = document.createElement('div');
                    pill.style.cssText = `background:${count >= 2 ? 'rgba(0,200,83,0.12)' : '#fff'};border:1px solid ${count >= 2 ? 'rgba(0,200,83,0.3)' : '#e8e8e8'};border-radius:100px;padding:4px 10px;display:flex;align-items:center;gap:4px;flex-shrink:0;cursor:pointer;-webkit-tap-highlight-color:transparent;`;
                    pill.innerHTML = `<span style="font-family:'DM Mono',monospace;font-size:11px;font-weight:700;color:${count >= 2 ? '#00a844' : '#333'};">${ticker}</span>${count >= 2 ? `<span style="font-family:'DM Mono',monospace;font-size:9px;color:#00C853;font-weight:700;">${count}</span>` : ''}`;
                    strip.appendChild(pill);
                });
                overlay.appendChild(strip);
            }

            // Graph canvas
            const canvas = document.createElement('div');
            canvas.style.cssText = 'flex:1;position:relative;overflow:hidden;margin:0 16px 16px;border-radius:20px;';
            overlay.appendChild(canvas);

            document.body.appendChild(overlay);

            // Slide up + fade in
            requestAnimationFrame(() => {
                overlay.style.transform = 'translateY(0)';
                overlay.style.opacity = '1';
            });

            // Draw graph
            const H = canvas.offsetHeight || (window.innerHeight - 54 - 84 - 60);
            const W = canvas.offsetWidth || (window.innerWidth - 32);

            // Pan container — graph lives here so we can translate it
            const panContainer = document.createElement('div');
            panContainer.style.cssText = `position:absolute;width:${W}px;height:${H}px;top:0;left:0;will-change:transform;`;
            canvas.appendChild(panContainer);
            _frDrawGraphInto(panContainer, _frGraphNodes, W, H, true);

            // Touch pan + pinch zoom
            let panX = 0, panY = 0, scale = 1;
            let startTX = 0, startTY = 0;
            let pinchStartDist = 0, pinchStartScale = 1;
            let mode = null; // 'pan' | 'pinch'

            function applyTransform() {
                panContainer.style.transform = `translate(${panX}px,${panY}px) scale(${scale})`;
                panContainer.style.transformOrigin = '50% 50%';
            }

            function getTouchDist(e) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                return Math.sqrt(dx * dx + dy * dy);
            }

            canvas.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    mode = 'pan';
                    startTX = e.touches[0].clientX - panX;
                    startTY = e.touches[0].clientY - panY;
                } else if (e.touches.length === 2) {
                    mode = 'pinch';
                    pinchStartDist = getTouchDist(e);
                    pinchStartScale = scale;
                }
            }, { passive: true });

            canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
                if (mode === 'pan' && e.touches.length === 1) {
                    panX = e.touches[0].clientX - startTX;
                    panY = e.touches[0].clientY - startTY;
                    applyTransform();
                } else if (mode === 'pinch' && e.touches.length === 2) {
                    const dist = getTouchDist(e);
                    scale = Math.min(3, Math.max(0.4, pinchStartScale * (dist / pinchStartDist)));
                    applyTransform();
                }
            }, { passive: false });

            canvas.addEventListener('touchend', (e) => {
                if (e.touches.length < 2) mode = e.touches.length === 1 ? 'pan' : null;
                if (mode === 'pan' && e.touches.length === 1) {
                    startTX = e.touches[0].clientX - panX;
                    startTY = e.touches[0].clientY - panY;
                }
            }, { passive: true });
        }

        function _frDrawGraph(friends, H) {
            const wrap = document.getElementById('fr-graph');
            if (!wrap) return;
            _frDrawGraphInto(wrap, friends, wrap.offsetWidth || 390, H, false);
        }

        // Deterministic pseudo-random from index — consistent across renders
        function _frRng(i) { const x = Math.sin(i + 1.7) * 10000; return x - Math.floor(x); }

        function _frDrawGraphInto(wrap, friends, W, H, isOverlay) {
            wrap.innerHTML = '';
            const CX = W / 2;
            const CY = H / 2;
            const NODE_R = isOverlay ? 28 : 18;
            const YOU_R  = isOverlay ? 34 : 22;
            const n = friends.length;

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', W);
            svg.setAttribute('height', H);
            svg.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
            wrap.appendChild(svg);

            if (n === 0) {
                wrap.appendChild(_frNode(CX, CY, YOU_R, null, true, null));
                if (isOverlay) {
                    const hint = document.createElement('div');
                    hint.style.cssText = `position:absolute;left:50%;transform:translateX(-50%);bottom:10px;font-family:'DM Sans',sans-serif;font-size:11px;color:#bbb;white-space:nowrap;`;
                    hint.textContent = 'Add friends to build your network';
                    wrap.appendChild(hint);
                }
                return;
            }

            // Overlay: sort by overlap for clustering; preview: original order
            const sorted = isOverlay
                ? [...friends].sort((a, b) => ((_frOverlaps[b.id] || []).length) - ((_frOverlaps[a.id] || []).length))
                : friends;

            const maxOrbit = Math.min(CX, CY) - NODE_R - (isOverlay ? 16 : 6);
            const minOrbit = maxOrbit * (isOverlay ? 0.42 : 0.45);

            // Random orbit per node — angles evenly distributed, radii vary
            const nodes = [];
            sorted.forEach((f, i) => {
                const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
                const rand = _frRng(i);
                let orbitR = minOrbit + rand * (maxOrbit - minOrbit);
                // Overlay: cluster high-overlap friends slightly inward
                if (isOverlay) orbitR -= Math.min(14, ((_frOverlaps[f.id] || []).length) * 3);
                const x = CX + orbitR * Math.cos(angle);
                const y = CY + orbitR * Math.sin(angle);
                nodes.push({ x, y, orbitR, angle, ...f });

                const overlap = isOverlay ? (_frOverlaps[f.id] || []).length : 0;
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', CX); line.setAttribute('y1', CY);
                line.setAttribute('x2', x);  line.setAttribute('y2', y);
                if (!isOverlay || overlap === 0) {
                    line.setAttribute('stroke', '#ddd');
                    line.setAttribute('stroke-width', isOverlay ? '1.5' : '1');
                    line.setAttribute('stroke-dasharray', '4 4');
                } else {
                    line.setAttribute('stroke', `rgba(0,200,83,${Math.min(0.7, 0.2 + overlap * 0.12)})`);
                    line.setAttribute('stroke-width', Math.min(4, 1.5 + overlap * 0.6).toString());
                }
                svg.appendChild(line);
            });

            // Overlay-only: overlap badges + stock bubbles
            if (isOverlay) {
                nodes.forEach(node => {
                    const overlap = (_frOverlaps[node.id] || []).length;
                    if (overlap === 0) return;
                    const mx = (CX + node.x) / 2;
                    const my = (CY + node.y) / 2;
                    const badge = document.createElement('div');
                    badge.style.cssText = `position:absolute;left:${mx - 10}px;top:${my - 10}px;width:20px;height:20px;border-radius:50%;background:#00C853;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 1px 4px rgba(0,200,83,0.4);z-index:5;-webkit-tap-highlight-color:transparent;`;
                    badge.innerHTML = `<span style="font-family:'DM Mono',monospace;font-size:9px;font-weight:700;color:#fff;">${overlap}</span>`;
                    badge.addEventListener('click', (e) => { e.stopPropagation(); showOverlapSheet(node.username, node.avatar || '', _frOverlaps[node.id] || []); });
                    wrap.appendChild(badge);
                });

                _frTrending.filter(t => t.count >= 2).slice(0, 6).forEach(({ ticker, count, friends: fnames }) => {
                    const matchNodes = nodes.filter(nd => fnames.includes(nd.username));
                    if (matchNodes.length === 0) return;
                    const avgX = matchNodes.reduce((s, nd) => s + nd.x, 0) / matchNodes.length;
                    const avgY = matchNodes.reduce((s, nd) => s + nd.y, 0) / matchNodes.length;
                    const bx = CX + 0.42 * (avgX - CX);
                    const by = CY + 0.42 * (avgY - CY);
                    const size = 28 + Math.min(count, 4) * 4;
                    const bubble = document.createElement('div');
                    bubble.style.cssText = `position:absolute;left:${bx - size / 2}px;top:${by - size / 2}px;width:${size}px;height:${size}px;border-radius:50%;background:rgba(0,200,83,0.12);border:1.5px solid rgba(0,200,83,0.35);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:4;-webkit-tap-highlight-color:transparent;`;
                    bubble.innerHTML = `<span style="font-family:'DM Mono',monospace;font-size:${size > 34 ? 10 : 9}px;font-weight:700;color:#00a844;">${ticker}</span>`;
                    bubble.addEventListener('click', (e) => { e.stopPropagation(); showBubbleSheet(ticker, count, fnames); });
                    wrap.appendChild(bubble);
                });
            }

            // Friend nodes
            nodes.forEach(node => {
                const el = _frNode(node.x, node.y, NODE_R, node.avatar, false, node.username);
                if (isOverlay) {
                    el.style.cursor = 'pointer';
                    el.addEventListener('click', () => showFriendSaves(node.id, node.username, node.avatar || '', node.tickerList || []));
                }
                wrap.appendChild(el);
            });

            wrap.appendChild(_frNode(CX, CY, YOU_R, null, true, null));
        }


        function _frNode(x, y, r, avatarUrl, isYou, username) {
            const wrap = document.createElement('div');
            const d = r * 2;
            wrap.style.cssText = `position:absolute;left:${x - r}px;top:${y - r}px;width:${d}px;height:${d}px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-direction:column;`;

            const circle = document.createElement('div');
            circle.style.cssText = `width:${d}px;height:${d}px;border-radius:50%;overflow:hidden;border:2px solid ${isYou ? '#00C853' : '#e8e8e8'};background:${isYou ? 'rgba(0,200,83,0.12)' : '#f4f4f5'};display:flex;align-items:center;justify-content:center;box-shadow:${isYou ? '0 0 0 3px rgba(0,200,83,0.15)' : 'none'};`;

            if (avatarUrl) {
                const img = document.createElement('img');
                img.src = avatarUrl;
                img.style.cssText = `width:100%;height:100%;object-fit:cover;`;
                img.onerror = () => { img.remove(); circle.appendChild(_frInitials(username || '?', r, isYou)); };
                circle.appendChild(img);
            } else {
                circle.appendChild(_frInitials(username || '', r, isYou));
            }
            wrap.appendChild(circle);

            // Only label the "You" node
            if (isYou) {
                const lbl = document.createElement('div');
                lbl.style.cssText = `position:absolute;top:${d + 3}px;left:50%;transform:translateX(-50%);font-family:'DM Sans',sans-serif;font-size:9px;font-weight:600;color:#00C853;white-space:nowrap;`;
                lbl.textContent = 'You';
                wrap.appendChild(lbl);
            }

            return wrap;
        }

        function _frInitials(label, r, isYou) {
            const span = document.createElement('span');
            span.style.cssText = `font-family:'DM Mono',monospace;font-size:${Math.max(8, r * 0.5)}px;font-weight:700;color:${isYou ? '#00C853' : '#aaa'};`;
            span.textContent = isYou ? 'Y' : (label || '?').slice(0, 2).toUpperCase();
            return span;
        }

        let _searchTimeout = null;
        async function searchFriends(query) {
            const results = document.getElementById('fr-search-results');
            if (!results) return;
            if (!query || query.trim().length < 2) { results.innerHTML = ''; return; }

            clearTimeout(_searchTimeout);
            _searchTimeout = setTimeout(async () => {
                results.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#aaa;padding:8px 4px;">Searching...</div>`;
                try {
                    const { data: users } = await supabaseClient
                        .from('user_profiles')
                        .select('user_id, username, avatar_url')
                        .ilike('username', `%${query.trim()}%`)
                        .neq('user_id', currentUser?.id || '')
                        .limit(5);

                    if (!users || users.length === 0) {
                        results.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#aaa;padding:8px 4px;">No users found.</div>`;
                        return;
                    }

                    // Check existing friendship statuses
                    const { data: existing } = await supabaseClient
                        .from('friendships')
                        .select('*')
                        .or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`);

                    const friendMap = {};
                    (existing || []).forEach(f => {
                        const otherId = f.requester_id === currentUser.id ? f.addressee_id : f.requester_id;
                        friendMap[otherId] = f;
                    });

                    let html = '';
                    for (const u of users) {
                        const f = friendMap[u.user_id];
                        let btn = '';
                        if (!f) {
                            btn = `<button onclick="sendFriendRequest('${u.user_id}')" style="background:#00C853;color:#fff;border:none;border-radius:10px;padding:7px 14px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;">Add</button>`;
                        } else if (f.status === 'pending' && f.requester_id === currentUser.id) {
                            btn = `<div style="font-family:'DM Sans',sans-serif;font-size:12px;color:#aaa;background:#f4f4f5;border-radius:10px;padding:6px 12px;">Pending</div>`;
                        } else if (f.status === 'accepted') {
                            btn = `<div style="font-family:'DM Sans',sans-serif;font-size:12px;color:#00C853;background:rgba(0,200,83,0.1);border-radius:10px;padding:6px 12px;">Friends ✓</div>`;
                        } else if (f.status === 'pending' && f.addressee_id === currentUser.id) {
                            btn = `<button onclick="respondFriendRequest('${f.id}','accepted')" style="background:#00C853;color:#fff;border:none;border-radius:10px;padding:7px 14px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;">Accept</button>`;
                        }
                        html += `
                            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 4px;border-bottom:1px solid #f4f4f5;">
                                <div style="display:flex;align-items:center;gap:10px;">
                                    ${avatarHTML(u.username, u.avatar_url, 36, 12)}
                                    <div style="font-family:'DM Sans',sans-serif;font-weight:600;font-size:14px;color:#0a0a0a;">@${u.username}</div>
                                </div>
                                ${btn}
                            </div>`;
                    }
                    results.innerHTML = `<div style="background:#fff;border-radius:14px;border:1px solid #f0f0f0;padding:4px 12px;">${html}</div>`;
                } catch (e) {
                    results.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#aaa;padding:8px 4px;">Search failed.</div>`;
                }
            }, 350);
        }

        async function sendFriendRequest(addresseeId) {
            if (!currentUser) return;
            try {
                await supabaseClient.from('friendships').insert({
                    requester_id: currentUser.id,
                    addressee_id: addresseeId,
                    status: 'pending'
                });
                showToast('Friend request sent!');
                searchFriends(document.getElementById('fr-search-input')?.value || '');
            } catch (e) { showToast('Could not send request.'); }
        }

        async function respondFriendRequest(friendshipId, newStatus) {
            try {
                await supabaseClient.from('friendships')
                    .update({ status: newStatus })
                    .eq('id', friendshipId);
                showToast(newStatus === 'accepted' ? 'Friend added!' : 'Request declined.');
                renderFriends();
            } catch (e) { showToast('Something went wrong.'); }
        }

        function closeFriendHistory() {
            document.getElementById('fr-hist-modal').classList.remove('active');
        }

        // ── Network overlay sheets ─────────────────────────────────────────────────

        function _frSheet(title, rows) {
            const existing = document.getElementById('fr-net-sheet');
            if (existing) existing.remove();
            const sheet = document.createElement('div');
            sheet.id = 'fr-net-sheet';
            sheet.style.cssText = 'position:fixed;inset:0;z-index:4000;display:flex;flex-direction:column;justify-content:flex-end;';
            const backdrop = document.createElement('div');
            backdrop.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.25);';
            backdrop.onclick = () => sheet.remove();
            sheet.appendChild(backdrop);
            const panel = document.createElement('div');
            panel.style.cssText = 'position:relative;background:#fff;border-radius:24px 24px 0 0;padding:20px 20px 40px;max-height:65vh;display:flex;flex-direction:column;transform:translateY(100%);transition:transform 0.25s cubic-bezier(0.4,0,0.2,1);';
            const hdr = document.createElement('div');
            hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-shrink:0;';
            hdr.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:16px;font-weight:700;color:#0a0a0a;">${title}</div><button onclick="document.getElementById('fr-net-sheet').remove()" style="background:#f4f4f5;border:none;border-radius:50%;width:28px;height:28px;font-size:16px;color:#666;cursor:pointer;display:flex;align-items:center;justify-content:center;">x</button>`;
            panel.appendChild(hdr);
            const scroll = document.createElement('div');
            scroll.style.cssText = 'overflow-y:auto;flex:1;';
            rows(scroll);
            panel.appendChild(scroll);
            sheet.appendChild(panel);
            document.body.appendChild(sheet);
            requestAnimationFrame(() => { panel.style.transform = 'translateY(0)'; });
        }

        async function showFriendSaves(friendId, uname, avatarUrl, tickers) {
            _frSheet(`@${uname}'s Saves`, (scroll) => {
                if (!tickers || tickers.length === 0) {
                    scroll.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:14px;color:#aaa;text-align:center;padding:24px;">No saves yet.</div>`;
                    return;
                }
                tickers.forEach(ticker => {
                    const stockInfo = (typeof deck !== 'undefined' ? deck : []).find(d => d.ticker === ticker);
                    const name = stockInfo?.name || ticker;
                    const price = stockInfo?.price ? `$${Number(stockInfo.price).toFixed(2)}` : '';
                    const chg = stockInfo?.change;
                    const chgStr = chg != null ? `${chg >= 0 ? '+' : ''}${Number(chg).toFixed(2)}%` : '';
                    const chgColor = chg >= 0 ? '#00C853' : '#E53935';
                    const row = document.createElement('div');
                    row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid #f4f4f5;';
                    row.innerHTML = `
                        <div style="width:40px;height:40px;border-radius:12px;background:#f4f4f5;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:700;color:#0a0a0a;">${ticker}</span>
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;color:#0a0a0a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</div>
                            <div style="display:flex;gap:6px;margin-top:2px;">
                                <span style="font-family:'DM Mono',monospace;font-size:11px;color:#888;">${price}</span>
                                ${chgStr ? `<span style="font-family:'DM Mono',monospace;font-size:11px;color:${chgColor};">${chgStr}</span>` : ''}
                            </div>
                        </div>
                    `;
                    scroll.appendChild(row);
                });
            });
        }

        function showOverlapSheet(uname, avatarUrl, sharedTickers) {
            _frSheet(`You & @${uname} both saved`, (scroll) => {
                if (!sharedTickers || sharedTickers.length === 0) {
                    scroll.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:14px;color:#aaa;text-align:center;padding:24px;">No shared saves yet.</div>`;
                    return;
                }
                sharedTickers.forEach(ticker => {
                    const stockInfo = (typeof deck !== 'undefined' ? deck : []).find(d => d.ticker === ticker);
                    const name = stockInfo?.name || ticker;
                    const pill = document.createElement('div');
                    pill.style.cssText = 'display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid #f4f4f5;';
                    pill.innerHTML = `
                        <div style="width:40px;height:40px;border-radius:12px;background:rgba(0,200,83,0.1);border:1.5px solid rgba(0,200,83,0.25);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:700;color:#00a844;">${ticker}</span>
                        </div>
                        <div style="font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;color:#0a0a0a;">${name}</div>
                        <div style="margin-left:auto;font-family:'DM Mono',monospace;font-size:10px;color:#00C853;font-weight:700;">MATCH</div>
                    `;
                    scroll.appendChild(pill);
                });
            });
        }

        function showBubbleSheet(ticker, count, friendNames) {
            const stockInfo = (typeof deck !== 'undefined' ? deck : []).find(d => d.ticker === ticker);
            const name = stockInfo?.name || ticker;
            _frSheet(`${ticker} — ${name}`, (scroll) => {
                const info = document.createElement('div');
                info.style.cssText = 'font-family:"DM Sans",sans-serif;font-size:14px;color:#888;margin-bottom:16px;';
                info.textContent = `Saved by ${count} friend${count > 1 ? 's' : ''} in your network:`;
                scroll.appendChild(info);
                friendNames.forEach(uname => {
                    const row = document.createElement('div');
                    row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f4f4f5;';
                    row.innerHTML = `<div style="width:8px;height:8px;border-radius:50%;background:#00C853;flex-shrink:0;"></div><div style="font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;color:#0a0a0a;">@${uname}</div>`;
                    scroll.appendChild(row);
                });
            });
        }

        async function showFriendHistory(friendId, uname, avatar_url) {
            if (!currentUser) return;
            const modal = document.getElementById('fr-hist-modal');
            const titleEl = document.getElementById('fr-hist-title');
            const bodyEl = document.getElementById('fr-hist-body');

            titleEl.innerHTML = `
                ${avatarHTML(uname, avatar_url, 32, 11)}
                <span>${uname}'s History</span>
            `;
            bodyEl.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#bbb;padding:24px;text-align:center;">Loading history...</div>`;
            modal.classList.add('active');

            try {
                const { data: msgs } = await supabaseClient
                    .from('messages')
                    .select('*')
                    .eq('sender_id', friendId)
                    .eq('recipient_id', currentUser.id)
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (!msgs || msgs.length === 0) {
                    bodyEl.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#bbb;padding:24px;text-align:center;">No history from this friend yet.</div>`;
                    return;
                }

                bodyEl.innerHTML = '';
                const frag = document.createDocumentFragment();
                for (const msg of msgs) {
                    const timeAgo = getTimeAgo(new Date(msg.created_at));
                    let pfData = null;
                    try { const p = JSON.parse(msg.message); if (p.type === 'portfolio_share') pfData = p; } catch { }
                    const isArticle = !pfData && msg.message && msg.message.startsWith('http');

                    const row = document.createElement('div');
                    row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid #f4f4f5;cursor:pointer;-webkit-tap-highlight-color:transparent;';

                    const textWrap = document.createElement('div');
                    textWrap.style.cssText = 'flex:1;min-width:0;';
                    const labelEl = document.createElement('div');
                    labelEl.style.cssText = "font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;color:#0a0a0a;line-height:1.4;";

                    if (pfData) {
                        labelEl.innerHTML = `Sent you portfolio: <span style="color:#00C853;">"${pfData.name}"</span>`;
                    } else if (isArticle) {
                        labelEl.innerHTML = `Sent you an article about <span style="color:#00C853;font-weight:700;">${msg.ticker || ''}</span>`;
                    } else {
                        labelEl.innerHTML = `Sent you <span style="color:#00C853;font-weight:700;">${msg.ticker || ''}</span>`;
                    }

                    const timeEl = document.createElement('div');
                    timeEl.style.cssText = "font-family:'DM Sans',sans-serif;font-size:12px;color:#aaa;margin-top:2px;";
                    timeEl.textContent = timeAgo;

                    textWrap.appendChild(labelEl);
                    textWrap.appendChild(timeEl);
                    row.appendChild(textWrap);

                    const delBtn = document.createElement('button');
                    delBtn.textContent = '×';
                    delBtn.style.cssText = 'background:none;border:none;color:#666;font-size:18px;line-height:1;padding:0 0 0 10px;cursor:pointer;flex-shrink:0;transition:color 0.15s;font-family:"DM Sans",sans-serif;';
                    delBtn.addEventListener('mouseenter', () => delBtn.style.color = '#E53935');
                    delBtn.addEventListener('mouseleave', () => delBtn.style.color = '#666');
                    delBtn.addEventListener('touchstart', () => delBtn.style.color = '#E53935', { passive: true });
                    delBtn.addEventListener('touchend', () => delBtn.style.color = '#666', { passive: true });
                    delBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        await supabaseClient.from('messages').delete().eq('id', msg.id);
                        showFriendHistory(friendId, uname, avatar_url); // Refresh the list
                    });
                    row.appendChild(delBtn);

                    if (pfData) {
                        const captured = pfData;
                        row.addEventListener('click', () => { closeFriendHistory(); openSharedPortfolio(captured, uname); });
                    } else if (isArticle) {
                        const url = msg.message;
                        row.addEventListener('click', () => window.open(url, '_blank', 'noopener,noreferrer'));
                    } else {
                        const ticker = msg.ticker;
                        row.addEventListener('click', () => { closeFriendHistory(); openStockFromMessage(ticker); });
                    }

                    frag.appendChild(row);
                }
                bodyEl.appendChild(frag);
            } catch (err) {
                console.error('Error loading friend history:', err);
                bodyEl.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#bbb;padding:24px;text-align:center;">Could not load history.</div>`;
            }
        }

        function toggleFriendMenu(menuId, event) {
            event.stopPropagation();
            document.querySelectorAll('.friend-action-menu').forEach(m => {
                if (m.id !== menuId) m.style.display = 'none';
            });
            const menu = document.getElementById(menuId);
            if (!menu) return;
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        }

        function reportFriend(friendshipId, uname) {
            document.querySelectorAll('.friend-action-menu').forEach(m => m.style.display = 'none');
            if (confirm(`Are you sure you want to report @${uname}?\n\nThis will also remove them from your friends.`)) {
                const reporter = window._username || currentUser?.email || 'unknown';
                fetch('https://rzvrdvvzxgwccldqnxbm.supabase.co/functions/v1/report-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reporter, reported: uname })
                }).catch(() => {});
                removeFriend(friendshipId);
            }
        }

        document.addEventListener('click', (e) => {
            if (!e.target.closest('[data-menu-toggle]') && !e.target.closest('.friend-action-menu')) {
                document.querySelectorAll('.friend-action-menu').forEach(m => m.style.display = 'none');
            }
        });

        async function removeFriend(friendshipId) {
            try {
                // Look up the friend's user ID before deleting the friendship
                const { data: fs } = await supabaseClient.from('friendships').select('requester_id,addressee_id').eq('id', friendshipId).maybeSingle();
                await supabaseClient.from('friendships').delete().eq('id', friendshipId);
                if (fs && currentUser) {
                    const friendId = fs.requester_id === currentUser.id ? fs.addressee_id : fs.requester_id;
                    // Delete messages in both directions so History clears on unfriend
                    await supabaseClient.from('messages').delete().match({ sender_id: friendId, recipient_id: currentUser.id });
                    await supabaseClient.from('messages').delete().match({ sender_id: currentUser.id, recipient_id: friendId });
                }
                showToast('Friend removed.');
                renderFriends();
            } catch (e) { showToast('Something went wrong.'); }
        }

        async function updateFriendsBadge() {
            if (!currentUser) return;
            try {
                const { data } = await supabaseClient
                    .from('friendships')
                    .select('id')
                    .eq('addressee_id', currentUser.id)
                    .eq('status', 'pending');
                const badge = document.getElementById('friends-badge');
                if (!badge) return;
                badge.style.display = (data && data.length > 0) ? 'block' : 'none';
            } catch (e) { }
        }

        function subscribeToFriendships() {
            if (!currentUser || window._friendshipSubscribed) return;
            window._friendshipSubscribed = true;

            supabaseClient
                .channel('friendships-changes')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'friendships',
                    filter: `addressee_id=eq.${currentUser.id}`
                }, (payload) => {
                    updateFriendsBadge();
                    const friendsScene = document.getElementById('friends-scene');
                    if (friendsScene && friendsScene.classList.contains('active')) {
                        renderFriends();
                    }
                })
                .subscribe();

            supabaseClient
                .channel('messages-changes')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `recipient_id=eq.${currentUser.id}`
                }, (payload) => {
                    updateMessagesBadge();
                    const friendsScene = document.getElementById('friends-scene');
                    if (friendsScene && friendsScene.classList.contains('active')) {
                        loadInbox();
                    }
                })
                .subscribe();
        }
