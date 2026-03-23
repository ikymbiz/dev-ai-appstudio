/* ============================================
   settings.js — 設定・APIキー暗号化・テーマ・テンプレート
   依存: db.js, config.js, editor.js, chat.js
   ============================================ */

/* === APIキー暗号化 === */
const KEY_EXPIRYDAYS = 14;
const CRYPTO_SALT = 'AIWebStudio-salt';

async function getCryptoKey() {
    const enc = new TextEncoder();
    const km = await crypto.subtle.importKey('raw', enc.encode(CRYPTO_SALT + navigator.userAgent.slice(0, 50)), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: enc.encode(CRYPTO_SALT), iterations: 100000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function saveEncryptedKeys(keys) {
    const key = await getCryptoKey(); const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(keys)));
    await saveToDB('encryptedApiKeys', { iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)), ts: Date.now() });
}

async function loadEncryptedKeys() {
    try {
        const obj = await getFromDB('encryptedApiKeys');
        if (!obj) return null;
        if (Date.now() - obj.ts > KEY_EXPIRYDAYS * 24 * 60 * 60 * 1000) { await deleteFromDB('encryptedApiKeys'); return null; }
        const key = await getCryptoKey();
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(obj.iv) }, key, new Uint8Array(obj.data));
        return JSON.parse(new TextDecoder().decode(decrypted));
    } catch(e) { return null; }
}

function updateKeyExpiryStatus(keys) {
    const el = document.getElementById('key-expiry-status'); if (!el) return;
    if (!keys) { el.innerHTML = getLabel('keyExpiryStatusNotSaved'); return; }
    getFromDB('encryptedApiKeys').then(obj => {
        if (!obj || !obj.ts) { el.textContent = ''; return; }
        const remaining = Math.ceil((new Date(obj.ts + KEY_EXPIRYDAYS * 24 * 60 * 60 * 1000) - Date.now()) / (24 * 60 * 60 * 1000));
        el.textContent = remaining > 0 ? getLabel('keyExpiryStatusRemaining').replace('{remaining}', remaining) : getLabel('keyExpiryStatusExpired');
    });
}

function getCurrentApiKey() {
    const provider = document.getElementById('ai-provider').value;
    const el = document.getElementById('api-key-' + provider);
    return el ? el.value.trim() : '';
}

function onProviderChange() {
    const provider = document.getElementById('ai-provider').value;
    updateModelOptions('chat-model', PROVIDER_MODELS[provider].chat);
    updateModelOptions('code-model', PROVIDER_MODELS[provider].code);
    document.querySelectorAll('.api-key-field').forEach(el => el.style.display = el.dataset.provider === provider ? '' : 'none');
    toggleModelSelects();
}

function updateModelOptions(selectId, models) {
    document.getElementById(selectId).innerHTML = models.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
}

function toggleModelSelects() {
    const k = getCurrentApiKey();
    const chat = document.getElementById('chat-model'), code = document.getElementById('code-model');
    chat.style.opacity = k ? "1" : "0.6";
    code.style.opacity = k ? "1" : "0.6";
}

/* === 自動保存 === */
let saveTimeout;
async function autoSaveSettings() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        const apiKeys = { gemini: document.getElementById('api-key-gemini').value, openai: document.getElementById('api-key-openai').value, claude: document.getElementById('api-key-claude').value, xai: document.getElementById('api-key-xai').value, groq: document.getElementById('api-key-groq').value };
        const hasAnyKey = Object.values(apiKeys).some(v => v.trim());
        if (hasAnyKey) await saveEncryptedKeys(apiKeys); else await deleteFromDB('encryptedApiKeys');
        updateKeyExpiryStatus(hasAnyKey ? apiKeys : null);
        const settings = {
            aiProvider: document.getElementById('ai-provider').value, chatModel: document.getElementById('chat-model').value, codeModel: document.getElementById('code-model').value,
            userProfile: document.getElementById('user-profile').value, systemPrompt: document.getElementById('system-prompt').value, codePrinciples: document.getElementById('code-principles').value,
            promptPlan: document.getElementById('prompt-plan').value, promptSuggest: document.getElementById('prompt-suggest').value, promptDebug: document.getElementById('prompt-debug').value,
            promptExtract: document.getElementById('prompt-extract').value, promptVerify: document.getElementById('prompt-verify').value, promptExtractProfile: document.getElementById('prompt-extractProfile').value
        };
        await saveToDB('settings', settings);
        const ghToken = document.getElementById('setting-gh-token').value.trim();
        if (ghToken) { await saveToDB('gh_token', ghToken); document.getElementById('deploy-token-input').value = ghToken; } else await deleteFromDB('gh_token');
        showToast(getLabel('toastSettingsSaved'));
    }, 800);
}

