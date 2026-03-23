/* ============================================
   specs.js — 仕様・修正リスト管理
   依存: db.js, config.js
   ============================================ */

/* --- スワイプ操作変数 --- */
let startX = 0, currentX = 0, activeSwipeElement = null;

function openSpecModal() { document.getElementById('spec-modal').classList.add('show'); renderSpecCards(); }
function closeSpecModal() { document.getElementById('spec-modal').classList.remove('show'); }

function getSpecList() { try { return JSON.parse(localStorage.getItem('specList') || '[]'); } catch(e) { return []; } }
function saveSpecList(list) { localStorage.setItem('specList', JSON.stringify(list)); updateSpecBadge(); }
function getSpecBackup() { try { return JSON.parse(localStorage.getItem('specListBackup') || '[]'); } catch(e) { return []; } }
function saveSpecBackup(list) { localStorage.setItem('specListBackup', JSON.stringify(list)); }

function updateSpecBadge() {
    const list = getSpecList();
    const total = list.length;
    const done = list.filter(i => i.done).length;
    const b = document.getElementById('spec-badge');
    if (b) {
        b.textContent = total > 0 ? `${done}/${total}` : '0';
        b.className = 'tab-badge' + (total === 0 ? ' empty' : (done === total && total > 0 ? ' done' : ''));
    }
    updateFloatingGenerateBtn();
    updateSpecProgress();
}

function updateFloatingGenerateBtn() {
    const container = document.getElementById('floating-generate-container');
    if (!container) return;
    const list = getSpecList();
    const undone = list.filter(i => !i.done);
    if (undone.length > 0) container.classList.add('show');
    else container.classList.remove('show');
}

function updateSpecProgress() {
    const list = getSpecList();
    const pg = document.getElementById('spec-progress');
    if (!pg) return;
    if (list.length === 0) { pg.style.display = 'none'; return; }
    pg.style.display = 'flex';
    const done = list.filter(i => i.done).length;
    const pct = Math.round(done / list.length * 100);
    document.getElementById('spec-progress-text').textContent = `${done}/${list.length} (${pct}%)`;
    document.getElementById('spec-progress-fill').style.width = pct + '%';
}

function clearNewSpecFlags() {
    const list = getSpecList();
    let changed = false;
    list.forEach(i => { if(i.isNew) { i.isNew = false; changed = true; } });
    if(changed) { saveSpecList(list); renderSpecCards(); }
}

function handleTouchStart(e, el) { startX = e.touches[0].clientX; currentX = 0; if (activeSwipeElement && activeSwipeElement !== el) activeSwipeElement.style.transform = 'translateX(0)'; activeSwipeElement = el; el.style.transition = 'none'; }
function handleTouchMove(e, el) { const x = e.touches[0].clientX; currentX = x - startX; if (currentX > 0) currentX = 0; if (currentX < -120) currentX = -120; el.style.transform = `translateX(${currentX}px)`; }
function handleTouchEnd(e, el) { el.style.transition = 'transform 0.3s ease'; if (currentX < -40) { el.style.transform = 'translateX(-120px)'; } else { el.style.transform = 'translateX(0)'; activeSwipeElement = null; } }

function renderSpecCards() {
    const list = getSpecList();
    const container = document.getElementById('spec-card-view');
    if (!container) return;
    if (list.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:30px;color:var(--color-text-muted);font-size:13px;">${getLabel('noSpecsMessage')}</div>`;
    } else {
        container.innerHTML = list.map(item => `
            <div class="swipe-container ${item.isNew ? 'is-new-card' : ''}" data-id="${item.id}">
                ${item.isNew ? '<div class="is-new-badge">NEW</div>' : ''}
                <div class="swipe-actions">
                    <button class="swipe-btn edit" onclick="editSpecText('${item.id}')">${getLabel('chatMsgEdit')}</button>
                    <button class="swipe-btn delete" onclick="deleteSpecItem('${item.id}')">${getLabel('chatMsgDelete')}</button>
                </div>
                <div class="swipe-content" ontouchstart="handleTouchStart(event, this)" ontouchmove="handleTouchMove(event, this)" ontouchend="handleTouchEnd(event, this)">
                    <input type="checkbox" class="spec-checkbox" ${item.done ? 'checked' : ''} onchange="toggleSpecDone('${item.id}', this.checked)">
                    <span class="spec-card-source ${item.source}">${item.source === 'auto' ? 'AI' : 'USER'}</span>
                    <div id="spec-text-${item.id}" class="spec-card-text ${item.done ? 'done' : ''}" contenteditable="true" onblur="updateSpecText('${item.id}', this.innerText)">${escapeHtml(item.text)}</div>
                </div>
            </div>
        `).join('');
    }
    updateSpecBadge();
}

function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

function toggleSpecDone(id, checked) {
    const list = getSpecList();
    const item = list.find(i => i.id === id);
    if (item) { item.done = checked; saveSpecList(list); renderSpecCards(); }
}

function addSpecManual() {
    const input = document.getElementById('spec-add-input');
    const text = input.value.trim();
    if (!text) return;
    const list = getSpecList();
    if (list.some(item => item.text === text)) { showToast(getLabel('toastSpecExists')); return; }
    list.push({ id: Date.now().toString(), text, source: 'user', isNew: true, done: false });
    saveSpecList(list);
    input.value = '';
    renderSpecCards();
    showToast(getLabel('toastSpecAdded'));
}

function deleteSpecItem(id) {
    if (!confirm(getLabel('specDeleteConfirm'))) return;
    const list = getSpecList().filter(item => item.id !== id);
    saveSpecList(list);
    renderSpecCards();
}

function editSpecText(id) {
    const el = document.getElementById('spec-text-' + id);
    if (el) {
        if (activeSwipeElement) { activeSwipeElement.style.transform = 'translateX(0)'; activeSwipeElement = null; }
        el.focus();
    }
}

function updateSpecText(id, newText) {
    const text = newText.trim();
    if (!text) { deleteSpecItem(id); return; }
    const list = getSpecList();
    const item = list.find(i => i.id === id);
    if (item && item.text !== text) { item.text = text; saveSpecList(list); showToast(getLabel('toastSpecUpdated')); }
}

function clearSpecList() {
    const list = getSpecList();
    if (list.length === 0) return showToast(getLabel('toastEmptySpecs'));
    if (!confirm(getLabel('specClearConfirm'))) return;
    saveSpecBackup(list);
    saveSpecList([]);
    renderSpecCards();
    document.getElementById('spec-restore-btn').style.display = '';
    showToast(getLabel('toastSpecCleared'));
}

function restoreSpecList() {
    const backup = getSpecBackup();
    if (backup.length === 0) return;
    saveSpecList(backup);
    renderSpecCards();
    document.getElementById('spec-restore-btn').style.display = 'none';
    showToast(getLabel('toastSpecRestored'));
}

function specListToString() {
    const list = getSpecList();
    return list.length === 0 ? '（なし）' : list.map((item, i) => `${i + 1}. ${item.text}`).join('\n');
}
