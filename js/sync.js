// Синхронизация с Google Таблицей (Apps Script). Работает «офлайн-первым»:
// результаты всегда сначала сохраняются на телефоне, а отправляются, когда есть сеть.
(function () {
  'use strict';
  const BT = window.BT;
  const CFG = window.BT_CONFIG;

  let syncing = false;
  let lastError = null;
  let lastSync = BT.ls.get('bt_lastSync', 0);
  let queued = false;

  const apiUrl = () => String(BT.settings.apiUrl || CFG.API_URL || '').trim();

  async function request(url, options, timeout) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout || 20000);
    try {
      const resp = await fetch(url, Object.assign({ signal: ctrl.signal, redirect: 'follow' }, options));
      const text = await resp.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Сервер ответил не JSON — проверьте URL и доступ «Все»');
      }
      if (!data.ok) throw new Error(data.error || 'Ошибка сервера');
      return data;
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('Сервер не отвечает');
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  BT.sync = {
    enabled: () => !!apiUrl(),
    status: () => ({ syncing, lastError, lastSync, pending: BT.store.pendingCount(), enabled: !!apiUrl() }),

    async run() {
      if (!apiUrl()) return;
      if (syncing) {
        queued = true;
        return;
      }
      if (navigator.onLine === false) {
        lastError = 'Нет сети — отправим позже';
        BT.emit('sync');
        return;
      }
      syncing = true;
      BT.emit('sync');
      try {
        const results = BT.store.pendingResults();
        const profiles = BT.store.dirtyProfiles();
        const data = await request(apiUrl(), {
          method: 'POST',
          // text/plain — чтобы браузер не делал preflight-запрос (Apps Script его не поддерживает)
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'sync', cursor: BT.store.cursor(), results, profiles }),
        });
        BT.store.markSynced(results.map((r) => r.id));
        BT.store.markProfilesClean(profiles);
        BT.store.mergeResults(data.results);
        BT.store.mergeProfiles(data.profiles);
        BT.store.setCursor(data.cursor);
        lastSync = Date.now();
        BT.ls.set('bt_lastSync', lastSync);
        lastError = null;
      } catch (e) {
        lastError = e.message || 'Ошибка синхронизации';
      } finally {
        syncing = false;
        BT.emit('sync');
        if (queued) {
          queued = false;
          setTimeout(() => BT.sync.run(), 300);
        }
      }
    },

    // Проверка адреса сервера из настроек.
    async test(url) {
      const data = await request(url + (url.includes('?') ? '&' : '?') + 'action=ping', { method: 'GET' }, 15000);
      return data;
    },
  };

  window.addEventListener('online', () => BT.sync.run());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') BT.sync.run();
  });
})();
