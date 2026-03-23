        // ─────────────────────────────────────────────────────────────────────────
        // BUCKET SYSTEM
        // ─────────────────────────────────────────────────────────────────────────

        const BUCKET_DATA = {
            'tech-titans': {
                id: 'tech-titans', name: 'Tech Titans',
                tagline: 'The blue-chips of the digital era',
                description: 'Apple\'s ecosystem, Google\'s search dominance, Microsoft\'s cloud empire — the proven tech giants that built the modern world and keep growing.',
                investorType: 'For the long-term believer that software will run everything.',
                highlights: ['AAPL','MSFT','NVDA','GOOG'],
                universe: new Set(["MSFT","GOOG","META","AAPL","NVDA","CRM","ORCL","IBM","NOW","ADBE","SNOW","VEEV","DDOG","MDB","NET","CRWD","ZS","HUBS","AVGO","TSM","ASML","QCOM","TXN","INTC","PINS","TTD","EA","SHOP","GTLB","CFLT","ESTC"]),
                sharpe_5y: 1.42, return_5y: 148.3, color: '#00C853',
                quizMatch: ['AI & Tech', 'Semis', 'Social Media', 'Gaming']
            },
            'hypergrowth': {
                id: 'hypergrowth', name: 'Hypergrowth',
                tagline: 'AI disruptors, semis, and the next big thing',
                description: 'NVIDIA\'s GPU empire, AMD\'s chip renaissance, Palantir\'s AI contracts — the companies growing 30%+ a year and not slowing down.',
                investorType: 'For the risk-tolerant investor chasing 30%+ annual growth plays.',
                highlights: ['NVDA','PLTR','AMD','NET'],
                universe: new Set(["NVDA","AMD","PLTR","APP","AI","SOUN","PATH","BBAI","AMAT","LRCX","MU","MRVL","ON","MPWR","SWKS","LSCC","ENTG","SLAB","RMBS","SMTC","DIOD","POWI","DV","PUBM","MGNI","IONQ","QBTS","ARQQ","RGTI","CFLT","GTLB","NET","CRWD","ZS","DDOG","SNOW","RDDT","TTD","RBLX","U","TTWO"]),
                sharpe_5y: 1.61, return_5y: 187.4, color: '#00C853',
                quizMatch: ['AI & Tech', 'Semis', 'Gaming']
            },
            'voltage': {
                id: 'voltage', name: 'Voltage',
                tagline: 'Energy, EVs, and the power behind everything',
                description: 'Oil majors, clean energy disruptors, crypto miners — the full energy spectrum from fossil fuels to solar panels to Bitcoin rigs.',
                investorType: 'For the energy transition bull — EV, solar, crypto, or all three.',
                highlights: ['TSLA','ENPH','XOM','COIN'],
                universe: new Set(["TSLA","ENPH","NEE","FSLR","BEP","SEDG","PLUG","RUN","RIVN","LCID","NIO","LI","CHPT","BLNK","EVGO","BE","ARRY","NOVA","SHLS","AMPX","XOM","CVX","COP","SLB","BHP","RIO","NEM","FCX","AR","CTRA","DVN","FANG","HAL","MPC","PSX","VLO","WMB","KMI","OXY","MRO","COIN","MSTR","MARA","RIOT","CLSK","HUT","BTBT","BITF","IREN","BITO","WULF","CORZ"]),
                sharpe_5y: 0.84, return_5y: 91.2, color: '#00C853',
                quizMatch: ['EVs & Clean Energy', 'Energy', 'Crypto']
            },
            'vital-signs': {
                id: 'vital-signs', name: 'Vital Signs',
                tagline: 'Healthcare, biotech, and the science of living longer',
                description: 'From Eli Lilly\'s blockbuster drugs to CRISPR gene editors — companies racing to cure diseases and extend human life.',
                investorType: 'For the healthcare optimist betting that science solves the big problems.',
                highlights: ['LLY','ISRG','MRNA','CRSP'],
                universe: new Set(["LLY","JNJ","UNH","ABBV","MRK","PFE","AMGN","GILD","MRNA","REGN","DXCM","ISRG","VRTX","BIIB","ILMN","EXAS","HIMS","RXRX","BEAM","CRSP","EDIT","NTLA","TGTX","IMVT","KYMR","PRAX","CERT","SDGR","FOLD","DNLI","NVCR","ACAD","NVAX","PACB","TDOC","NARI","AGEN","AGIO","MGNX","ARCT"]),
                sharpe_5y: 1.08, return_5y: 74.6, color: '#00C853',
                quizMatch: ['Healthcare']
            },
            'old-money': {
                id: 'old-money', name: 'Old Money',
                tagline: 'Dividends, real estate, and compounding wealth',
                description: 'McDonald\'s, Costco, REITs, consumer staples — the boring-in-a-good-way companies that quietly compound your wealth decade after decade.',
                investorType: 'For the steady compounder who wants boring, reliable wealth-building.',
                highlights: ['JPM','COST','MCD','AMT'],
                universe: new Set(["AMT","PLD","EQIX","CCI","SPG","PSA","DLR","WELL","IRM","VTR","EXR","DBRG","JPM","BAC","WFC","MCD","KO","PEP","MDLZ","GIS","WMT","COST","TGT","HD","LMT","RTX","NOC","GD","HII","PM","MO","T","VZ","PG","CL","KMB","MMM","ABT","EMR","XOM","CVX"]),
                sharpe_5y: 1.18, return_5y: 63.8, color: '#00C853',
                quizMatch: ['Real Estate', 'Food', 'Retail', 'Defense']
            },
            'brands': {
                id: 'brands', name: 'The Brands',
                tagline: 'The labels people wear, buy, and obsess over',
                description: 'Nike\'s swoosh, Lululemon\'s leggings, Crocs\' clogs — consumer brands with loyal followings, pricing power, and products people actually want.',
                investorType: 'For the consumer-first investor who thinks brand loyalty is a durable moat.',
                highlights: ['NKE','LULU','SBUX','DIS'],
                universe: new Set(["NKE","LULU","UA","ONON","CROX","SKX","COLM","DECK","BOOT","PVH","VFC","LEVI","TPR","CPRI","RVLV","BURL","FIVE","OLLI","ULTA","EL","BBWI","PTON","ETSY","EBAY","CHWY","SFIX","REAL","POSH","AMZN","ANF","AEO","GPS","URBN","EXPR","ZUMZ","TLYS","PRPL","LOVE","DIS","NFLX","SPOT","BMBL","MTCH","CELH","WING","SHAK","BROS","DKNG","CMG","SBUX","YUM","MNST","DNUT","PZZA","JACK","DENN"]),
                sharpe_5y: 1.09, return_5y: 71.4, color: '#00C853',
                quizMatch: ['Retail', 'Social Media']
            },
            'fintech-finance': {
                id: 'fintech-finance', name: 'Fintech & Finance',
                tagline: 'Payments, banking, and the future of money',
                description: 'Visa\'s payment network, Goldman\'s trading desks, SoFi\'s digital banking — the infrastructure moving every dollar in the global economy.',
                investorType: 'For the money-in-motion investor who follows where capital flows.',
                highlights: ['V','JPM','PYPL','SQ'],
                universe: new Set(["JPM","BAC","WFC","GS","MS","V","MA","AXP","BLK","PYPL","SCHW","ICE","NDAQ","SQ","AFRM","SOFI","HOOD","NU","MKTX","INTU","COIN","MSTR","RIOT","MARA","CLSK","HUT","BTBT","BITO","IREN","WULF"]),
                sharpe_5y: 1.13, return_5y: 79.2, color: '#00C853',
                quizMatch: ['Finance', 'Crypto']
            },
            'world-tour': {
                id: 'world-tour', name: 'World Tour',
                tagline: 'Global markets, travel, and stories beyond Wall Street',
                description: 'Alibaba, MercadoLibre, Airbnb, Boeing — companies that move people, money, and goods across the world.',
                investorType: 'For the global-minded investor with conviction beyond US borders.',
                highlights: ['MELI','ABNB','BABA','UBER'],
                universe: new Set(["BABA","TCEHY","MELI","SE","JD","PDD","XPEV","STNE","PAGS","GRAB","MNSO","ABNB","BKNG","EXPE","MAR","HLT","DAL","UAL","CCL","UBER","TRIP","NCLH","RCL","BA","KTOS","AVAV","CPNG","GLOB","ARCO","LKNCY"]),
                sharpe_5y: 0.91, return_5y: 58.4, color: '#00C853',
                quizMatch: ['Travel', 'Retail', 'Defense', 'Emerging Mkts']
            },
            'moonshots': {
                id: 'moonshots', name: 'Moonshots',
                tagline: 'High risk. High reward. No guarantees.',
                description: 'Quantum computing, speculative EVs, frontier biotech, fringe AI — the stocks that could 10x or go to zero.',
                investorType: 'For the speculator who accepts most bets fail — one hit covers them all.',
                highlights: ['IONQ','RKLB','JOBY','CRSP'],
                universe: new Set(["IONQ","QBTS","RGTI","QUBT","ARQQ","GOEV","SOLO","AYRO","MVST","FREYR","NXTP","FLUX","EZGO","AMPX","GRPH","BLUE","PMVP","VERV","ARCT","OMIC","RCKT","PRTK","AGEN","AGIO","MGNX","MNTS","ASTR","OSAT","LPAD","GNSS","AISP","GFAI","AITX","VSBLTY","NNOX","NUMR","NXTT","DNMR","KGEI","MIND","SWAV","TPVG","WULF","BTDR","DMEI","MGLD","UCAR","SATO","MIGI","SAVA","NVAX","EDIT","BEAM","NTLA","FATE","PACB","RXRX","BBAI","WOLF","COHU","ACLS","FORM","AXTI","PDFS","NVEC","AEHR","ICHR","RKLB","ACHR","JOBY","PL","BYND"]),
                sharpe_5y: 0.31, return_5y: 38.7, color: '#00C853',
                quizMatch: ['AI & Tech', 'EVs & Clean Energy', 'Crypto', 'Healthcare']
            },
            'deep-cuts': {
                id: 'deep-cuts', name: 'Deep Cuts',
                tagline: 'Under the radar. Overlooked. Potentially undervalued.',
                description: 'The stocks nobody talks about at dinner parties — niche retailers, regional banks, micro-cap semis, small gaming studios. Real businesses, just off the radar.',
                investorType: 'For the contrarian digger who finds value where others stopped looking.',
                highlights: ['LMND','SNAP','Z','IAC'],
                universe: new Set(["PLTK","MYPS","SRAD","SKLZ","GENI","NGMS","GAN","AGYS","EGLX","CDLX","MAPS","NTES","LWAY","MGPI","REDU","TTCF","HAIN","FRPT","VITL","NOMD","SMPL","GOOS","XPOF","BARK","LOVE","BURL","FIVE","OLLI","SCVL","CURV","FLYW","TRVG","TZOO","TRIP","SECO","GOL","CZOO","TPIC","DAVE","CURO","ATLC","MFIN","HFWA","KREF","GCMG","BYFC","FFWM","OPFI","JBGS","NXRT","SQFT","SEVN","LTY","HCDI","AFCG","GMRE","CLPR","BRT","AIRC","Z","RDFN","COMP","DOYU","HUYA","KC","LAIX","GOTU","CIFS","FINV","CODA","BYRN","ONDS","SFET","DFEN","INDO","VAALCO","ARIS","TELL","GATO","GFI","SBSW","SILV","MAG","GORO","CEVA","ALGM","SITM","RMBS","SMTC","DIOD","POWI","SLAB","ENTG","SWKS","UCTT","MRVL","ACLS","AEHR","VNET","MCHX","TRMR","EGIO","CXDO","QNST","RAMP","LMND","IAC","MGNI","SNAP","DRVN"]),
                sharpe_5y: 0.62, return_5y: 44.1, color: '#00C853',
                quizMatch: ['Gaming', 'Retail', 'Finance', 'Real Estate', 'Travel', 'Semis']
            }
        };

        // ── SVG Icons (no emojis — always renders on iOS) ─────────────────────────

        function getBucketIcon(bucketId, size, strokeColor) {
            size = size || 24;
            strokeColor = strokeColor || '#00C853';
            const s = size;
            const c = strokeColor;
            const icons = {
                'tech-titans': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`,
                'hypergrowth': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
                'voltage': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
                'vital-signs': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
                'old-money': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="21" x2="21" y2="21"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="5 10 5 3 19 3 19 10"/><line x1="4" y1="10" x2="4" y2="21"/><line x1="20" y1="10" x2="20" y2="21"/><line x1="8" y1="14" x2="8" y2="17"/><line x1="12" y1="14" x2="12" y2="17"/><line x1="16" y1="14" x2="16" y2="17"/></svg>`,
                'fintech-finance': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
                'world-tour': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
                'moonshots': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>`,
                'deep-cuts': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
                'brands': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`
            };
            return icons[bucketId] || icons['tech-titans'];
        }

        // ── Inject animation keyframes once ──────────────────────────────────────

        function _injectBucketStyles() {
            if (document.getElementById('bucket-keyframes')) return;
            const s = document.createElement('style');
            s.id = 'bucket-keyframes';
            s.textContent = `
                @keyframes bcsDotsAnim {
                    0%,80%,100%{transform:scale(0.6);opacity:0.3}
                    40%{transform:scale(1);opacity:1}
                }
                @keyframes bcsBubble {
                    0%{transform:scale(0.15) rotate(-12deg);opacity:0}
                    55%{transform:scale(1.18) rotate(5deg);opacity:1}
                    72%{transform:scale(0.93) rotate(-2deg)}
                    86%{transform:scale(1.05) rotate(1deg)}
                    100%{transform:scale(1) rotate(0deg);opacity:1}
                }
                @keyframes bcsFadeUp {
                    from{opacity:0;transform:translateY(14px)}
                    to{opacity:1;transform:translateY(0)}
                }
                @keyframes bcsPop {
                    from{opacity:0;transform:scale(0.75)}
                    to{opacity:1;transform:scale(1)}
                }
                @keyframes bcsSlideUp {
                    from{opacity:0;transform:translateY(40px)}
                    to{opacity:1;transform:translateY(0)}
                }
            `;
            document.head.appendChild(s);
        }

        // ── Recommendation ────────────────────────────────────────────────────────

        function recommendBucket(profile) {
            const cats = profile.categories || [];
            const risk = profile.risk || 'balanced';
            const horizon = profile.horizon || 'medium';
            const scores = {};
            Object.values(BUCKET_DATA).forEach(b => {
                let score = 0;
                cats.forEach(c => { if (b.quizMatch.includes(c)) score += 10; });
                scores[b.id] = score;
            });

            // Sector × risk combos
            const hasTech = cats.some(c => ['AI & Tech', 'Semis'].includes(c));
            const hasFinance = cats.includes('Finance');
            const hasCrypto = cats.includes('Crypto');
            const hasDefense = cats.includes('Defense');
            const hasSocialMedia = cats.includes('Social Media');

            // Tech + aggressive/short-term → Hypergrowth
            if (hasTech && (risk === 'aggressive' || horizon === 'short')) {
                scores['hypergrowth'] = (scores['hypergrowth'] || 0) + 18;
                scores['tech-titans'] = (scores['tech-titans'] || 0) - 8;
            }
            // Tech + moderate/balanced + long → Tech Titans
            if (hasTech && risk !== 'aggressive' && horizon !== 'short') {
                scores['tech-titans'] = (scores['tech-titans'] || 0) + 10;
            }
            // Finance + aggressive → Fintech
            if (hasFinance && (risk === 'aggressive' || hasCrypto)) {
                scores['fintech-finance'] = (scores['fintech-finance'] || 0) + 14;
            }
            // Finance + safe/balanced → Old Money
            if (hasFinance && (risk === 'safe' || risk === 'balanced')) {
                scores['old-money'] = (scores['old-money'] || 0) + 10;
            }
            // Crypto alone → Fintech or Voltage
            if (hasCrypto && !hasFinance) {
                scores['fintech-finance'] = (scores['fintech-finance'] || 0) + 8;
                scores['voltage'] = (scores['voltage'] || 0) + 5;
            }
            // Defense + safe/balanced → Old Money (defense primes are dividend payers)
            if (hasDefense && (risk === 'safe' || risk === 'balanced')) {
                scores['old-money'] = (scores['old-money'] || 0) + 14;
            }
            // Defense + aggressive → World Tour (growth defense plays)
            if (hasDefense && risk === 'aggressive') {
                scores['world-tour'] = (scores['world-tour'] || 0) + 8;
            }
            // Social Media → Brands (entertainment/lifestyle brands own this space)
            if (hasSocialMedia) {
                scores['brands'] = (scores['brands'] || 0) + 8;
            }
            // Aggressive + no obvious sector → Moonshots
            if (risk === 'aggressive' && !hasTech && !hasFinance) {
                scores['moonshots'] = (scores['moonshots'] || 0) + 12;
            }
            // Safe → boost Old Money, suppress risky buckets
            if (risk === 'safe') {
                scores['old-money'] = (scores['old-money'] || 0) + 8;
                scores['moonshots'] = Math.max(0, (scores['moonshots'] || 0) - 20);
                scores['hypergrowth'] = Math.max(0, (scores['hypergrowth'] || 0) - 10);
            }
            // Horizon effects
            if (horizon === 'long') {
                scores['old-money'] = (scores['old-money'] || 0) + 8;   // compounders reward patience
                scores['vital-signs'] = (scores['vital-signs'] || 0) + 5; // drug pipelines take years
            }
            if (horizon === 'short') {
                scores['old-money'] = Math.max(0, (scores['old-money'] || 0) - 10); // wrong timeframe for REITs/dividends
                scores['hypergrowth'] = (scores['hypergrowth'] || 0) + 6;           // momentum plays suit short horizons
                scores['voltage'] = (scores['voltage'] || 0) + 5;                   // energy/crypto are short-cycle trades
            }
            // Suppress low-relevance buckets
            if (!cats.some(c => ['AI & Tech','EVs & Clean Energy','Crypto','Healthcare'].includes(c))) {
                scores['moonshots'] = Math.max(0, (scores['moonshots'] || 0) - 15);
            }
            scores['deep-cuts'] = (scores['deep-cuts'] || 0) - 5;
            // Experience adjustments
            if (profile.experience === 'beginner') {
                scores['deep-cuts'] = Math.max(0, (scores['deep-cuts'] || 0) - 12);
                scores['moonshots'] = Math.max(0, (scores['moonshots'] || 0) - 12);
                scores['old-money'] = (scores['old-money'] || 0) + 6; // safe, recognisable names
            }
            if (profile.experience === 'learning') {
                scores['deep-cuts'] = Math.max(0, (scores['deep-cuts'] || 0) - 5);
            }
            if (profile.experience === 'experienced') {
                scores['deep-cuts'] = (scores['deep-cuts'] || 0) + 8; // experienced traders love hidden gems
                scores['moonshots'] = (scores['moonshots'] || 0) + 5;
            }

            return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
        }

        function recommendTopBuckets(profile, n) {
            n = n || 3;
            const cats = profile.categories || [];
            const risk = profile.risk || 'balanced';
            const horizon = profile.horizon || 'medium';
            const scores = {};
            Object.values(BUCKET_DATA).forEach(b => {
                let score = 0;
                cats.forEach(c => { if (b.quizMatch.includes(c)) score += 10; });
                scores[b.id] = score;
            });
            const hasTech = cats.some(c => ['AI & Tech', 'Semis'].includes(c));
            const hasFinance = cats.includes('Finance');
            const hasCrypto = cats.includes('Crypto');
            const hasDefense = cats.includes('Defense');
            const hasSocialMedia = cats.includes('Social Media');
            if (hasTech && (risk === 'aggressive' || horizon === 'short')) {
                scores['hypergrowth'] = (scores['hypergrowth'] || 0) + 18;
                scores['tech-titans'] = (scores['tech-titans'] || 0) - 8;
            }
            if (hasTech && risk !== 'aggressive' && horizon !== 'short') {
                scores['tech-titans'] = (scores['tech-titans'] || 0) + 10;
            }
            if (hasFinance && (risk === 'aggressive' || hasCrypto)) {
                scores['fintech-finance'] = (scores['fintech-finance'] || 0) + 14;
            }
            if (hasFinance && (risk === 'safe' || risk === 'balanced')) {
                scores['old-money'] = (scores['old-money'] || 0) + 10;
            }
            if (hasCrypto && !hasFinance) {
                scores['fintech-finance'] = (scores['fintech-finance'] || 0) + 8;
                scores['voltage'] = (scores['voltage'] || 0) + 5;
            }
            if (hasDefense && (risk === 'safe' || risk === 'balanced')) {
                scores['old-money'] = (scores['old-money'] || 0) + 14;
            }
            if (hasDefense && risk === 'aggressive') {
                scores['world-tour'] = (scores['world-tour'] || 0) + 8;
            }
            if (hasSocialMedia) {
                scores['brands'] = (scores['brands'] || 0) + 8;
            }
            if (risk === 'aggressive' && !hasTech && !hasFinance) {
                scores['moonshots'] = (scores['moonshots'] || 0) + 12;
            }
            if (risk === 'safe') {
                scores['old-money'] = (scores['old-money'] || 0) + 8;
                scores['moonshots'] = Math.max(0, (scores['moonshots'] || 0) - 20);
                scores['hypergrowth'] = Math.max(0, (scores['hypergrowth'] || 0) - 10);
            }
            if (horizon === 'long') {
                scores['old-money'] = (scores['old-money'] || 0) + 8;
                scores['vital-signs'] = (scores['vital-signs'] || 0) + 5;
            }
            if (horizon === 'short') {
                scores['old-money'] = Math.max(0, (scores['old-money'] || 0) - 10);
                scores['hypergrowth'] = (scores['hypergrowth'] || 0) + 6;
                scores['voltage'] = (scores['voltage'] || 0) + 5;
            }
            if (!cats.some(c => ['AI & Tech','EVs & Clean Energy','Crypto','Healthcare'].includes(c))) {
                scores['moonshots'] = Math.max(0, (scores['moonshots'] || 0) - 15);
            }
            scores['deep-cuts'] = (scores['deep-cuts'] || 0) - 5;
            if (profile.experience === 'beginner') {
                scores['deep-cuts'] = Math.max(0, (scores['deep-cuts'] || 0) - 12);
                scores['moonshots'] = Math.max(0, (scores['moonshots'] || 0) - 12);
                scores['old-money'] = (scores['old-money'] || 0) + 6;
            }
            if (profile.experience === 'learning') {
                scores['deep-cuts'] = Math.max(0, (scores['deep-cuts'] || 0) - 5);
            }
            if (profile.experience === 'experienced') {
                scores['deep-cuts'] = (scores['deep-cuts'] || 0) + 8;
                scores['moonshots'] = (scores['moonshots'] || 0) + 5;
            }
            return Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, n).map(e => e[0]);
        }

        // ── Wildcard adjacency ────────────────────────────────────────────────────

        const ADJACENT_BUCKETS = {
            'tech-titans':    ['hypergrowth', 'fintech-finance'],
            'hypergrowth':    ['tech-titans', 'voltage'],
            'voltage':        ['hypergrowth', 'world-tour'],
            'vital-signs':    ['old-money', 'moonshots'],
            'old-money':      ['vital-signs', 'brands'],
            'fintech-finance':['tech-titans', 'hypergrowth'],
            'world-tour':     ['voltage', 'brands'],
            'moonshots':      ['hypergrowth', 'deep-cuts'],
            'deep-cuts':      ['moonshots', 'world-tour'],
            'brands':         ['old-money', 'world-tour']
        };

        function pickAdjacentBucket(activeBucketId) {
            const adjacent = ADJACENT_BUCKETS[activeBucketId];
            if (adjacent && adjacent.length > 0) {
                return adjacent[Math.floor(Math.random() * adjacent.length)];
            }
            const others = Object.keys(BUCKET_DATA).filter(id => id !== activeBucketId);
            return others[Math.floor(Math.random() * others.length)];
        }

        // ── State ─────────────────────────────────────────────────────────────────

        async function loadActiveBucket() {
            if (window.activeBucket) return window.activeBucket;
            if (!currentUser || isGuest) return null;
            try {
                const { data } = await supabaseClient
                    .from('user_profiles')
                    .select('active_bucket_id')
                    .eq('user_id', currentUser.id)
                    .maybeSingle();
                if (data?.active_bucket_id && BUCKET_DATA[data.active_bucket_id]) {
                    window.activeBucket = BUCKET_DATA[data.active_bucket_id];
                    window.activeBucketId = data.active_bucket_id;
                }
            } catch (e) { console.error('loadActiveBucket:', e); }
            return window.activeBucket || null;
        }

        async function saveActiveBucket(bucketId) {
            window.activeBucket = BUCKET_DATA[bucketId];
            window.activeBucketId = bucketId;
            updateFeedBucketBar();
            if (currentUser && !isGuest) {
                try {
                    await Promise.all([
                        supabaseClient.from('user_profiles')
                            .update({ active_bucket_id: bucketId })
                            .eq('user_id', currentUser.id),
                        supabaseClient.from('user_buckets')
                            .upsert({ user_id: currentUser.id, bucket_id: bucketId, active: true }, { onConflict: 'user_id,bucket_id' })
                    ]);
                } catch (e) { console.error('saveActiveBucket:', e); }
            }
        }

        // ── Feed bucket pill ───────────────────────────────────────────────────────

        function updateFeedBucketBar() {
            const bar = document.getElementById('feed-bucket-bar');
            const label = document.getElementById('feed-bucket-label');
            const iconEl = document.getElementById('feed-bucket-icon');
            if (!bar || !label) return;
            if (window.activeBucket) {
                label.textContent = window.activeBucket.name;
                if (iconEl) iconEl.innerHTML = getBucketIcon(window.activeBucketId, 13, '#00a844');
                bar.style.display = 'flex';
            } else {
                bar.style.display = 'none';
            }
        }

        // ── Bucket Confirm Screen ─────────────────────────────────────────────────

        function showBucketConfirmScreen(topIds, onConfirm) {
            _injectBucketStyles();
            const screen = document.getElementById('bucket-confirm-screen');
            if (!screen) return;
            window._bucketOnConfirm = onConfirm;
            // Accept single string or array
            if (typeof topIds === 'string') topIds = [topIds];

            screen.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:9998;display:flex;flex-direction:column;overflow:hidden;opacity:0;';
            requestAnimationFrame(() => { screen.style.opacity = '1'; screen.style.transition = 'opacity 0.3s ease'; });

            // ── Phase 1: Loading ──
            screen.innerHTML = `
                <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;">
                    <div style="display:flex;gap:10px;margin-bottom:24px;">
                        ${[0,1,2].map(i => `<div style="width:9px;height:9px;border-radius:50%;background:#00C853;animation:bcsDotsAnim 1.3s ease-in-out ${i*0.18}s infinite;"></div>`).join('')}
                    </div>
                    <div style="font-family:'DM Sans',sans-serif;font-size:18px;font-weight:700;color:#0a0a0a;text-align:center;margin-bottom:8px;">Building your personal feed</div>
                    <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:#aaa;text-align:center;">Matching you to your bucket...</div>
                </div>`;

            // ── Phase 2 (1.3s): Reveal top 3 buckets ──
            setTimeout(() => {
                const buckets = topIds.map(id => BUCKET_DATA[id]).filter(Boolean);
                if (buckets.length === 0) return;

                window._bcsBuckets = buckets;

                // ── Back to list ──
                window._bcsShowList = function() {
                    const inner = document.getElementById('bcs-inner');
                    if (!inner) return;
                    inner.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
                    inner.style.opacity = '0';
                    inner.style.transform = 'translateY(-8px)';
                    setTimeout(() => {
                        inner.style.transition = '';
                        inner.style.opacity = '1';
                        inner.style.transform = '';
                        inner.innerHTML = _bcsListHTML(window._bcsBuckets);
                        window._bcsBuckets.forEach((_, i) => {
                            setTimeout(() => {
                                const el = document.getElementById('bcs-card-' + i);
                                if (el) el.style.animation = 'bcsSlideUp 0.5s cubic-bezier(0.22,1,0.36,1) forwards';
                            }, 80 + i * 160);
                        });
                    }, 220);
                };

                // ── Expand handler: fade list out, reveal full detail card ──
                window._bcsExpand = function(bucketId) {
                    const inner = document.getElementById('bcs-inner');
                    if (!inner) return;
                    inner.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
                    inner.style.opacity = '0';
                    inner.style.transform = 'translateY(10px)';
                    setTimeout(() => {
                        const b = BUCKET_DATA[bucketId];
                        if (!b) return;

                        const BUCKET_EXTRA = {
                            'tech-titans':     { risk: 3, bestFor: 'Long-term investors who believe the biggest tech companies will keep winning', tickers: ['AAPL','MSFT','GOOG','META','NVDA'] },
                            'hypergrowth':     { risk: 4, bestFor: 'High-conviction bets on companies growing 30%+ and not slowing down', tickers: ['NVDA','AMD','PLTR','RBLX','RDDT'] },
                            'voltage':         { risk: 4, bestFor: 'Believers in the energy transition — and the fossil fuels still funding it', tickers: ['TSLA','ENPH','COIN','XOM','NEE'] },
                            'vital-signs':     { risk: 3, bestFor: 'Anyone tracking drug pipelines, biotech breakthroughs, and healthcare innovation', tickers: ['LLY','JNJ','MRNA','CRSP','ISRG'] },
                            'old-money':       { risk: 2, bestFor: 'Patient compounders who want dividends, real estate, and defensive positions', tickers: ['MCD','COST','KO','LMT','AMT'] },
                            'brands':          { risk: 3, bestFor: 'Fans of consumer culture — the labels, platforms, and carts people love', tickers: ['NKE','LULU','ONON','NFLX','DIS'] },
                            'fintech-finance': { risk: 3, bestFor: 'Bulls on payments, banking disruption, and the future of money', tickers: ['V','JPM','PYPL','SQ','HOOD'] },
                            'world-tour':      { risk: 3, bestFor: 'Global thinkers tracking emerging markets, travel, and international plays', tickers: ['MELI','ABNB','BABA','DAL','GRAB'] },
                            'moonshots':       { risk: 5, bestFor: 'Risk-tolerant speculators hunting the next 10x — fully aware it might go to zero', tickers: ['IONQ','ACHR','JOBY','RKLB','ARQQ'] },
                            'deep-cuts':       { risk: 4, bestFor: 'Contrarians hunting overlooked names before the crowd finds them', tickers: ['PLTK','LMND','DAVE','MGNI','IAC'] }
                        };
                        const extra = BUCKET_EXTRA[b.id] || { risk: 3, bestFor: '', tickers: [] };
                        const riskLabels = ['','Very Low','Low','Medium','High','Very High'];
                        const riskColors = ['','#00C853','#00C853','#FFB800','#FF6B35','#E53935'];

                        inner.style.transition = '';
                        inner.style.opacity = '1';
                        inner.style.transform = '';
                        inner.innerHTML = `
                            <div style="padding:56px 20px 0;display:flex;align-items:center;">
                                <button onclick="window._bcsShowList()" style="background:#f0f0f0;border:none;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;-webkit-tap-highlight-color:transparent;">
                                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><polyline points="11 4 6 9 11 14" stroke="#0a0a0a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                </button>
                            </div>
                            <div style="padding:20px 24px 20px;text-align:center;animation:bcsFadeUp 0.5s ease forwards;">
                                <div style="font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;color:#aaa;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Your bucket</div>
                                <div style="font-family:'DM Sans',sans-serif;font-size:26px;font-weight:800;color:#0a0a0a;">You're a ${b.name}</div>
                            </div>
                            <div style="margin:0 20px;background:#f7f7f7;border-radius:28px;padding:32px 24px 28px;text-align:center;animation:bcsSlideUp 0.5s cubic-bezier(0.22,1,0.36,1) forwards;">
                                <div id="bcs-icon" style="opacity:0;margin-bottom:18px;display:flex;justify-content:center;">
                                    <div style="width:80px;height:80px;border-radius:50%;background:rgba(0,200,83,0.1);display:flex;align-items:center;justify-content:center;">
                                        ${getBucketIcon(b.id, 36, '#00C853')}
                                    </div>
                                </div>
                                <div id="bcs-name" style="opacity:0;margin-bottom:6px;">
                                    <div style="font-family:'DM Sans',sans-serif;font-size:30px;font-weight:800;color:#0a0a0a;line-height:1.1;">${b.name}</div>
                                    <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#999;margin-top:6px;line-height:1.5;">${b.tagline}</div>
                                </div>
                                <div id="bcs-stats" style="opacity:0;margin-top:24px;display:flex;border-top:1.5px solid #ebebeb;padding-top:22px;">
                                    <div style="flex:1;text-align:center;">
                                        <div id="bcs-return-val" style="font-family:'DM Mono',monospace;font-size:28px;font-weight:700;color:#00C853;">+0%</div>
                                        <div style="font-family:'DM Sans',sans-serif;font-size:10px;color:#bbb;margin-top:4px;text-transform:uppercase;letter-spacing:1.2px;">5yr Return</div>
                                    </div>
                                    <div style="width:1.5px;background:#ebebeb;margin:0 4px;"></div>
                                    <div id="bcs-sharpe-col" style="flex:1;text-align:center;opacity:0;">
                                        <div style="font-family:'DM Mono',monospace;font-size:28px;font-weight:700;color:#0a0a0a;">${b.sharpe_5y}</div>
                                        <div style="font-family:'DM Sans',sans-serif;font-size:10px;color:#bbb;margin-top:4px;text-transform:uppercase;letter-spacing:1.2px;">Sharpe Ratio</div>
                                    </div>
                                </div>
                            </div>
                            <div id="bcs-tickers" style="opacity:0;margin:14px 20px 0;">
                                <div style="font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;color:#aaa;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:9px;">Top picks in this bucket</div>
                                <div style="display:flex;gap:7px;flex-wrap:wrap;">
                                    ${extra.tickers.map(t => `<div style="font-family:'DM Mono',monospace;font-size:12px;font-weight:600;color:#0a0a0a;background:#f0f0f0;border-radius:8px;padding:5px 11px;">${t}</div>`).join('')}
                                </div>
                            </div>
                            <div id="bcs-risk" style="opacity:0;margin:12px 20px 0;background:#f7f7f7;border-radius:16px;padding:13px 16px;display:flex;align-items:center;justify-content:space-between;">
                                <div style="font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;color:#0a0a0a;">Risk level</div>
                                <div style="display:flex;align-items:center;gap:10px;">
                                    <div style="display:flex;gap:5px;">
                                        ${[1,2,3,4,5].map(n => `<div style="width:9px;height:9px;border-radius:50%;background:${n <= extra.risk ? riskColors[extra.risk] : '#e0e0e0'};"></div>`).join('')}
                                    </div>
                                    <div style="font-family:'DM Mono',monospace;font-size:11px;font-weight:700;color:${riskColors[extra.risk]};">${riskLabels[extra.risk]}</div>
                                </div>
                            </div>
                            <div id="bcs-desc" style="opacity:0;margin:10px 20px 0;background:#f7f7f7;border-radius:16px;padding:14px 16px;">
                                <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#777;line-height:1.65;">${b.description}</div>
                            </div>
                            <div id="bcs-bestfor" style="opacity:0;margin:10px 20px 0;padding:0 2px;">
                                <div style="font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;color:#aaa;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">Best for</div>
                                <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#555;line-height:1.6;">${extra.bestFor}</div>
                            </div>
                            <div id="bcs-expand-btns" style="opacity:0;padding:20px 20px 44px;">
                                <button onclick="confirmBucket('${b.id}')" style="width:100%;padding:17px;background:linear-gradient(white,white) padding-box,linear-gradient(90deg,#00FF88,#00E676) border-box;border:2px solid transparent;border-radius:100px;font-family:'DM Sans',sans-serif;font-size:16px;font-weight:700;color:#00C853;cursor:pointer;letter-spacing:0.2px;">Build my feed</button>
                            </div>`;

                        setTimeout(() => { const el = document.getElementById('bcs-icon'); if (el) el.style.animation = 'bcsBubble 0.75s cubic-bezier(0.34,1.56,0.64,1) forwards'; }, 150);
                        setTimeout(() => { const el = document.getElementById('bcs-name'); if (el) el.style.animation = 'bcsFadeUp 0.45s ease forwards'; }, 450);
                        setTimeout(() => {
                            const el = document.getElementById('bcs-stats');
                            if (el) el.style.animation = 'bcsFadeUp 0.4s ease forwards';
                            const retEl = document.getElementById('bcs-return-val');
                            if (retEl) {
                                const target = b.return_5y, dur = 900, t0 = Date.now();
                                const tick = () => { const p = Math.min((Date.now()-t0)/dur,1), e=1-Math.pow(1-p,3); retEl.textContent='+' +(target*e).toFixed(1)+'%'; if(p<1) requestAnimationFrame(tick); };
                                tick();
                            }
                        }, 750);
                        setTimeout(() => { const el = document.getElementById('bcs-sharpe-col'); if (el) el.style.animation = 'bcsPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards'; }, 1500);
                        setTimeout(() => { const el = document.getElementById('bcs-tickers'); if (el) el.style.animation = 'bcsFadeUp 0.4s ease forwards'; }, 1700);
                        setTimeout(() => { const el = document.getElementById('bcs-risk'); if (el) el.style.animation = 'bcsFadeUp 0.4s ease forwards'; }, 1900);
                        setTimeout(() => { const el = document.getElementById('bcs-desc'); if (el) el.style.animation = 'bcsFadeUp 0.4s ease forwards'; }, 2050);
                        setTimeout(() => { const el = document.getElementById('bcs-bestfor'); if (el) el.style.animation = 'bcsFadeUp 0.4s ease forwards'; }, 2200);
                        setTimeout(() => { const el = document.getElementById('bcs-expand-btns'); if (el) el.style.animation = 'bcsFadeUp 0.4s ease forwards'; }, 2350);
                    }, 260);
                };

                function _bcsListHTML(bkts) {
                    return `
                        <div style="padding:76px 24px 16px;text-align:center;animation:bcsFadeUp 0.5s ease forwards;">
                            <div style="font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;color:#aaa;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Based on your answers</div>
                            <div style="font-family:'DM Sans',sans-serif;font-size:26px;font-weight:800;color:#0a0a0a;">We found ${buckets.length > 1 ? buckets.length + ' buckets' : 'your bucket'} for you</div>
                        </div>
                        <div style="padding:0 20px;display:flex;flex-direction:column;gap:10px;">
                            ${bkts.map((b, i) => `
                            <div id="bcs-card-${i}" onclick="window._bcsExpand('${b.id}')" style="opacity:0;background:#fff;border:1.5px solid ${i===0?'#00C853':'#e8e8e8'};border-radius:20px;padding:16px 18px;cursor:pointer;display:flex;align-items:center;gap:14px;-webkit-tap-highlight-color:transparent;">
                                <div style="width:52px;height:52px;border-radius:50%;background:${i===0?'rgba(0,200,83,0.1)':'#f0f0f0'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                                    ${getBucketIcon(b.id, 24, i===0?'#00C853':'#888')}
                                </div>
                                <div style="flex:1;min-width:0;">
                                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;">
                                        <div style="font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;color:#0a0a0a;">${b.name}</div>
                                        ${i===0?`<div style="font-family:'DM Mono',monospace;font-size:9px;font-weight:700;color:#00C853;background:rgba(0,200,83,0.1);padding:2px 8px;border-radius:100px;">BEST MATCH</div>`:''}
                                    </div>
                                    <div style="font-family:'DM Sans',sans-serif;font-size:11px;color:#aaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${b.tagline}</div>
                                    <div style="font-family:'DM Mono',monospace;font-size:12px;color:#00C853;font-weight:600;margin-top:5px;">+${b.return_5y}% <span style="color:#ccc;font-weight:400;font-size:11px;">5yr · Sharpe ${b.sharpe_5y}</span></div>
                                </div>
                                <div style="color:#ccc;font-size:18px;flex-shrink:0;">›</div>
                            </div>`).join('')}
                        </div>
                        <div style="height:32px;"></div>`;
                }

                screen.innerHTML = `<div id="bcs-inner" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;-webkit-overflow-scrolling:touch;">${_bcsListHTML(buckets)}</div>`;

                // Staggered card reveals
                buckets.forEach((_, i) => {
                    setTimeout(() => {
                        const el = document.getElementById('bcs-card-' + i);
                        if (el) el.style.animation = 'bcsSlideUp 0.5s cubic-bezier(0.22,1,0.36,1) forwards';
                    }, 150 + i * 200);
                });

            }, 1300);
        }

        function showAllBuckets(currentId) {
            _injectBucketStyles();
            const screen = document.getElementById('bucket-confirm-screen');
            if (!screen) return;

            const rows = Object.values(BUCKET_DATA).map(b => `
                <div onclick="confirmBucket('${b.id}')" style="margin:0 20px 10px;background:${currentId===b.id?'rgba(0,200,83,0.06)':'#f7f7f7'};border:1.5px solid ${currentId===b.id?'#00C853':'transparent'};border-radius:20px;padding:16px 18px;cursor:pointer;display:flex;align-items:center;gap:14px;-webkit-tap-highlight-color:transparent;">
                    <div style="width:44px;height:44px;border-radius:50%;background:${currentId===b.id?'rgba(0,200,83,0.1)':'#ebebeb'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        ${getBucketIcon(b.id, 22, currentId===b.id?'#00C853':'#888')}
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;">
                            <div style="font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;color:#0a0a0a;">${b.name}</div>
                            ${currentId===b.id?`<div style="font-family:'DM Mono',monospace;font-size:9px;font-weight:700;color:#00C853;background:rgba(0,200,83,0.1);padding:2px 8px;border-radius:100px;">RECOMMENDED</div>`:''}
                        </div>
                        <div style="font-family:'DM Sans',sans-serif;font-size:11px;color:#aaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${b.tagline}</div>
                        <div style="font-family:'DM Mono',monospace;font-size:12px;color:#00C853;font-weight:600;margin-top:5px;">+${b.return_5y}% <span style="color:#ccc;font-weight:400;font-size:11px;">5yr · Sharpe ${b.sharpe_5y}</span></div>
                    </div>
                    <div style="color:#ccc;font-size:18px;flex-shrink:0;">›</div>
                </div>`).join('');

            screen.innerHTML = `
                <div style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;">
                    <div style="padding:52px 24px 20px;animation:bcsFadeUp 0.35s ease forwards;">
                        <div style="font-family:'DM Sans',sans-serif;font-size:24px;font-weight:800;color:#0a0a0a;margin-bottom:4px;">Choose your bucket</div>
                        <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#aaa;">Your feed will only show stocks from this universe</div>
                    </div>
                    ${rows}
                    <div style="height:40px;"></div>
                </div>`;
        }

        function confirmBucket(bucketId) {
            const screen = document.getElementById('bucket-confirm-screen');
            if (screen) {
                screen.style.transition = 'opacity 0.3s ease';
                screen.style.opacity = '0';
                setTimeout(() => { screen.style.display = 'none'; screen.style.opacity = ''; }, 320);
            }
            saveActiveBucket(bucketId);
            if (window._bucketOnConfirm) window._bucketOnConfirm();
        }

        // ── Bucket Switch Modal ───────────────────────────────────────────────────

        function showBucketSwitchModal() {
            _injectBucketStyles();
            const overlay = document.getElementById('bucket-switch-overlay');
            const sheet = document.getElementById('bucket-switch-sheet');
            if (!overlay || !sheet) return;

            const cur = window.activeBucketId;
            sheet.innerHTML = `
                <div style="width:36px;height:4px;background:#ddd;border-radius:2px;margin:12px auto 4px;"></div>
                <div style="padding:16px 20px 8px;display:flex;align-items:center;justify-content:space-between;">
                    <div style="font-family:'DM Sans',sans-serif;font-size:17px;font-weight:700;color:#0a0a0a;">Switch Bucket</div>
                    <button onclick="closeBucketSwitch()" style="background:none;border:none;font-size:20px;color:#bbb;cursor:pointer;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#f5f5f5;">×</button>
                </div>
                ${Object.values(BUCKET_DATA).map(b => `
                <div onclick="switchBucket('${b.id}')" style="margin:0 16px 8px;background:${cur===b.id?'rgba(0,200,83,0.06)':'#f9f9f9'};border:1.5px solid ${cur===b.id?'#00C853':'transparent'};border-radius:16px;padding:14px 16px;cursor:pointer;display:flex;align-items:center;gap:12px;-webkit-tap-highlight-color:transparent;">
                    <div style="width:40px;height:40px;border-radius:50%;background:${cur===b.id?'rgba(0,200,83,0.1)':'#ebebeb'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        ${getBucketIcon(b.id, 20, cur===b.id?'#00C853':'#888')}
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <div style="font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;color:#0a0a0a;">${b.name}</div>
                            ${cur===b.id?`<div style="font-family:'DM Mono',monospace;font-size:9px;color:#00C853;background:rgba(0,200,83,0.1);padding:2px 7px;border-radius:100px;font-weight:700;">ACTIVE</div>`:''}
                        </div>
                        <div style="font-family:'DM Sans',sans-serif;font-size:11px;color:#aaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${b.tagline}</div>
                    </div>
                    <div style="font-family:'DM Mono',monospace;font-size:12px;color:#00C853;font-weight:600;flex-shrink:0;">+${b.return_5y}%</div>
                </div>`).join('')}
                <div style="height:24px;"></div>`;

            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:9996;display:block;opacity:0;transition:opacity 0.28s ease;';
            sheet.style.display = 'block';
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                sheet.style.transform = 'translateY(0)';
            });
        }

        function closeBucketSwitch() {
            const overlay = document.getElementById('bucket-switch-overlay');
            const sheet = document.getElementById('bucket-switch-sheet');
            if (!overlay || !sheet) return;
            overlay.style.opacity = '0';
            sheet.style.transform = 'translateY(100%)';
            setTimeout(() => { overlay.style.display = 'none'; sheet.style.display = 'none'; }, 300);
        }

        async function switchBucket(bucketId) {
            closeBucketSwitch();
            await saveActiveBucket(bucketId);
            window._feedInitialized = false;
            initFeed();
        }
