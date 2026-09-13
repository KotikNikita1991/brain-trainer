// Данные: профили, результаты, рейтинги, серии. Всё хранится на телефоне (localStorage)
// и синхронизируется с Google Таблицей через sync.js.
(function () {
  'use strict';
  const BT = window.BT;
  const CFG = window.BT_CONFIG;
  const K = { profiles: 'bt_profiles', results: 'bt_results', pending: 'bt_pending', cursor: 'bt_cursor' };

  // ---------- Ранги (шкала 0–100) ----------
  BT.RANKS = [
    { min: 0, name: 'Новичок' },
    { min: 20, name: 'Любитель' },
    { min: 40, name: 'Опытный' },
    { min: 60, name: 'Эксперт' },
    { min: 80, name: 'Мастер' },
    { min: 95, name: 'Гений' },
  ];
  BT.rank = function (v) {
    if (v == null) return null;
    let i = 0;
    while (i + 1 < BT.RANKS.length && v >= BT.RANKS[i + 1].min) i++;
    return { name: BT.RANKS[i].name, min: BT.RANKS[i].min, next: BT.RANKS[i + 1] || null };
  };

  // ---------- Профили: из config.js + добавленные в приложении (синхронизируются) ----------
  let profiles = BT.ls.get(K.profiles, []);
  if (!Array.isArray(profiles)) profiles = [];
  CFG.PROFILES.forEach((def) => {
    const p = profiles.find((x) => x.id === def.id);
    if (!p) profiles.push(Object.assign({ updated: 0 }, def));
    else if (!p.updated) Object.assign(p, def, { updated: 0 });
  });
  const saveProfiles = () => BT.ls.set(K.profiles, profiles);
  saveProfiles();

  // ---------- Результаты ----------
  // { id, p: профиль, g: игра, s: очки, l: уровень, nl: след. уровень, a: точность 0..1, t: мс, ts: время, d: детали }
  let results = BT.ls.get(K.results, []);
  if (!Array.isArray(results)) results = [];
  let pending = new Set(BT.ls.get(K.pending, []));
  let cursor = BT.ls.get(K.cursor, 0);
  const saveResults = () => {
    BT.ls.set(K.results, results);
    BT.ls.set(K.pending, Array.from(pending));
  };

  // Среднее трёх лучших из последних 10 результатов — устойчиво к случайным неудачам.
  const top3 = (list) => BT.avg(list.slice(-10).map((r) => r.s).sort((a, b) => b - a).slice(0, 3));
  function gameRating(list, game) {
    if (!list || !list.length) return null;
    return Math.round(BT.clamp(top3(list) / game.ref, 0, 1) * 100);
  }

  function ratings(pid, upTo) {
    const byGame = {};
    for (const r of results) {
      if (r.p !== pid || (upTo && r.ts > upTo)) continue;
      (byGame[r.g] = byGame[r.g] || []).push(r);
    }
    const games = {};
    BT.games.forEach((g) => { if (byGame[g.id]) games[g.id] = gameRating(byGame[g.id], g); });
    const cats = {};
    BT.CATS.forEach((c) => {
      const v = BT.games.filter((g) => g.cat === c.id && games[g.id] != null).map((g) => games[g.id]);
      cats[c.id] = v.length ? Math.round(BT.avg(v)) : null;
    });
    const cv = Object.values(cats).filter((v) => v != null);
    return { games, cats, overall: cv.length ? Math.round(BT.avg(cv)) : null };
  }

  BT.store = {
    // --- профили ---
    profiles: () => profiles,
    profile: (id) => profiles.find((p) => p.id === id),
    me: () => profiles.find((p) => p.id === BT.settings.profile) || null,
    others: () => profiles.filter((p) => p.id !== BT.settings.profile),
    addProfile(data) {
      const p = { id: 'u' + BT.uid(), name: data.name, emoji: data.emoji, color: data.color, updated: Date.now(), dirty: true };
      profiles.push(p);
      saveProfiles();
      BT.emit('profiles');
      return p;
    },
    updateProfile(id, patch) {
      const p = this.profile(id);
      if (!p) return;
      Object.assign(p, patch, { updated: Date.now(), dirty: true });
      saveProfiles();
      BT.emit('profiles');
    },
    dirtyProfiles: () => profiles.filter((p) => p.dirty).map((p) => ({ id: p.id, name: p.name, emoji: p.emoji, color: p.color, updated: p.updated })),
    markProfilesClean(list) {
      list.forEach((s) => {
        const p = this.profile(s.id);
        if (p && p.updated === s.updated) delete p.dirty;
      });
      saveProfiles();
    },
    mergeProfiles(remote) {
      let changed = false;
      (remote || []).forEach((r) => {
        if (!r || !r.id) return;
        const p = this.profile(r.id);
        const upd = Number(r.updated) || 0;
        if (!p) {
          profiles.push({ id: r.id, name: r.name, emoji: r.emoji, color: r.color, updated: upd });
          changed = true;
        } else if (upd > (p.updated || 0) && !p.dirty) {
          Object.assign(p, { name: r.name, emoji: r.emoji, color: r.color, updated: upd });
          changed = true;
        }
      });
      if (changed) {
        saveProfiles();
        BT.emit('profiles');
      }
    },

    // --- результаты ---
    all: () => results,
    addResult(r) {
      results.push(r);
      pending.add(r.id);
      saveResults();
      BT.emit('results');
    },
    mergeResults(list) {
      const ids = new Set(results.map((r) => r.id));
      let added = 0;
      (list || []).forEach((r) => {
        if (r && r.id && !ids.has(r.id)) {
          results.push(r);
          ids.add(r.id);
          added++;
        }
      });
      if (added) {
        results.sort((a, b) => a.ts - b.ts);
        saveResults();
        BT.emit('results');
      }
      return added;
    },
    pendingResults: () => results.filter((r) => pending.has(r.id)),
    pendingCount: () => pending.size,
    markSynced(ids) {
      ids.forEach((id) => pending.delete(id));
      saveResults();
    },
    cursor: () => cursor,
    setCursor(c) {
      cursor = Number(c) || 0;
      BT.ls.set(K.cursor, cursor);
    },

    // --- выборки ---
    list: (pid, gid) => results.filter((r) => r.p === pid && (!gid || r.g === gid)),
    best(pid, gid) {
      let b = null;
      for (const r of results) if (r.p === pid && r.g === gid && (b == null || r.s > b)) b = r.s;
      return b;
    },
    count(pid, gid) {
      let n = 0;
      for (const r of results) if (r.p === pid && (!gid || r.g === gid)) n++;
      return n;
    },
    level(pid, gid) {
      for (let i = results.length - 1; i >= 0; i--) {
        const r = results[i];
        if (r.p === pid && r.g === gid) return r.nl || r.l || 1;
      }
      return null;
    },
    today(pid) {
      const key = BT.fmt.dayKey(Date.now());
      const list = results.filter((r) => r.p === pid && BT.fmt.dayKey(r.ts) === key);
      return { games: list.length, time: BT.sum(list.map((r) => r.t || 0)) };
    },
    streak(pid) {
      const days = new Set(results.filter((r) => r.p === pid).map((r) => BT.fmt.dayKey(r.ts)));
      const d = new Date();
      if (!days.has(BT.fmt.dayKey(d))) d.setDate(d.getDate() - 1);
      let n = 0;
      while (days.has(BT.fmt.dayKey(d))) {
        n++;
        d.setDate(d.getDate() - 1);
      }
      return n;
    },
    totals(pid) {
      const list = results.filter((r) => r.p === pid);
      return { games: list.length, time: BT.sum(list.map((r) => r.t || 0)), days: new Set(list.map((r) => BT.fmt.dayKey(r.ts))).size };
    },
    ratings,
    gameRatingFor(pid, gid) {
      const g = BT.game(gid);
      return g ? gameRating(results.filter((r) => r.p === pid && r.g === gid), g) : null;
    },
    // Всё для объяснения рейтинга игры: среднее, эталон, ранг и сколько очков до следующего.
    gameInfo(pid, gid) {
      const g = BT.game(gid);
      const list = results.filter((r) => r.p === pid && r.g === gid);
      if (!g || !list.length) return null;
      const avg = Math.round(top3(list));
      const rating = gameRating(list, g);
      const rank = BT.rank(rating);
      const need = rank.next ? Math.max(1, Math.ceil((rank.next.min / 100) * g.ref - avg)) : 0;
      return { avg, rating, rank, need, ref: g.ref, games: list.length };
    },
    // Общий индекс на конец каждого дня за последние N дней (для графика).
    history(pid, days) {
      const mine = results.filter((r) => r.p === pid);
      if (!mine.length) return [];
      const first = new Date(mine[0].ts);
      first.setHours(0, 0, 0, 0);
      const out = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setHours(23, 59, 59, 999);
        d.setDate(d.getDate() - i);
        if (d < first) continue;
        out.push({ ts: d.getTime(), v: ratings(pid, d.getTime()).overall });
      }
      return out;
    },

    // --- какие задания уже показывались (чтобы не повторяться) ---
    seen(pid, key) {
      return new Set(BT.ls.get('bt_seen_' + pid + '_' + key, []));
    },
    markSeen(pid, key, ids) {
      const arr = BT.ls.get('bt_seen_' + pid + '_' + key, []);
      ids.forEach((id) => arr.push(id));
      BT.ls.set('bt_seen_' + pid + '_' + key, arr.slice(-6000));
    },
    resetSeen(pid, key) {
      BT.ls.del('bt_seen_' + pid + '_' + key);
    },
  };
})();
