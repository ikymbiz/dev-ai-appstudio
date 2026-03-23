/* ============================================
   editor.js — CodeMirror初期化・検索・コード操作
   依存: db.js
   ============================================ */

let cmView = null;
let cmSearchModules = null;
let searchMatchesCount = 0;
let currentSearchIndex = -1;

async function initCodeMirror(initialCode) {
    try {
        const [{ basicSetup }, { EditorView }, { EditorState }, { html }, { oneDark }, searchMod] = await Promise.all([
            import("https://esm.sh/codemirror"),
            import("https://esm.sh/@codemirror/view"),
            import("https://esm.sh/@codemirror/state"),
            import("https://esm.sh/@codemirror/lang-html"),
            import("https://esm.sh/@codemirror/theme-one-dark"),
            import("https://esm.sh/@codemirror/search")
        ]);
        cmSearchModules = searchMod;
        const customTheme = EditorView.theme({
            "&": { height: "100%", fontSize: "14px", fontFamily: "var(--font-mono)" },
            ".cm-scroller": { overflow: "auto" },
            ".cm-searchMatch": { backgroundColor: "rgba(234, 179, 8, 0.4) !important" },
            ".cm-searchMatch-selected": { backgroundColor: "rgba(234, 179, 8, 0.9) !important" }
        });
        const updateListener = EditorView.updateListener.of((update) => {
            if (update.docChanged) {
                updatePreview();
                saveToDB('currentCode', window.getCode());
            }
        });
        cmView = new EditorView({
            state: EditorState.create({
                doc: initialCode || "",
                extensions: [basicSetup, html(), oneDark, customTheme, searchMod.search({top: true}), updateListener]
            }),
            parent: document.getElementById('code-editor-container')
        });
        updatePreview();
    } catch (e) {
        console.error("CodeMirror load failed:", e);
    }
}

window.getCode = function() { return cmView ? cmView.state.doc.toString() : ""; };
window.setCode = function(code) { if(cmView) cmView.dispatch({ changes: { from: 0, to: cmView.state.doc.length, insert: code } }); };

function openSearchModal() {
    document.getElementById('code-search-input').value = '';
    document.getElementById('search-modal').classList.add('show');
    document.getElementById('code-search-input').focus();
    performCodeSearch();
}

function closeSearchModal() { document.getElementById('search-modal').classList.remove('show'); }

function performCodeSearch() {
    if (!cmView || !cmSearchModules) return;
    const q = document.getElementById('code-search-input').value;
    cmView.dispatch({ effects: cmSearchModules.setSearchQuery.of(new cmSearchModules.SearchQuery({ search: q })) });
    const code = window.getCode().toLowerCase();
    const query = q.toLowerCase();
    if (!query) {
        document.getElementById('search-status').innerText = '0/0';
        searchMatchesCount = 0;
        currentSearchIndex = -1;
        return;
    }
    let count = 0;
    let index = code.indexOf(query);
    while(index !== -1) { count++; index = code.indexOf(query, index + query.length); }
    searchMatchesCount = count;
    currentSearchIndex = count > 0 ? 1 : 0;
    document.getElementById('search-status').innerText = count > 0 ? `${currentSearchIndex}/${count}` : '0/0';
}

function nextSearchMatch() {
    if (!cmView || !cmSearchModules || searchMatchesCount === 0) return;
    cmSearchModules.findNext(cmView);
    currentSearchIndex = currentSearchIndex < searchMatchesCount ? currentSearchIndex + 1 : 1;
    document.getElementById('search-status').innerText = `${currentSearchIndex}/${searchMatchesCount}`;
    document.getElementById('code-search-input').focus();
}

function prevSearchMatch() {
    if (!cmView || !cmSearchModules || searchMatchesCount === 0) return;
    cmSearchModules.findPrevious(cmView);
    currentSearchIndex = currentSearchIndex > 1 ? currentSearchIndex - 1 : searchMatchesCount;
    document.getElementById('search-status').innerText = `${currentSearchIndex}/${searchMatchesCount}`;
    document.getElementById('code-search-input').focus();
}
