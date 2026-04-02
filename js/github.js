/* ============================================
   github.js — GitHub Import / Deploy
   依存: db.js, config.js, editor.js, chat.js
   ============================================ */

let ghImportRepos = [];
let ghPagesUrl = '';
let selectedDeployRepo = null;
let deployRepos = [];

/* ============================================
   § 1. カスタムエラークラス
   ============================================ */

class GitHubAPIError extends Error {
    constructor(status, message, body = null) {
        super(message);
        this.name = 'GitHubAPIError';
        this.status = status;
        this.body = body;
    }
}

/* ============================================
   § 2. トースト通知 (要件5)
   ============================================ */

/**
 * トースト通知を表示する
 * @param {string} message - 表示するメッセージ
 * @param {'success'|'error'|'warning'|'info'} type - 通知タイプ
 * @param {number} duration - 表示時間(ms) デフォルト4000
 */
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.warn('[Toast] #toast-container が見つかりません:', message);
        return;
    }

    const colorMap = {
        success: 'var(--success, #28a745)',
        error:   'var(--danger,  #dc3545)',
        warning: 'var(--warning, #ffc107)',
        info:    'var(--info,    #17a2b8)',
    };

    const toast = document.createElement('div');
    toast.style.cssText = `
        background: ${colorMap[type] ?? colorMap.info};
        color: #fff;
        padding: 12px 18px;
        border-radius: 8px;
        margin-top: 8px;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        opacity: 0;
        transition: opacity 0.3s ease;
        max-width: 340px;
        word-break: break-word;
    `;
    toast.textContent = message;
    container.appendChild(toast);

    // フェードイン
    requestAnimationFrame(() => { toast.style.opacity = '1'; });

    // フェードアウト & 削除
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 350);
    }, duration);
}

/* ============================================
   § 3. エラーハンドリングユーティリティ (要件2)
   ============================================ */

/**
 * GitHub APIレスポンスをチェックし、エラーなら GitHubAPIError を throw する
 * @param {Response} res - fetch レスポンス
 * @returns {Response}
 */
async function assertGitHubResponse(res) {
    if (res.ok) return res;
    let body = null;
    try { body = await res.json(); } catch (_) {}
    const msg = body?.message ?? res.statusText ?? 'Unknown error';
    console.error(`[GitHub API] HTTP ${res.status} — ${res.url}`, body);
    throw new GitHubAPIError(res.status, msg, body);
}

/**
 * エラーを解析し、UI (#deploy-execute-status) とトーストにフィードバックを表示する
 * @param {Error} error
 * @param {string} defaultMessage - フォールバックメッセージ
 * @param {HTMLElement|null} statusEl - ステータス表示要素
 */
function handleDeployError(error, defaultMessage, statusEl = null) {
    let userMessage = defaultMessage;

    if (error instanceof GitHubAPIError) {
        switch (error.status) {
            case 401: userMessage = getLabel('tokenInvalidAlert');          break;
            case 403: userMessage = `権限エラー (403): ${error.message}`;  break;
            case 404: userMessage = `リポジトリまたはリソースが見つかりません (404)`; break;
            case 422: userMessage = `入力値が不正です (422): ${error.message}`; break;
            default:  userMessage = `GitHub APIエラー (${error.status}): ${error.message}`; break;
        }
    } else if (error instanceof TypeError) {
        // fetch 自体の失敗 = ネットワークエラー
        userMessage = getLabel('networkError');
    }

    console.error('[Deploy Error]', error);

    if (statusEl) {
        statusEl.innerHTML = `<span style="color:var(--danger)">${userMessage}</span>`;
    }
    showToast(userMessage, 'error', 6000);
}

/* ============================================
   § 4. トークン検証 (要件3)
   ============================================ */

/**
 * GitHubトークンの有効性を GET /user で検証する
 * @param {string} token
 * @returns {Promise<{valid: boolean, login: string|null}>}
 */
