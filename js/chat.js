/* ============================================
   chat.js — チャット機能一式
   依存: db.js, config.js, specs.js, editor.js
   公開: callLLM(), askAI(), loadChatHistory(),
         chatHistory, conversationContext,
         createMessageElement(), renderMessageFromHistory(),
         rebuildConversationContext(), confirmReset(), resetChatForNewCode()
   ============================================ */

/* --- 共有状態変数（main.jsの添付UI操作からも参照される） --- */
var currentImageBase64 = null;
var currentMimeType = null;
var currentFileName = null;

let conversationContext = "";
let chatHistory = [];

/* === LLM API通信 === */
async function callLLM({ prompt, stream = false, model, images = [] }) {
    const provider = document.getElementById('ai-provider').value;
    const key = getCurrentApiKey();
    if (!key) {
        const res = await fetch(PROXY_WORKER_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
        const data = await res.json();
        return { text: data.candidates ? data.candidates[0].content.parts[0].text : (data.response || data.text || JSON.stringify(data)) };
    }
    if (provider === 'gemini') {
        const parts = [{ text: prompt }];
        images.forEach(img => parts.push({ inline_data: { mime_type: img.mime, data: img.base64 } }));
        if (stream) {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts }] }) });
            return { reader: res.body.getReader(), parseChunk: (line) => { try { const d = JSON.parse(line.slice(6)); return d.candidates?.[0]?.content?.parts?.[0]?.text || ''; } catch(e) { return ''; } }, prefix: 'data: ' };
        } else {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }] }) });
            const data = await res.json();
            return { text: data.candidates[0].content.parts[0].text };
        }
    }
    throw new Error('実装されたプロバイダーを使用してください (Gemini 推奨)');
}

