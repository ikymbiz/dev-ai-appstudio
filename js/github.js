/* ============================================
   github.js — GitHub Import / Deploy
   依存: db.js, config.js, editor.js, chat.js
   ============================================ */

let ghImportRepos = [];
let ghPagesUrl = '';
let selectedDeployRepo = null;
let deployRepos = [];

/* === GitHub Import === */
async function openGitHubImport() {
    const token = await getFromDB('gh_token');
    if (!token) return alert(getLabel('tokenNotSetAlert'));
    document.getElementById('gh-import-modal').classList.add('show');
    document.getElementById('gh-step-repo').style.display = '';
    document.getElementById('gh-step-file').style.display = 'none';
    fetchImportRepos(token);
}
function closeGitHubImport() { document.getElementById('gh-import-modal').classList.remove('show'); }

async function fetchImportRepos(token) {
    const s = document.getElementById('gh-modal-status');
    s.textContent = getLabel('ghLoading');
    try {
        const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', { headers: { 'Authorization': 'Bearer ' + token } });
        ghImportRepos = await res.json();
        renderImportRepos(ghImportRepos);
        s.textContent = '';
    } catch (e) { s.textContent = getLabel('ghError'); }
}

function renderImportRepos(repos) {
    const l = document.getElementById('gh-repo-list'); l.innerHTML = '';
    repos.forEach(r => { const li = document.createElement('li'); li.innerHTML = `<span>${r.name}</span>`; li.onclick = () => selectImportRepo(r); l.appendChild(li); });
}
function filterImportRepos() { const q = document.getElementById('gh-repo-search').value.toLowerCase(); renderImportRepos(ghImportRepos.filter(r => r.name.toLowerCase().includes(q))); }

async function selectImportRepo(repo) {
    document.getElementById('gh-step-repo').style.display = 'none';
    document.getElementById('gh-step-file').style.display = '';
    const token = await getFromDB('gh_token');
    try {
        let res = await fetch(`https://api.github.com/repos/${repo.full_name}/git/trees/main?recursive=1`, { headers: { 'Authorization': 'Bearer ' + token } });
        if (!res.ok) res = await fetch(`https://api.github.com/repos/${repo.full_name}/git/trees/master?recursive=1`, { headers: { 'Authorization': 'Bearer ' + token } });
        renderFileTree(await res.json(), repo.full_name);
    } catch(e){}
}

function renderFileTree(tree, fullName) {
    const l = document.getElementById('gh-file-list'); l.innerHTML = '';
    tree.tree.filter(f => f.type === 'blob').forEach(f => {
        const li = document.createElement('li'); li.innerHTML = `<span>${getLabel('ghFilePrefix')} ${f.path}</span>`;
        li.onclick = () => loadFileFromRepo(fullName, f.path); l.appendChild(li);
    });
}

async function loadFileFromRepo(fullName, path) {
    const token = await getFromDB('gh_token');
    try {
        const res = await fetch(`https://api.github.com/repos/${fullName}/contents/${path}`, { headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github.v3.raw' } });
        window.setCode(await res.text()); updatePreview();
        closeGitHubImport(); showPage('editor', document.getElementById('tab-editor'));
        resetChatForNewCode(getLabel('ghImportModalTitle') + '「' + path + '」');
    } catch(e){}
}
function backToRepoList() { document.getElementById('gh-step-repo').style.display = ''; document.getElementById('gh-step-file').style.display = 'none'; }

/* === GitHub Deploy === */
async function openDeployer() {
    const code = window.getCode();
    if (!code) return alert(getLabel('toastCodeMissing'));
    await saveToDB('pending_deploy', { code: code, readme: "" });
    openGitHubDeploy();
}

async function openGitHubDeploy() {
    document.getElementById('gh-deploy-modal').classList.add('show');
    const token = await getFromDB('gh_token');
    if (token) { showDeployStep('repo'); fetchDeployRepos(); } else showDeployStep('token');
}
function closeGitHubDeploy() { document.getElementById('gh-deploy-modal').classList.remove('show'); }
function showDeployStep(s) { ['token','repo','new-repo','details','success'].forEach(x => { const el = document.getElementById('deploy-step-'+x); if(el) el.style.display = (x===s ? (['repo','token','success'].includes(x)?'block':'flex') : 'none'); }); }

async function saveDeployToken() {
    const input = document.getElementById('deploy-token-input').value.trim();
    if (!input) return;
    try {
        await fetch('https://api.github.com/user', { headers: { 'Authorization': 'Bearer ' + input } }).then(r=>r.json());
        await saveToDB('gh_token', input);
        document.getElementById('setting-gh-token').value = input;
        showDeployStep('repo'); fetchDeployRepos();
    } catch(e){ document.getElementById('deploy-token-status').innerHTML = getLabel('deployStatusError'); }
}

async function fetchDeployRepos() {
    const token = await getFromDB('gh_token');
    const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', { headers: { 'Authorization': 'Bearer ' + token } });
    deployRepos = await res.json();
    renderDeployRepos(deployRepos);
}
function renderDeployRepos(repos) {
    const l = document.getElementById('deploy-repo-list'); l.innerHTML = '';
    repos.forEach(r => { const li = document.createElement('li'); li.innerHTML = `<span>${r.name}</span>`; li.onclick = () => { selectedDeployRepo = r; document.getElementById('deploy-target-repo-name').textContent = r.full_name; showDeployStep('details'); }; l.appendChild(li); });
}
function filterDeployRepos() { const q = document.getElementById('deploy-repo-search').value.toLowerCase(); renderDeployRepos(deployRepos.filter(r => r.name.toLowerCase().includes(q))); }

async function createNewRepo() {
    const name = document.getElementById('new-repo-name').value.trim();
    const token = await getFromDB('gh_token');
    if (!name) return;
    document.getElementById('new-repo-status').textContent = getLabel('newRepoCreating');
    try {
        const res = await fetch('https://api.github.com/user/repos', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ name, private: document.getElementById('new-repo-private').value === 'true', auto_init: true }) });
        if (!res.ok) throw new Error();
        const r = await res.json();
        selectedDeployRepo = r; document.getElementById('deploy-target-repo-name').textContent = r.full_name; showDeployStep('details');
    } catch(e) { document.getElementById('new-repo-status').innerHTML = getLabel('newRepoError'); }
}

