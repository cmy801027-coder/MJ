/* 劇本資料：單一來源 window.SCRIPTS（定義於 scripts.js）。
   新增/修改劇本請改 scripts.js，不要在這裡維護資料。 */

/* 劇本類型與首頁、後台統一為以下 11 種。 */
const FILTER_TYPES = ['推理', '情感', '機制', '恐怖', '歡樂', '古風', '歐式', '民國', '科幻', '日式', '陣營'];

function normalizeTypes(types) {
    return FILTER_TYPES.filter(t => (types || []).includes(t));
}

const scripts = (window.SCRIPTS || []).map(script => Object.assign({}, script, {
    // 篩選專用的標籤清單；script.types 保持原樣供卡片顯示
    store: script.store === "敏捷私團" ? "敏捷私團" : "其他店家",
    filterTypes: normalizeTypes(script.types)
}));

    // DOM載入後執行的初始化函式
    document.addEventListener('DOMContentLoaded', () => {
        renderCards();
        document.getElementById('storeFilter').addEventListener('change', () => {
            updateAvailableOptions();
            filterScripts();
        });
        // 綁定篩選事件監聽
        document.getElementById('playerFilter').addEventListener('change', () => {
            updateAvailableOptions();
            filterScripts();
        });
        document.getElementById('typeFilter').addEventListener('change', () => {
            updateAvailableOptions();
            filterScripts();
        });
        
        // 綁定搜索事件監聽
        document.getElementById('searchInput').addEventListener('input', () => {
            filterScripts();
        });
        
        // 綁定排序事件監聽
        document.getElementById('sortFilter').addEventListener('change', () => {
            sortScripts();
        });
        
        // 初始化可用選項和篩選
        updateAvailableOptions();
        filterScripts();
        applyStaggerAnimationWithinTwoSeconds();
    });
    
    // 更新可用選項的函式
    function updateAvailableOptions() {
        const playerFilter = document.getElementById('playerFilter').value;
        const typeFilter = document.getElementById('typeFilter').value;
        const storeFilter = document.getElementById('storeFilter').value;
        
        // 根據當前篩選條件找出符合的劇本
        let filteredScripts = scripts.filter(script => {
            let match = true;
            if (playerFilter && script.players != playerFilter) match = false;
            if (typeFilter && !script.filterTypes.includes(typeFilter)) match = false;
            if (storeFilter && script.store !== storeFilter) match = false;
            return match;
        });
        
        // 更新篩選結果數量
        updateFilteredCount(filteredScripts.length);
    }
    
    // 解析 CSS 時間字串為秒數（支援 s / ms）
    function parseCssTimeToSeconds(timeString) {
        if (!timeString) return 0;
        const first = String(timeString).split(',')[0].trim();
        if (first.endsWith('ms')) return parseFloat(first) / 1000;
        if (first.endsWith('s')) return parseFloat(first);
        const val = parseFloat(first);
        return isNaN(val) ? 0 : val;
    }

    // 將可見的卡片動畫錯開時間壓縮在 2 秒內完成顯示
    // 首次進場與篩選/排序共用：cardIn 淡入上移，全部在 2 秒內錯開播完
    function applyStaggerAnimationWithinTwoSeconds() {
        const container = document.getElementById('scriptsGrid');
        if (!container) return;
        const visibleCards = Array.from(container.querySelectorAll('.script-card'))
            .filter(card => !card.classList.contains('hidden'));
        if (visibleCards.length === 0) return;

        // 先關掉動畫再 reflow，讓 cardIn 可重新播放（篩選/排序重播）
        visibleCards.forEach(card => { card.style.animation = 'none'; });
        void container.offsetWidth;
        visibleCards.forEach(card => { card.style.animation = ''; });

        const durationSec = parseCssTimeToSeconds(getComputedStyle(visibleCards[0]).animationDuration);
        const maxTotalSec = 2; // 最晚在 2 秒內完成（含動畫本身的時間）
        const latestStartSec = Math.max(0, maxTotalSec - durationSec);
        const stepSec = visibleCards.length > 1 ? (latestStartSec / (visibleCards.length - 1)) : 0;

        visibleCards.forEach((card, index) => {
            card.style.animationDelay = (index * stepSec).toFixed(3) + 's';
            card.style.animationPlayState = 'running';
        });
    }

    // 篩選功能
    function filterScripts() {
        const playerFilter = document.getElementById('playerFilter').value;
        const typeFilter = document.getElementById('typeFilter').value;
        const storeFilter = document.getElementById('storeFilter').value;
        const searchQuery = document.getElementById('searchInput').value.toLowerCase();
        
        const scriptCards = document.querySelectorAll('.script-card');
        const noResultsEl = document.getElementById('noResults');
        let visibleCount = 0;

        scriptCards.forEach(card => {
            const players = card.dataset.players;
            const types = card.dataset.types.split(',');
            const title = card.querySelector('.script-title').textContent.toLowerCase();
            
            let shouldShow = !storeFilter || card.dataset.store === storeFilter;
            if (playerFilter && players !== playerFilter) {
                shouldShow = false;
            }
            if (typeFilter && !types.includes(typeFilter)) {
                shouldShow = false;
            }
            if (searchQuery && !title.includes(searchQuery)) {
                shouldShow = false;
            }
            
            if (shouldShow) {
                card.classList.remove('hidden');
                visibleCount++;
            } else {
                card.classList.add('hidden');
            }
        });

        // 根據 visibleCount 決定是否顯示 "查無結果"
        if (visibleCount === 0) {
            noResultsEl.classList.remove('hidden');
        } else {
            noResultsEl.classList.add('hidden');
        }
        
        // 更新篩選結果數量
        updateFilteredCount(visibleCount);
        // 重新計算動畫延遲，確保可見卡片在 2 秒內完成顯示
        applyStaggerAnimationWithinTwoSeconds();
    }

    // 更新篩選結果數量
    function updateFilteredCount(count) {
        const filteredCountEl = document.getElementById('filteredCount');
        if (filteredCountEl) {
            filteredCountEl.textContent = count;
        }
    }

    // 重置篩選函式
    function resetFilters() {
        document.getElementById('playerFilter').value = '';
        document.getElementById('typeFilter').value = '';
        document.getElementById('storeFilter').value = '';
        document.getElementById('searchInput').value = '';
        document.getElementById('sortFilter').value = 'default';
        updateAvailableOptions();
        filterScripts();
        sortScripts();
    }

    // 前往指定頁面的函式
    function goToPage(filename) {
        window.location.href = filename;
    }

    // 排序功能
    // 以 scripts 陣列為排序依據（而非目前的 DOM 順序），
    // 「預設順序」才能真的還原成 scripts.js 的原始排列。
    // 排序涵蓋全部卡片（含被篩選隱藏的），避免先排序再篩選與
    // 先篩選再排序得到不同結果。
    function sortScripts() {
        const sortType = document.getElementById('sortFilter').value;
        const scriptsGrid = document.getElementById('scriptsGrid');
        if (!scriptsGrid) return;

        const cardById = new Map(
            Array.from(scriptsGrid.querySelectorAll('.script-card'))
                 .map(card => [card.dataset.id, card])
        );

        const ordered = scripts.slice().sort((a, b) => {
            switch (sortType) {
                case 'name':       return a.name.localeCompare(b.name, 'zh-TW');
                case 'time':       return a.time - b.time;
                case 'players':    return a.players - b.players;
                default:           return 0;   // 維持 scripts.js 的原始順序
            }
        });

        ordered.forEach(script => {
            const card = cardById.get(script.id);
            if (card) scriptsGrid.appendChild(card);
        });

        // 重新計算動畫延遲，確保可見卡片在 2 秒內完成顯示
        applyStaggerAnimationWithinTwoSeconds();
    }

    // 前往劇本詳細頁面的函式
    function goToScript(scriptId) {
        const script = scripts.find(s => s.id === scriptId);
        if (script && script.file) {
            const destination = 'script.html?id=' + encodeURIComponent(script.id);
            if (script.store === '敏捷私團' && typeof window.playStorybookTransition === 'function') {
                window.playStorybookTransition(script, destination);
            } else {
                window.location.href = destination;
            }
        } else {
            console.error('找不到ID為 ' + scriptId + ' 的劇本檔案。');
            alert('抱歉，找不到該劇本的詳細介紹頁面。');
        }
    }

