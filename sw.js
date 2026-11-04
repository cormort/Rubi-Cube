// 更新版本號即可讓所有使用者取得新版快取
const VERSION = 'v9';
const CACHE = 'rubi-cube-' + VERSION;
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest',
  'icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png', 'apple-touch-icon.png',
  'lib/cube.js', 'lib/solve.js', 'lib/solver-worker.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c =>
    // 逐檔預快取：單一檔案失敗不要讓整個安裝流程失敗
    Promise.all(ASSETS.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))
  ));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

// 這些是「會隨版本更新」的靜態資源，用 stale-while-revalidate：先回快取、背景更新
const STATIC_RE = /\/(lib\/|icon-|apple-touch-icon|manifest\.webmanifest)/;

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // 頁面導覽：網路優先，離線時退回快取的 index（含 ?do= 捷徑）
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); }
          return res;
        })
        .catch(() => caches.match('index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  if (STATIC_RE.test(url.pathname)) {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then(hit => {
        const network = fetch(req).then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
          return res;
        }).catch(() => hit);
        return hit || network;
      })
    );
    return;
  }

  // 其他同源資源（截圖等）：網路優先，失敗才用快取
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }))
  );
});
