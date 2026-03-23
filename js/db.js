/* ============================================
   db.js — IndexedDB CRUD + トースト通知
   依存: なし
   ※ インターフェース変更禁止（全モジュールが依存）
   ============================================ */

function openDB() {
    return new Promise((res, rej) => {
        const req = indexedDB.open('AIWebStudioBG', 2);
        req.onupgradeneeded = () => {
            if (!req.result.objectStoreNames.contains('tasks')) req.result.createObjectStore('tasks');
        };
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
    });
}

async function saveToDB(k, v) {
    const db = await openDB();
    return new Promise((res, rej) => {
        const tx = db.transaction('tasks', 'readwrite');
        tx.objectStore('tasks').put(v, k);
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
    });
}

async function getFromDB(k) {
    const db = await openDB();
    return new Promise((res, rej) => {
        const tx = db.transaction('tasks', 'readonly');
        const req = tx.objectStore('tasks').get(k);
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
    });
}

async function deleteFromDB(k) {
    const db = await openDB();
    return new Promise((res) => {
        const tx = db.transaction('tasks', 'readwrite');
        tx.objectStore('tasks').delete(k);
        tx.oncomplete = () => res();
    });
}

function showToast(msg) {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}