/* === テーマ管理 === */
let customThemes = [], currentThemeId = 'none', editingThemeId = null, presetThemes = [];
const THEME_VARS = [
    {key:'color-bg-deep',label:'背景 (深)',default:'#0D0F14'}, {key:'color-bg-surface',label:'背景 (面)',default:'#161920'},
    {key:'color-bg-elevated',label:'背景 (浮)',default:'#1E2433'}, {key:'color-border',label:'ボーダー',default:'#2A2D36'},
    {key:'color-text-primary',label:'テキスト',default:'#E8E4F0'}, {key:'primary',label:'Primary',default:'#3b82f6'}, {key:'accent',label:'Accent',default:'#8b5cf6'}
];

async function loadThemeManager() {
    try { customThemes = (await getFromDB('customThemes')) || []; const saved = await getFromDB('codeTheme'); if (saved) currentThemeId = saved; } catch(e){}
    renderThemeGrid();
}

function renderThemeGrid() {
    let h = `<div class="theme-card ${currentThemeId==='none'?'active':''}" onclick="selectTheme('none')"><div class="theme-preview-dots"><div class="theme-preview-dot" style="background:#888"></div></div><div class="theme-card-name">🚫 ${getLabel('noSpecsMessage')}</div></div>`;
    h += customThemes.map(t => `<div class="theme-card ${t.id===currentThemeId?'active':''}" onclick="selectTheme('${t.id}')"><div class="theme-preview-dots"><div class="theme-preview-dot" style="background:${t.colors['color-bg-deep']}"></div><div class="theme-preview-dot" style="background:${t.colors['primary']}"></div></div><div class="theme-card-name">${t.name}</div><div class="theme-card-actions"><button class="theme-action-btn" onclick="event.stopPropagation();deleteTheme('${t.id}')">${getLabel('chatMsgDelete')}</button></div></div>`).join('');
    h += `<div class="theme-new-card" onclick="openThemeEditor()">＋<span>${getLabel('newRepoCreateButton')}</span></div>`;
    document.getElementById('theme-grid').innerHTML = h;
}

async function selectTheme(id) { currentThemeId = id; await saveToDB('codeTheme', id); renderThemeGrid(); if (window.getCode() && id !== 'none') injectThemeToCode(true); }
async function getSelectedThemeCSS() { if (currentThemeId === 'none') return null; const t = customThemes.find(x => x.id === currentThemeId); return t ? t.css : null; }

function openThemeEditor() {
    editingThemeId = null;
    document.getElementById('theme-editor-title').textContent = getLabel('themeEditorModalTitleCreate');
    document.getElementById('te-name').placeholder = getLabel('themeEditorNamePlaceholder');
    document.getElementById('te-icon').placeholder = getLabel('themeEditorIconPlaceholder');
    document.getElementById('te-desc').placeholder = getLabel('themeEditorDescPlaceholder');
    document.getElementById('te-colors').innerHTML = THEME_VARS.map(v => `<div style="display:flex;flex-direction:column;gap:4px;"><label style="font-size:10px">${v.label}</label><div style="display:flex;gap:4px;"><input type="color" value="${v.default}" oninput="this.nextElementSibling.value=this.value" style="width:30px;height:24px;border:none"><input type="text" class="theme-color-hex" data-key="${v.key}" value="${v.default}" style="flex:1;font-size:11px" oninput="if(/^#[0-9a-fA-F]{6}$/.test(this.value))this.previousElementSibling.value=this.value"></div></div>`).join('');
    document.getElementById('theme-editor-modal').classList.add('show');
}
function closeThemeEditor() { document.getElementById('theme-editor-modal').classList.remove('show'); }

async function saveThemeFromEditor() {
    const name = document.getElementById('te-name').value.trim(); if (!name) return;
    const colors = {}; document.querySelectorAll('.theme-color-hex').forEach(el => colors[el.dataset.key] = el.value);
    let css = ':root{\n'; THEME_VARS.forEach(v => css += `  --${v.key}: ${colors[v.key]};\n`);
    css += `  --bg: ${colors['color-bg-deep']}; --sidebar: ${colors['color-bg-surface']}; --user-msg: ${colors['color-bg-elevated']}; --ai-msg: ${colors['color-bg-deep']};\n}\nbody { color: ${colors['color-text-primary']}; background: ${colors['color-bg-deep']}; }`;
    const t = { id: 'custom-' + Date.now(), name, colors, css };
    customThemes.push(t); await saveToDB('customThemes', customThemes);
    currentThemeId = t.id; await saveToDB('codeTheme', t.id);
    renderThemeGrid(); closeThemeEditor(); showToast(getLabel('toastThemeSaved'));
}

