/* ============================================
   main.js — エントリーポイント・初期化・ページ切替・添付・共通UI
   依存: 全モジュール（最後に読み込まれる）
   ============================================ */

/* --- 状態変数（添付ファイルはchat.jsで宣言済み） --- */
let swRegistration = null;

/* === 初期化 === */
window.onload = async () => {
    await loadPrompts();
    try { applyUITexts(); } catch(e) { console.warn('applyUITexts error:', e); }
    try {
        const settings = await getFromDB('settings');
        if (settings) {
            if (settings.aiProvider) document.getElementById('ai-provider').value = settings.aiProvider;
            onProviderChange();
            const decryptedKeys = await loadEncryptedKeys();
            if (decryptedKeys) {
                ['gemini','openai','claude','xai','groq'].forEach(k => document.getElementById('api-key-'+k).value = decryptedKeys[k] || '');
                updateKeyExpiryStatus(decryptedKeys);
            } else if (settings.apiKeys) {
                ['gemini','openai','claude','xai','groq'].forEach(k => document.getElementById('api-key-'+k).value = settings.apiKeys[k] || '');
                await saveEncryptedKeys(settings.apiKeys);
                updateKeyExpiryStatus(settings.apiKeys);
            } else updateKeyExpiryStatus(null);
            ['user-profile','system-prompt','code-principles','prompt-plan','prompt-suggest','prompt-debug','prompt-extract','prompt-verify','prompt-extractProfile'].forEach(k => {
                const camel = k.replace(/-([a-z])/g, g => g[1].toUpperCase());
                const savedValue = settings[camel];
                document.getElementById(k).value = (savedValue !== undefined && savedValue !== "") ? savedValue : getFieldDefaults()[k];
            });
            if (settings.chatModel) document.getElementById('chat-model').value = settings.chatModel;
            if (settings.codeModel) document.getElementById('code-model').value = settings.codeModel;
        } else {
            onProviderChange();
            ['user-profile','system-prompt','code-principles','prompt-plan','prompt-suggest','prompt-debug','prompt-extract','prompt-verify','prompt-extractProfile'].forEach(k => document.getElementById(k).value = getFieldDefaults()[k]);
            updateKeyExpiryStatus(null);
        }
        toggleModelSelects();
        const ghToken = await getFromDB('gh_token');
        if (ghToken) { document.getElementById('setting-gh-token').value = ghToken; document.getElementById('deploy-token-input').value = ghToken; }
    } catch(e) { /* silent error */ }

    await initCodeMirror(await getFromDB('currentCode'));
    await loadChatHistory();
    loadThemeManager();
    loadTemplateList();
    updateSpecBadge();
    if (getSpecBackup().length > 0) document.getElementById('spec-restore-btn').style.display = '';
};

/* === ページ切替 === */
function showPage(id, btn) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('p-' + id).classList.add('active');
    if (btn) btn.classList.add('active');
    if(id === 'preview') updatePreview();
}

/* === 共通UI === */
function autoGrow(element) { element.style.height = "5px"; element.style.height = (element.scrollHeight) + "px"; }

function toggleAttachmentMenu() {
    if (currentFileName) { removeAttachment(); return; }
    document.getElementById('attach-menu').classList.toggle('show');
}

function triggerFile(type) {
    document.getElementById('file-' + type).click();
    document.getElementById('attach-menu').classList.remove('show');
}

function handleAttachment(input) {
    const file = input.files[0]; if (!file) return;
    currentMimeType = file.type; currentFileName = file.name;
    const reader = new FileReader();
    reader.onloadend = () => {
        currentImageBase64 = reader.result.split(',')[1];
        document.querySelector('.file-label').innerHTML = '✕';
        document.querySelector('.file-label').style.background = 'var(--danger)';
        if (currentMimeType.startsWith('image/')) {
            document.getElementById('file-preview').src = reader.result;
            document.getElementById('file-preview').style.display = 'block';
            document.getElementById('file-name-display').style.display = 'none';
        } else {
            document.getElementById('file-preview').style.display = 'none';
            document.getElementById('file-name-display').innerText = `${getLabel('ghFilePrefix')} ${currentFileName}`;
            document.getElementById('file-name-display').style.display = 'inline-block';
        }
    };
    reader.readAsDataURL(file); input.value = '';
}

function removeAttachment() {
    currentImageBase64 = null; currentMimeType = null; currentFileName = null;
    document.getElementById('file-preview').style.display = 'none';
    document.getElementById('file-name-display').style.display = 'none';
    document.querySelector('.file-label').innerHTML = '＋';
    document.querySelector('.file-label').style.background = 'var(--color-bg-elevated)';
    document.getElementById('attach-menu').classList.remove('show');
}

function triggerCodeUpload() { document.getElementById('code-upload-input').click(); }

function handleCodeUpload(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        window.setCode(e.target.result); updatePreview();
        resetChatForNewCode(getLabel('uploadButton') + '「' + file.name + '」');
    };
    reader.readAsText(file); input.value = '';
}

function updatePreview() { document.getElementById('preview-frame').srcdoc = window.getCode(); }

function downloadCode() {
    const code = window.getCode();
    if (!code) return showToast(getLabel('toastCodeMissing'));
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'index.html';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    showToast(getLabel('toastDownloadStarted'));
}
