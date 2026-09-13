// Проверка слов: встроенные списки + большой открытый словарь существительных
// (грузится по требованию и кэшируется для офлайна) + личный словарь игрока.
(function () {
  'use strict';
  const BT = window.BT;
  const norm = (w) => String(w).toLowerCase().replace(/ё/g, 'е').trim();
  const key = (pid) => 'bt_mywords_' + pid;
  let base = null, full = null, loading = null;

  function baseSet() {
    if (!base) {
      const W = (BT.DATA && BT.DATA.words) || {};
      base = new Set([].concat(W.dict || [], W.nouns || []).map(norm));
    }
    return base;
  }

  BT.lex = {
    FULL_URL: 'js/data/nouns-full.txt',
    // Загрузить большой словарь (если файла нет — работаем со встроенным).
    load() {
      if (full) return Promise.resolve(full);
      if (!loading) {
        loading = fetch(this.FULL_URL)
          .then((r) => (r.ok ? r.text() : ''))
          .catch(() => '')
          .then((t) => {
            full = new Set(t.split(/\r?\n/).map(norm).filter(Boolean));
            loading = null;
            return full;
          });
      }
      return loading;
    },
    fullSize: () => (full ? full.size : 0),
    has(w, pid) {
      const n = norm(w);
      return baseSet().has(n) || (!!full && full.has(n)) || (!!pid && this.personal(pid).includes(n));
    },
    personal: (pid) => BT.ls.get(key(pid), []),
    addPersonal(pid, w) {
      const list = this.personal(pid), n = norm(w);
      if (!list.includes(n)) {
        list.push(n);
        BT.ls.set(key(pid), list);
      }
    },
    removePersonal(pid, w) {
      BT.ls.set(key(pid), this.personal(pid).filter((x) => x !== norm(w)));
    },
  };
})();