async function deleteTheme(id) {
    if (!confirm(getLabel('themeDeleteConfirm'))) return;
    customThemes = customThemes.filter(t => t.id !== id); await saveToDB('customThemes', customThemes);
    if (currentThemeId === id) { currentThemeId = 'none'; await saveToDB('codeTheme', 'none'); }
    renderThemeGrid();
}

async function injectThemeToCode(silent) {
    const css = await getSelectedThemeCSS(); if (!css) return;
    let code = window.getCode(); if (!code) return;
    const block = `/* === CODE THEME === */\n${css.trim()}\n/* === /CODE THEME === */`;
    const regex = /\/\* === CODE THEME === \*\/[\s\S]*?\/\* === \/CODE THEME === \*\//;
    if (regex.test(code)) code = code.replace(regex, block);
    else { const pos = code.lastIndexOf('</style>'); if (pos !== -1) code = code.slice(0, pos) + '\n' + block + '\n' + code.slice(pos); else { const h = code.indexOf('</head>'); if(h !== -1) code = code.slice(0, h) + '<style>\n' + block + '\n</style>\n' + code.slice(h); } }
    window.setCode(code); updatePreview();
    if (!silent) showToast(getLabel('toastThemeApplied'));
}

/* === テンプレート管理 === */
let customTemplates = [];

async function loadTemplateList() { try { customTemplates = (await getFromDB('customTemplates')) || []; } catch(e){} renderTemplateGrid(); }

function renderTemplateGrid() {
    let h = customTemplates.map(t => `<div class="template-card" onclick="applyTemplate('${t.id}')"><div class="template-card-actions"><button class="theme-action-btn" onclick="event.stopPropagation();deleteCustomTemplate('${t.id}')">${getLabel('chatMsgDelete')}</button></div><span class="template-icon">${t.icon}</span><div class="template-name">${t.name}</div></div>`).join('');
    h += `<div class="template-new-card" onclick="openTemplateEditor()">＋<span>${getLabel('templateAddButton')}</span></div>`;
    document.getElementById('template-grid').innerHTML = h;
}

function openTemplateEditor() {
    document.getElementById('tple-name').value=''; document.getElementById('tple-code').value='';
    document.getElementById('tple-icon').value=getLabel('templateEditorIconPlaceholder');
    document.getElementById('tple-name').placeholder = getLabel('templateEditorNamePlaceholder');
    document.getElementById('tple-code').placeholder = getLabel('templateEditorCodePlaceholder');
    document.getElementById('tpl-editor-modal').classList.add('show');
}
function closeTemplateEditor() { document.getElementById('tpl-editor-modal').classList.remove('show'); }
function triggerTplFileUpload() { document.getElementById('tpl-file-input').click(); }
function handleTplFileUpload(input) {
    const file = input.files[0]; if(!file)return;
    const reader = new FileReader();
    reader.onload = e => { document.getElementById('tple-code').value = e.target.result; if(!document.getElementById('tple-name').value) document.getElementById('tple-name').value = file.name.replace(/\.html$/i, ''); };
    reader.readAsText(file); input.value = '';
}

async function saveCustomTemplate() {
    const name = document.getElementById('tple-name').value.trim(); const code = document.getElementById('tple-code').value;
    if(!name||!code)return;
    const t = { id: 'ctpl-' + Date.now(), name, icon: document.getElementById('tple-icon').value||getLabel('templateEditorIconPlaceholder'), code };
    customTemplates.push(t); await saveToDB('customTemplates', customTemplates);
    renderTemplateGrid(); closeTemplateEditor(); showToast(getLabel('toastTemplateSaved'));
}

async function deleteCustomTemplate(id) {
    if(!confirm(getLabel('templateDeleteConfirm')))return;
    customTemplates = customTemplates.filter(t => t.id !== id); await saveToDB('customTemplates', customTemplates); renderTemplateGrid();
}

async function applyTemplate(id) {
    const t = customTemplates.find(x => x.id === id); if(!t)return;
    if (window.getCode() && !confirm(getLabel('tabButtonOverwriteConfirm'))) return;
    window.setCode(t.code); updatePreview();
    if (currentThemeId !== 'none') await injectThemeToCode(true);
    resetChatForNewCode(getLabel('templatesLabel') + '「' + t.name + '」');
    showPage('preview', document.getElementById('tab-preview'));
}