async function checkGitHubTokenValidity(token) {
    const url = 'https://api.github.com/user';
    console.log(`[Token Check] GET ${url}`);
    try {
        const res = await fetch(url, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        console.log(`[Token Check] HTTP ${res.status}`);
        if (!res.ok) return { valid: false, login: null };
        const data = await res.json();
        console.log(`[Token Check] ログイン確認: ${data.login}`);
        return { valid: true, login: data.login };
    } catch (e) {
        console.error('[Token Check] ネットワークエラー', e);
        return { valid: false, login: null };
    }
}

/* ============================================
   § 5. GitHub Import
   ============================================ */

async function openGitHubImport() {
    const token = await getFromDB('gh_token');
    if (!token) return alert(getLabel('tokenNotSetAlert'));
    document.getElementById('gh-import-modal').classList.add('show');
    document.getElementById('gh-step-repo').style.display = '';
    document.getElementById('gh-step-file').style.display = 'none';
    fetchImportRepos(token);
}

function closeGitHubImport() {
    document.getElementById('gh-import-modal').classList.remove('show');
}

async function fetchImportRepos(token) {
    const s = document.getElementById('gh-modal-status');
    s.textContent = getLabel('ghLoading');

    const url = 'https://api.github.com/user/repos?sort=updated&per_page=100';
    console.log(`[Import] GET ${url}`);
    try {
        const res = await fetch(url, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        console.log(`[Import] リポジトリ一覧 HTTP ${res.status}`);
        await assertGitHubResponse(res);
        ghImportRepos = await res.clone().json();   // assertGitHubResponse は ok 時は res をそのまま返す
        renderImportRepos(ghImportRepos);
        s.textContent = '';
    } catch (e) {
        console.error('[Import] fetchImportRepos エラー', e);
        s.textContent = getLabel('ghError');
        showToast(getLabel('ghError'), 'error');
    }
}

// ※ assertGitHubResponse が ok 時に res を返すため、json() は外で呼ぶ設計に統一
// 上記の fetchImportRepos は res.clone() を利用しているが、
// 実際には assertGitHubResponse 内で body を消費しないので res のまま使用可能。
// より安全に書き直す:
async function fetchImportRepos(token) {
    const s = document.getElementById('gh-modal-status');
    s.textContent = getLabel('ghLoading');
    const url = 'https://api.github.com/user/repos?sort=updated&per_page=100';
    console.log(`[Import] GET ${url}`);
    try {
        const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
        console.log(`[Import] リポジトリ一覧 HTTP ${res.status}`);
        if (!res.ok) {
            const body = await res.json().catch(() => null);
            console.error(`[Import] エラーレスポンス`, body);
            throw new GitHubAPIError(res.status, body?.message ?? res.statusText, body);
        }
        ghImportRepos = await res.json();
        renderImportRepos(ghImportRepos);
        s.textContent = '';
    } catch (e) {
        console.error('[Import] fetchImportRepos エラー', e);
        s.textContent = getLabel('ghError');
        showToast(getLabel('ghError'), 'error');
    }
}

function renderImportRepos(repos) {
    const l = document.getElementById('gh-repo-list'); l.innerHTML = '';
    repos.forEach(r => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${r.name}</span>`;
        li.onclick = () => selectImportRepo(r);
        l.appendChild(li);
    });
}

function filterImportRepos() {
    const q = document.getElementById('gh-repo-search').value.toLowerCase();
    renderImportRepos(ghImportRepos.filter(r => r.name.toLowerCase().includes(q)));
}

async function selectImportRepo(repo) {
    document.getElementById('gh-step-repo').style.display = 'none';
    document.getElementById('gh-step-file').style.display = '';
    const token = await getFromDB('gh_token');
    try {
        let url = `https://api.github.com/repos/${repo.full_name}/git/trees/main?recursive=1`;
        console.log(`[Import] GET ${url}`);
        let res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
        console.log(`[Import] ツリー(main) HTTP ${res.status}`);
        if (!res.ok) {
            url = `https://api.github.com/repos/${repo.full_name}/git/trees/master?recursive=1`;
            console.log(`[Import] GET ${url} (フォールバック)`);
            res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
            console.log(`[Import] ツリー(master) HTTP ${res.status}`);
        }
        if (!res.ok) throw new GitHubAPIError(res.status, 'ブランチが見つかりません');
        renderFileTree(await res.json(), repo.full_name);
    } catch (e) {
        console.error('[Import] selectImportRepo エラー', e);
        showToast('ファイルツリーの取得に失敗しました。', 'error');
    }
}

function renderFileTree(tree, fullName) {
    const l = document.getElementById('gh-file-list'); l.innerHTML = '';
    tree.tree.filter(f => f.type === 'blob').forEach(f => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${getLabel('ghFilePrefix')} ${f.path}</span>`;
        li.onclick = () => loadFileFromRepo(fullName, f.path);
        l.appendChild(li);
    });
}

async function loadFileFromRepo(fullName, path) {
    const token = await getFromDB('gh_token');
    const url = `https://api.github.com/repos/${fullName}/contents/${path}`;
    console.log(`[Import] GET ${url}`);
    try {
        const res = await fetch(url, {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Accept': 'application/vnd.github.v3.raw'
            }
        });
        console.log(`[Import] ファイル取得 HTTP ${res.status}`);
        if (!res.ok) throw new GitHubAPIError(res.status, 'ファイル取得失敗');
        window.setCode(await res.text());
        updatePreview();
        closeGitHubImport();
        showPage('editor', document.getElementById('tab-editor'));
        resetChatForNewCode(getLabel('ghImportModalTitle') + '「' + path + '」');
    } catch (e) {
        console.error('[Import] loadFileFromRepo エラー', e);
        showToast('ファイルの読み込みに失敗しました。', 'error');
    }
}

function backToRepoList() {
    document.getElementById('gh-step-repo').style.display = '';
    document.getElementById('gh-step-file').style.display = 'none';
}

/* ============================================
   § 6. GitHub Deploy
   ============================================ */

async function openDeployer() {
    const code = window.getCode();
    if (!code) return alert(getLabel('toastCodeMissing'));
    await saveToDB('pending_deploy', { code: code, readme: "" });
    openGitHubDeploy();
}

async function openGitHubDeploy() {
    document.getElementById('gh-deploy-modal').classList.add('show');
    const token = await getFromDB('gh_token');
    if (token) {
        showDeployStep('repo');
        fetchDeployRepos();
    } else {
        showDeployStep('token');
    }
}

function closeGitHubDeploy() {
    document.getElementById('gh-deploy-modal').classList.remove('show');
}

function showDeployStep(s) {
    ['token', 'repo', 'new-repo', 'details', 'success'].forEach(x => {
        const el = document.getElementById('deploy-step-' + x);
        if (el) el.style.display = (x === s ? (['repo', 'token', 'success'].includes(x) ? 'block' : 'flex') : 'none');
    });
}

async function saveDeployToken() {
    const input = document.getElementById('deploy-token-input').value.trim();
    if (!input) return;
    const statusEl = document.getElementById('deploy-token-status');
    statusEl.textContent = getLabel('deployingTokenCheck');

    const url = 'https://api.github.com/user';
    console.log(`[Token Save] GET ${url}`);
    try {
        const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + input } });
        const data = await res.json();
        console.log(`[Token Save] HTTP ${res.status}`, { login: data.login });
        if (!res.ok) throw new GitHubAPIError(res.status, data.message ?? 'Unauthorized', data);

        await saveToDB('gh_token', input);
        document.getElementById('setting-gh-token').value = input;
        statusEl.textContent = '';
        showDeployStep('repo');
        fetchDeployRepos();
    } catch (e) {
        console.error('[Token Save] エラー', e);
        const msg = e instanceof GitHubAPIError && e.status === 401
            ? getLabel('tokenInvalidAlert')
            : (e instanceof TypeError ? getLabel('networkError') : getLabel('deployStatusError'));
        statusEl.innerHTML = `<span style="color:var(--danger)">${msg}</span>`;
        showToast(msg, 'error');
    }
}