// youtube 欄位填的是影片 ID 或網址（規則與 video.js 相同），格式不對就當沒有
function hasVideo(script) {
    const raw = String(script.youtube || '').trim();
    return /^[\w-]{11}$/.test(raw) ||
        /(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)[\w-]{11}/.test(raw);
}

// Dynamically generate card DOM from scripts data
function renderCards() {
    const grid = document.getElementById('scriptsGrid');
    if (!grid) return;
    grid.innerHTML = scripts.map(s => {
        const img    = s.poster || '';
        const badgeData = [
            '🏠 ' + s.store,
            '👥 ' + (s.playersLabel || (s.players + '人')),
            '⏰ ' + (s.timeLabel || (s.time + '小時')),
        ];
        const badges = badgeData.map(b => `<span class="info-badge">${b}</span>`).join('');
        const types  = s.types.map(t => `<span class="type-tag">${t}</span>`).join('');
        return `<article class="script-card" data-id="${s.id}" data-store="${s.store}" data-theme="${s.theme}" data-players="${s.players}" data-types="${s.filterTypes.join(',')}">
            <div class="card-media">
                ${img
                    ? `<img src="${img}" alt="${s.name}" class="script-image" loading="lazy">`
                    : `<div class="script-image" role="img" aria-label="${s.name}（海報準備中）" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:18px;text-align:center;font-weight:800;letter-spacing:.08em;line-height:1.5;color:rgba(255,255,255,.82);background:radial-gradient(circle at 50% 35%,rgba(255,255,255,.12),transparent 60%)"><span style="font-size:2.4rem">🎭</span><span>${s.name}</span><span style="font-size:.78rem;font-weight:600;opacity:.65">海報準備中</span></div>`}
                <span class="corner-diff">${s.players}人</span>
                ${hasVideo(s) ? `<a class="video-badge" href="script.html?id=${encodeURIComponent(s.id)}#video" aria-label="觀看${s.name}介紹影片">▶ 影片</a>` : ''}
            </div>
            <div class="card-body">
                <h3 class="script-title">${s.name}</h3>
                <div class="script-info">${badges}</div>
                <div class="script-types">${types}</div>
                <button class="detail-btn" onclick="goToScript('${s.id}')">查看詳情 →</button>
            </div>
        </article>`;
    }).join('\n');
}
