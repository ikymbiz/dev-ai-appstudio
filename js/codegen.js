/* ============================================
   codegen.js — コード生成・仕様検証・デバッグ依頼
   依存: db.js, config.js, specs.js, chat.js, editor.js, settings.js
   ============================================ */

async function generateCode() {
    clearNewSpecFlags();
    const prof = document.getElementById('user-profile').value;
    const model = document.getElementById('code-model').value;
    const currentCode = window.getCode();

    const sysMsgObj = { id: Date.now().toString(), role: 'ai system-msg', text: `<div style="display:flex;align-items:center;"><div class="spinner"></div><span>${getLabel('aiSystemMsgBuildingCode')}</span></div>`, html: true };
    chatHistory.push(sysMsgObj); saveToDB('chatHistory', chatHistory); renderMessageFromHistory(sysMsgObj);

    const themeCSS = await getSelectedThemeCSS();
    const system = `Expert Full-stack Web Developerとして完全なHTMLファイルを出力してください。\n${document.getElementById('system-prompt').value.trim()}\nペルソナ: ${prof}\nルール: Markdownのコードブロック不要。\n${document.getElementById('code-principles').value.trim()}\n${themeCSS ? `【デザイン】以下のCSS変数を使用\n${themeCSS}` : ''}\n${currentCode ? `既存コード:\n${currentCode}` : '新規作成'}\n【実装要件】\n${specListToString()}`;

    try {
        const result = await callLLM({ prompt: system, stream: false, model });
        let code = result.text.replace(/^```html\s*/i, '').replace(/^```\s*/, '').replace(/```$/g, '').trim();
        window.setCode(code); updatePreview(); showPage('preview', document.getElementById('tab-preview'));
        sysMsgObj.text = getLabel('aiSystemMsgBuildComplete'); sysMsgObj.html = false;
        document.querySelector(`[data-id="${sysMsgObj.id}"] .msg-content`).textContent = sysMsgObj.text;
        saveToDB('chatHistory', chatHistory);
        verifySpecCoverage(code);
    } catch (e) {
        sysMsgObj.text = `<span style="color:var(--danger)">${getLabel('aiSystemMsgBuildError')} ${e.message}</span>`;
        document.querySelector(`[data-id="${sysMsgObj.id}"] .msg-content`).innerHTML = sysMsgObj.text;
        saveToDB('chatHistory', chatHistory);
    }
}

async function verifySpecCoverage(code) {
    const list = getSpecList(); if (list.length === 0) return;
    try {
        const prompt = (document.getElementById('prompt-verify').value.trim() || getPrompt('verify'))
            .replace('{specList}', specListToString()).replace('{generatedCode}', code.slice(0, 30000));
        const result = await callLLM({ prompt, stream: false, model: document.getElementById('code-model').value });
        const missing = JSON.parse(result.text.replace(/```json|```/g, '').trim());
        let sysMsg;
        if (Array.isArray(missing) && missing.length > 0) {
            sysMsg = { id: Date.now().toString(), role: 'ai system-msg', text: `${getLabel('aiSystemMsgMissingReqs')}${missing.map((m,i) => `  ${i+1}. ${m}`).join('\n')}`, html: false };
            const newList = missing.map(m => ({ id: Date.now().toString() + Math.random().toString(36).slice(2, 6), text: m, source: 'auto', isNew: true, done: false }));
            saveSpecBackup(list); saveSpecList(newList); renderSpecCards();
            setTimeout(() => showAIQuestionModal(getLabel('aiQuestionPromptMissingReqs'), [getLabel('aiQuestionOptionFix'), getLabel('aiQuestionOptionSuggest')]), 1000);
        } else {
            sysMsg = { id: Date.now().toString(), role: 'ai system-msg', text: getLabel('aiSystemMsgAllSpecsCovered'), html: false };
            saveSpecBackup(list); saveSpecList([]); document.getElementById('spec-restore-btn').style.display = ''; renderSpecCards();
        }
        chatHistory.push(sysMsg); saveToDB('chatHistory', chatHistory); renderMessageFromHistory(sysMsg);
    } catch(e) { /* silent error */ }
}

function sendDebugRequest() {
    const text = document.getElementById('debug-memo').value.trim();
    if (!text) return;
    showPage('chat', document.getElementById('tab-chat'));
    const input = document.getElementById('user-prompt');
    input.value = getPrompt('debug').replace('{memoText}', text);
    autoGrow(input);
    document.getElementById('debug-memo').value = '';
    askAI();
}