async function fetchDeployRepos() {
    const token = await getFromDB('gh_token');
    const url = 'https://api.github.com/user/repos?sort=updated&per_page=100';
    console.log(`[Deploy] GET ${url}`);
    try {
        const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
        console.log(`[Deploy] リポジトリ一覧 HTTP ${res.status}`);
        if (!res.ok) {
            const body = await res.json().catch(() => null);
            throw new GitHubAPIError(res.status, body?.message ?? res.statusText, body);
        }
        deployRepos = await res.json();
        renderDeployRepos(deployRepos);
    } catch (e) {
        console.error('[Deploy] fetchDeployRepos エラー', e);
        showToast('リポジトリ一覧の取得に失敗しました。', 'error');
    }
}

function renderDeployRepos(repos) {
    const l = document.getElementById('deploy-repo-list'); l.innerHTML = '';
    repos.forEach(r => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${r.name}</span>`;
        li.onclick = () => {
            selectedDeployRepo = r;
            document.getElementById('deploy-target-repo-name').textContent = r.full_name;
            showDeployStep('details');
        };
        l.appendChild(li);
    });
}

function filterDeployRepos() {
    const q = document.getElementById('deploy-repo-search').value.toLowerCase();
    renderDeployRepos(deployRepos.filter(r => r.name.toLowerCase().includes(q)));
}

async function createNewRepo() {
    const name = document.getElementById('new-repo-name').value.trim();
    const token = await getFromDB('gh_token');
    if (!name) return;
    const statusEl = document.getElementById('new-repo-status');
    statusEl.textContent = getLabel('newRepoCreating');

    const url = 'https://api.github.com/user/repos';
    const body = {
        name,
        private: document.getElementById('new-repo-private').value === 'true',
        auto_init: true
    };
    console.log(`[Deploy] POST ${url}`, { name: body.name, private: body.private });
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        console.log(`[Deploy] リポジトリ作成 HTTP ${res.status}`, { full_name: data.full_name });
        if (!res.ok) throw new GitHubAPIError(res.status, data.message ?? 'Create failed', data);

        selectedDeployRepo = data;
        document.getElementById('deploy-target-repo-name').textContent = data.full_name;
        statusEl.textContent = '';
        showDeployStep('details');
    } catch (e) {
        console.error('[Deploy] createNewRepo エラー', e);
        const msg = e instanceof GitHubAPIError
            ? `リポジトリ作成に失敗しました (${e.status}): ${e.message}`
            : getLabel('newRepoError');
        statusEl.innerHTML = `<span style="color:var(--danger)">${msg}</span>`;
        showToast(msg, 'error');
    }
}

/* ============================================
   § 7. ファイルエンコード
   ============================================ */

function encodeBase64Unicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (m, p1) => String.fromCharCode('0x' + p1)));
}

/* ============================================
   § 8. デプロイ実行 (要件1〜4を集約)
   ============================================ */

async function executeDeploy() {
    const btn      = document.getElementById('deploy-exec-btn');
    const statusEl = document.getElementById('deploy-execute-status');

    btn.disabled = true;

    // ── ヘルパー: ステータス表示 ──────────────────────────────
    const setStatus = (msg, color = '') => {
        statusEl.innerHTML = color
            ? `<span style="color:${color}">${msg}</span>`
            : msg;
    };

    // ── ヘルパー: ファイルをプッシュ ─────────────────────────
    const pushFile = async (path, content, commitMsg) => {
        const url = `https://api.github.com/repos/${repoFullName}/contents/${path}`;

        // 既存ファイルの SHA を取得
        let sha = null;
        const getUrl = `${url}?ref=${branch}`;
        console.log(`[pushFile] GET ${getUrl}`);
        try {
            const getRes = await fetch(getUrl, { headers: { 'Authorization': 'Bearer ' + token } });
            console.log(`[pushFile] SHA取得 HTTP ${getRes.status} — ${path}`);
            if (getRes.ok) sha = (await getRes.json()).sha;
        } catch (_) {}

        const body = { message: commitMsg, content: encodeBase64Unicode(content), branch };
        if (sha) body.sha = sha;

        console.log(`[pushFile] PUT ${url}`, { path, branch, hasSha: !!sha });
        const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        console.log(`[pushFile] PUT結果 HTTP ${res.status} — ${path}`);

        if (!res.ok) {
            const errBody = await res.json().catch(() => null);
            console.error(`[pushFile] エラー`, errBody);
            throw new GitHubAPIError(res.status, errBody?.message ?? 'Push failed', errBody);
        }
    };

    // ── デプロイ設定を読み込み ────────────────────────────────
    const branch        = document.getElementById('deploy-branch').value    || 'main';
    const filepath      = document.getElementById('deploy-filepath').value  || 'index.html';
    const token         = await getFromDB('gh_token');
    const repoFullName  = selectedDeployRepo.full_name;
    const pendingDeploy = await getFromDB('pending_deploy');
    const codeContent   = pendingDeploy ? pendingDeploy.code : window.getCode();

    // ── フェーズ1: トークン検証 (要件3) ──────────────────────
    setStatus(getLabel('deployingTokenCheck'));
    const tokenCheck = await checkGitHubTokenValidity(token);
    if (!tokenCheck.valid) {
        const msg = getLabel('tokenInvalidAlert');
        setStatus(msg, 'var(--danger)');
        showToast(msg, 'error', 6000);
        btn.disabled = false;
        return;
    }
    console.log(`[Deploy] トークン検証OK: ${tokenCheck.login}`);

    try {
        // ── フェーズ2: メインファイルのアップロード ───────────
        setStatus(getLabel('deployingMainFile'));
        await pushFile(filepath, codeContent, 'Deploy via AI Web Studio');

        // ── フェーズ3: README更新 (任意) ─────────────────────
        const readmeContent = document.getElementById('deploy-readme-content').value;
        if (readmeContent) {
            setStatus(getLabel('deployingReadmeFile'));
            try {
                await pushFile('README.md', readmeContent, 'Update README');
            } catch (e) {
                // README 失敗はデプロイ全体を止めない (警告のみ)
                console.warn('[Deploy] README更新失敗 (続行)', e);
                showToast(getLabel('deployReadmeFileError'), 'warning', 5000);
            }
        }

        // ── フェーズ4: GitHub Pages 有効化 (任意) ────────────
        ghPagesUrl = `https://${selectedDeployRepo.owner.login}.github.io/${selectedDeployRepo.name}/${filepath}`;
        if (document.getElementById('deploy-gh-pages').checked) {
            setStatus(getLabel('deployingGhPages'));
            const pagesUrl = `https://api.github.com/repos/${repoFullName}/pages`;
            console.log(`[Deploy] POST ${pagesUrl}`);
            try {
                const pagesRes = await fetch(pagesUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ source: { branch, path: '/' } })
                });
                console.log(`[Deploy] GitHub Pages有効化 HTTP ${pagesRes.status}`);
                // 409 = すでに有効済み → 正常扱い
                if (!pagesRes.ok && pagesRes.status !== 409) {
                    const b = await pagesRes.json().catch(() => null);
                    console.warn('[Deploy] GitHub Pages有効化 警告', b);
                    showToast(`GitHub Pages の有効化に問題がありました (${pagesRes.status})`, 'warning');
                }
            } catch (e) {
                console.warn('[Deploy] GitHub Pages有効化 ネットワークエラー (続行)', e);
            }
        }

        // ── 成功 ──────────────────────────────────────────────
        setStatus(getLabel('deployStatusSuccess'), 'var(--success)');
        showToast(getLabel('deployStatusSuccess'), 'success');
        await deleteFromDB('pending_deploy');
        showDeployStep('success');

        document.getElementById('deploy-success-url').href        = ghPagesUrl;
        document.getElementById('deploy-success-url').textContent = ghPagesUrl;

        let count = 10;
        const interval = setInterval(() => {
            count--;
            document.getElementById('gh-pages-countdown-display').innerHTML =
                `${getLabel('ghPagesCountdownPreparing')}...残り ${count}秒`;
            if (count <= 0) {
                clearInterval(interval);
                document.getElementById('gh-pages-countdown-display').innerHTML = getLabel('ghPagesReady');
                document.getElementById('view-site-btn').disabled = false;
            }
        }, 1000);

    } catch (e) {
        // ── 失敗 ──────────────────────────────────────────────
        const defaultMsg = getLabel('deployMainFileError');
        handleDeployError(e, defaultMsg, statusEl);
        btn.disabled = false;
    }
}

function openDeployedSite() {
    window.open(ghPagesUrl, '_blank');
    closeGitHubDeploy();
}