function encodeBase64Unicode(str) { return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (m, p1) => String.fromCharCode('0x' + p1))); }

async function executeDeploy() {
    const btn = document.getElementById('deploy-exec-btn'); const status = document.getElementById('deploy-execute-status');
    btn.disabled = true; status.innerHTML = getLabel('deploying');
    const branch = document.getElementById('deploy-branch').value || 'main';
    const filepath = document.getElementById('deploy-filepath').value || 'index.html';
    const token = await getFromDB('gh_token');
    const repoFullName = selectedDeployRepo.full_name;
    const pendingDeploy = await getFromDB('pending_deploy');
    const codeContent = pendingDeploy ? pendingDeploy.code : window.getCode();

    const pushFile = async (path, content, msg) => {
        let sha = null;
        const url = `https://api.github.com/repos/${repoFullName}/contents/${path}`;
        try { const getRes = await fetch(url + '?ref=' + branch, { headers: { 'Authorization': 'Bearer ' + token } }); if(getRes.ok) sha = (await getRes.json()).sha; } catch(e){}
        const body = { message: msg, content: encodeBase64Unicode(content), branch };
        if (sha) body.sha = sha;
        const res = await fetch(url, { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error();
    };

    try {
        await pushFile(filepath, codeContent, 'Deploy via AI Web Studio');
        if (document.getElementById('deploy-readme-content').value) await pushFile('README.md', document.getElementById('deploy-readme-content').value, 'Update README');
        ghPagesUrl = `https://${selectedDeployRepo.owner.login}.github.io/${selectedDeployRepo.name}/${filepath}`;
        if (document.getElementById('deploy-gh-pages').checked) {
            try { await fetch(`https://api.github.com/repos/${repoFullName}/pages`, { method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' }, body: JSON.stringify({ source: { branch, path: '/' } }) }); } catch(e){}
        }
        status.innerHTML = `<span style="color:var(--success)">${getLabel('deployStatusSuccess')}</span>`;
        await deleteFromDB('pending_deploy');
        showDeployStep('success');
        document.getElementById('deploy-success-url').href = ghPagesUrl;
        document.getElementById('deploy-success-url').textContent = ghPagesUrl;
        let count = 10;
        const interval = setInterval(() => {
            count--;
            document.getElementById('gh-pages-countdown-display').innerHTML = `${getLabel('ghPagesCountdownPreparing')}...残り ${count}秒`;
            if(count <= 0){ clearInterval(interval); document.getElementById('gh-pages-countdown-display').innerHTML = getLabel('ghPagesReady'); document.getElementById('view-site-btn').disabled = false; }
        }, 1000);
    } catch(e) {
        status.innerHTML = `<span style="color:var(--danger)">${getLabel('deployStatusError')}</span>`;
        btn.disabled = false;
    }
}

function openDeployedSite() { window.open(ghPagesUrl, '_blank'); closeGitHubDeploy(); }