/* === チャット履歴の取得 === */
function getRecentChat(n = 3) {
    return chatHistory.filter(m => m.role === 'user' || m.role === 'ai').slice(-(n * 2)).map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.text}`).join('\n');
}

/* === 仕様抽出（AI応答から） === */
async function extractSpecsFromChat(userText, aiText) {
    try {
        const prompt = (document.getElementById('prompt-extract').value.trim() || getPrompt('extract'))
            .replace('{userMessage}', userText).replace('{aiResponse}', aiText).replace('{existingSpecs}', specListToString());
        const result = await callLLM({ prompt, stream: false, model: document.getElementById('chat-model').value });
        const items = JSON.parse(result.text.replace(/```json|```/g, '').trim());
        if (Array.isArray(items) && items.length > 0) {
            const list = getSpecList(); let addedCount = 0;
            items.forEach(text => {
                if (typeof text === 'string' && text.trim()) {
                    const trimmed = text.trim();
                    if (!list.some(item => item.text === trimmed)) {
                        list.push({ id: Date.now().toString() + Math.random().toString(36).slice(2, 6), text: trimmed, source: 'auto', isNew: true, done: false });
                        addedCount++;
                    }
                }
            });
            if (addedCount > 0) {
                saveSpecList(list); renderSpecCards();
                const sysMsg = { id: Date.now().toString(), role: 'ai system-msg', text: getLabel('aiSystemMsgSpecsUpdated').replace('{count}', addedCount), html: false };
                chatHistory.push(sysMsg); saveToDB('chatHistory', chatHistory); renderMessageFromHistory(sysMsg);
            }
        }
    } catch(e) { /* silent error */ }
}

/* === ペルソナ抽出・更新提案 === */
async function extractUserProfileFromChat(userText, aiText) {
    const currentProfile = document.getElementById('user-profile').value;
    const prompt = (document.getElementById('prompt-extractProfile').value.trim() || getPrompt('extractProfile'))
        .replace('{currentProfile}', currentProfile).replace('{userText}', userText).replace('{aiText}', aiText);
    try {
        const result = await callLLM({ prompt, stream: false, model: document.getElementById('chat-model').value });
        const cleaned = result.text.replace(/```json|```/g, '').trim();
        if (!cleaned || cleaned === '{}') return;
        const data = JSON.parse(cleaned);
        if (data.newProfile && data.newProfile !== currentProfile) { showProfileProposalModal(currentProfile, data.newProfile); }
    } catch(e) { /* silent error */ }
}

function showProfileProposalModal(oldProfile, newProfile) {
    document.getElementById('old-profile-text').textContent = oldProfile;
    document.getElementById('new-profile-text').textContent = newProfile;
    document.getElementById('profile-proposal-modal').classList.add('show');
}
function closeProfileProposalModal() { document.getElementById('profile-proposal-modal').classList.remove('show'); }
function acceptProfileProposal() {
    document.getElementById('user-profile').value = document.getElementById('new-profile-text').textContent;
    autoSaveSettings();
    closeProfileProposalModal();
    showToast(getLabel('toastProfileUpdated'));
}

/* === AI質問・選択肢モーダル === */
function showAIQuestionModal(text, options) {
    document.getElementById('ai-question-text').innerText = text;
    const container = document.getElementById('ai-question-options');
    container.innerHTML = '';
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'modal-btn';
        btn.style.background = 'var(--color-bg-elevated)';
        btn.style.border = '1px solid var(--primary)';
        btn.innerText = opt.trim();
        btn.onclick = () => {
            closeAIQuestionModal();
            const choice = opt.trim();
            if (choice === getLabel('aiQuestionOptionFix') || choice === getLabel('aiQuestionOptionFixAlt')) {
                document.getElementById('user-prompt').value = getPrompt('debug').replace('{memoText}', getLabel('aiQuestionOptionFixPrompt'));
            } else if (choice === getLabel('aiQuestionOptionSuggest')) {
                document.getElementById('user-prompt').value = getPrompt('suggest');
            } else {
                document.getElementById('user-prompt').value = choice;
            }
            autoGrow(document.getElementById('user-prompt'));
            askAI();
        };
        container.appendChild(btn);
    });
    document.getElementById('ai-question-modal').classList.add('show');
}
function closeAIQuestionModal() { document.getElementById('ai-question-modal').classList.remove('show'); }

/* === チャット履歴の読み込みと描画 === */
async function loadChatHistory() {
    const history = await getFromDB('chatHistory');
    if (history && history.length > 0) {
        chatHistory = history;
        document.getElementById('chat-log').innerHTML = '';
        chatHistory.forEach(msg => {
            if(msg.html && msg.text.includes('spinner')) { msg.text = getLabel('aiSystemMsgInterrupted'); msg.html = false; }
            renderMessageFromHistory(msg);
        });
        rebuildConversationContext();
    } else {
        const initMsg = { id: Date.now().toString(), role: 'ai system-msg', text: getLabel('aiSystemMsgInitial'), html: false };
        chatHistory.push(initMsg);
        saveToDB('chatHistory', chatHistory);
        renderMessageFromHistory(initMsg);
        rebuildConversationContext();
    }
}

function renderMessageFromHistory(msg) {
    const log = document.getElementById('chat-log');
    log.appendChild(createMessageElement(msg));
    log.scrollTop = log.scrollHeight;
}

function createMessageElement(msg) {
    const d = document.createElement('div'); d.className = `msg ${msg.role}`; d.dataset.id = msg.id;
    const c = document.createElement('div'); c.className = 'msg-content';
    if (msg.html) c.innerHTML = msg.text; else c.textContent = msg.text;
    d.appendChild(c);
    if (!msg.role.includes('system-msg') && !msg.html) {
        const a = document.createElement('div'); a.className = 'msg-actions';
        const ed = document.createElement('button'); ed.className = 'msg-action-btn'; ed.innerHTML = getLabel('chatMsgEdit');
        ed.onclick = () => {
            if (c.contentEditable === "true") {
                c.contentEditable = "false"; c.style.border = "none"; c.style.padding = "0"; ed.innerHTML = getLabel('chatMsgEdit');
                const m = chatHistory.find(x => x.id === msg.id);
                if (m) { m.text = c.textContent; saveToDB('chatHistory', chatHistory); rebuildConversationContext(); showToast(getLabel('toastSettingsSaved')); }
            } else {
                c.contentEditable = "true"; c.style.border = "1px solid var(--primary)"; c.style.padding = "4px"; c.focus(); ed.innerHTML = getLabel('chatMsgSave');
            }
        };
        const dl = document.createElement('button'); dl.className = 'msg-action-btn'; dl.innerHTML = getLabel('chatMsgDelete');
        dl.onclick = () => { chatHistory = chatHistory.filter(x => x.id !== msg.id); d.remove(); saveToDB('chatHistory', chatHistory); rebuildConversationContext(); showToast(getLabel('toastSettingsSaved')); };
        a.appendChild(ed); a.appendChild(dl); d.appendChild(a);
    }
    if (msg.role === 'ai' && !msg.html) {
        const b = document.createElement('div'); b.className = 'generate-btn-wrapper'; let h = false;
        if (msg.text.includes(getLabel('generateCodeButton'))) {
            const gb = document.createElement('button'); gb.className = 'generate-btn'; gb.innerHTML = getLabel('generateCodeButton'); gb.onclick = generateCode; b.appendChild(gb); h = true;
        }
        if (msg.text.includes(getLabel('aiQuestionOptionSuggest'))) {
            const pb = document.createElement('button'); pb.className = 'generate-btn'; pb.style.background = 'var(--accent)'; pb.innerHTML = getLabel('aiQuestionOptionSuggest'); pb.onclick = askForPlan; b.appendChild(pb); h = true;
        }
        if (h) d.appendChild(b);
    }
    return d;
}

function rebuildConversationContext() {
    conversationContext = "";
    chatHistory.forEach(msg => {
        if (msg.role === 'user') { conversationContext += `\nユーザー: ${msg.text}`; if(msg.attachment) conversationContext += ` (添付: ${msg.attachment})`; }
        else if (msg.role === 'ai') { conversationContext += `\nアシスタント: ${msg.text}`; }
    });
}

function confirmReset() {
    if (confirm(getLabel('tabButtonResetConfirm'))) {
        chatHistory = []; document.getElementById('chat-log').innerHTML = '';
        window.setCode(""); updatePreview(); removeAttachment();
        const initMsg = { id: Date.now().toString(), role: 'ai system-msg', text: getLabel('aiSystemMsgReset'), html: false };
        chatHistory.push(initMsg); saveToDB('chatHistory', chatHistory); renderMessageFromHistory(initMsg); rebuildConversationContext();
        clearSpecList();
    }
}

function resetChatForNewCode(source) {
    chatHistory = []; document.getElementById('chat-log').innerHTML = '';
    const msg = { id: Date.now().toString(), role: 'ai system-msg', text: getLabel('aiSystemMsgCodeLoaded').replace('{source}', source), html: false };
    chatHistory.push(msg); saveToDB('chatHistory', chatHistory); renderMessageFromHistory(msg); rebuildConversationContext();
    clearSpecList();
}

/* === チャット送信 === */
function askForPlan() { document.getElementById('user-prompt').value = getPrompt('suggest'); askAI(); }

async function askAI() {
    const prof = document.getElementById('user-profile').value;
    const model = document.getElementById('chat-model').value;
    const input = document.getElementById('user-prompt');
    const promptText = input.value.trim();
    if(!promptText && !currentFileName) return showToast(getLabel('toastInputRequired'));

    const userMsgObj = { id: Date.now().toString(), role: 'user', text: promptText, html: false };
    if(currentFileName) userMsgObj.attachment = currentFileName;
    chatHistory.push(userMsgObj); saveToDB('chatHistory', chatHistory); renderMessageFromHistory(userMsgObj);

    const aiMsgId = (Date.now() + 1).toString();
    const aiMsgObj = { id: aiMsgId, role: 'ai', text: `<div style="display:flex;align-items:center;"><div class="spinner"></div><span>${getLabel('aiSystemMsgThinking')}</span></div>`, html: true };
    chatHistory.push(aiMsgObj); saveToDB('chatHistory', chatHistory);
    const log = document.getElementById('chat-log');
    const aiMsgElement = createMessageElement(aiMsgObj);
    log.appendChild(aiMsgElement); log.scrollTop = log.scrollHeight;
    const contentDiv = aiMsgElement.querySelector('.msg-content');

    input.value = ''; input.style.height = "44px";

    const codeContext = window.getCode() ? `\n\n【現在のコード】\n\`\`\`html\n${window.getCode()}\n\`\`\`\n※上記を踏まえて提案してください。` : "";
    const system = (document.getElementById('prompt-plan').value.trim() || getPrompt('plan'))
        .replace('{prof}', prof).replace('{codeContext}', codeContext)
        .replace('{systemPrompt}', document.getElementById('system-prompt').value.trim())
        .replace('{specList}', specListToString()).replace('{recentChat}', getRecentChat(3));

    const images = [];
    if (currentImageBase64 && currentMimeType) { images.push({ mime: currentMimeType, base64: currentImageBase64 }); removeAttachment(); }

    let aiText = "";
    try {
        const key = getCurrentApiKey();
        if (key && document.getElementById('ai-provider').value === 'gemini') {
            const result = await callLLM({ prompt: system, stream: true, model, images });
            const reader = result.reader; const decoder = new TextDecoder("utf-8"); let buffer = "";
            contentDiv.innerHTML = "";
            while (true) {
                const { value, done } = await reader.read(); if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n'); buffer = lines.pop();
                for (const line of lines) {
                    if (line.startsWith(result.prefix || 'data: ')) {
                        const chunk = result.parseChunk(line);
                        if (chunk) { aiText += chunk; contentDiv.innerText = aiText; log.scrollTop = log.scrollHeight; }
                    }
                }
            }
        } else {
            const result = await callLLM({ prompt: system, stream: false, model, images });
            aiText = result.text; contentDiv.innerText = aiText;
        }

        // 選択肢の抽出とモーダル表示
        const optionRegex = /\[OPTIONS:\s*(.*?)\s*\]/;
        const match = aiText.match(optionRegex);
        if (match) {
            const options = match[1].split('|').map(s => s.trim()).filter(s => s);
            aiText = aiText.replace(optionRegex, '').trim();
            showAIQuestionModal(getLabel('aiQuestionModalTitle'), options);
        }

        const aiMsgToUpdate = chatHistory.find(m => m.id === aiMsgId);
        if(aiMsgToUpdate) { aiMsgToUpdate.text = aiText; aiMsgToUpdate.html = false; saveToDB('chatHistory', chatHistory); aiMsgElement.replaceWith(createMessageElement(aiMsgToUpdate)); log.scrollTop = log.scrollHeight; }
        if (aiText) { await extractSpecsFromChat(promptText, aiText); extractUserProfileFromChat(promptText, aiText); }
    } catch (e) {
        contentDiv.textContent = `${getLabel('aiSystemMsgBuildError')} ${e.message}`;
    } finally {
        clearNewSpecFlags();
    }
}
