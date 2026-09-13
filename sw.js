// Service Worker: сначала сеть (свежая версия после каждого пуша), без сети — кэш.
const CACHE = 'neuron-v4';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/app.css',
  './css/ui2.css',
  './css/games2.css',
  './css/puzzles.css',
  './js/config.js',
  './js/core.js',
  './js/store.js',
  './js/sync.js',
  './js/lexicon.js',
  './js/data/sets.js',
  './js/data/sets2.js',
  './js/data/quiz.js',
  './js/data/quiz2.js',
  './js/data/quiz3.js',
  './js/data/words.js',
  './js/data/dict.js',
  './js/data/nouns-full.txt',
  './js/data/clues.js',
  './js/games/memory.js',
  './js/games/memory2.js',
  './js/games/attention.js',
  './js/games/logic.js',
  './js/games/words.js',
  './js/games/erudition.js',
  './js/games/sudoku.js',
  './js/games/cross.js',
  './js/ui.js',
  './js/app.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];
const NETWORK_TIMEOUT = 3500;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(networkFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  const network = fetch(req).then((resp) => {
    if (resp && resp.ok) cache.put(req, resp.clone());
    return resp;
  });
  try {
    return await Promise.race([
      network,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT)),
    ]);
  } catch (err) {
    const cached = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (cached) return cached;
    if (req.mode === 'navigate') {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    return network;
  }
}
