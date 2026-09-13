// Ядро: DOM-хелперы, случайность, форматирование, хранилище, звук, вибрация, игровые часы, реестр игр.
(function () {
  'use strict';
  const BT = (window.BT = window.BT || {});

  // ---------- DOM ----------
  BT.$ = (sel, root) => (root || document).querySelector(sel);
  BT.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  BT.h = function h(tag, props) {
    const el = document.createElement(tag);
    if (props) {
      for (const k in props) {
        const v = props[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'style' && typeof v === 'object') {
          for (const s in v) s.startsWith('--') ? el.style.setProperty(s, v[s]) : (el.style[s] = v[s]);
        } else if (k === 'dataset') Object.assign(el.dataset, v);
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (let i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  };
  function append(el, kid) {
    if (kid == null || kid === false) return;
    if (Array.isArray(kid)) return kid.forEach((k) => append(el, k));
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }

  BT.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Мгновенный отклик на касание (без задержки click) — для игровых элементов.
  BT.onTap = function (el, fn) {
    el.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      e.preventDefault();
      fn(e);
    });
  };

  // ---------- Случайность и числа ----------
  BT.rand = {
    int: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    sample: (arr, n) => BT.rand.shuffle(arr).slice(0, n),
    chance: (p) => Math.random() < p,
  };
  BT.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  BT.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  BT.sum = (arr) => arr.reduce((s, x) => s + x, 0);
  BT.avg = (arr) => (arr.length ? BT.sum(arr) / arr.length : 0);

  // ---------- Форматирование ----------
  const pad = (n) => String(n).padStart(2, '0');
  BT.fmt = {
    int: (n) => Math.round(n || 0).toLocaleString('ru-RU'),
    pct: (x) => Math.round((x || 0) * 100) + '%',
    plural(n, one, few, many) {
      const a = Math.abs(n) % 100, b = a % 10;
      if (a > 10 && a < 20) return many;
      if (b > 1 && b < 5) return few;
      if (b === 1) return one;
      return many;
    },
    sec: (ms) => (ms / 1000).toFixed(1).replace('.', ',') + ' с',
    clock(sec) {
      sec = Math.max(0, Math.ceil(sec));
      return Math.floor(sec / 60) + ':' + pad(sec % 60);
    },
    dayKey(ts) {
      const d = new Date(ts);
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    },
    dayMonth: (ts) => new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }),
    today() {
      const s = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
      return s.charAt(0).toUpperCase() + s.slice(1);
    },
    ago(ts) {
      const m = Math.round((Date.now() - ts) / 60000);
      if (m < 1) return 'только что';
      if (m < 60) return m + ' мин назад';
      const h = Math.round(m / 60);
      if (h < 24) return h + ' ч назад';
      const d = Math.round(h / 24);
      if (d === 1) return 'вчера';
      return d + ' ' + BT.fmt.plural(d, 'день', 'дня', 'дней') + ' назад';
    },
  };

  // ---------- localStorage (безопасно) ----------
  BT.ls = {
    get(key, def) {
      try {
        const v = localStorage.getItem(key);
        return v == null ? def : JSON.parse(v);
      } catch (e) {
        return def;
      }
    },
    set(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
    },
    del(key) {
      try { localStorage.removeItem(key); } catch (e) {}
    },
  };

  // ---------- Настройки ----------
  BT.settings = Object.assign({ theme: 'auto', sound: true, haptics: true, profile: null }, BT.ls.get('bt_settings', {}));
  BT.saveSettings = () => BT.ls.set('bt_settings', BT.settings);
  BT.applyTheme = function () {
    const t = BT.settings.theme;
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  };

  // ---------- События ----------
  const listeners = {};
  BT.on = (ev, fn) => (listeners[ev] = listeners[ev] || []).push(fn);
  BT.emit = (ev, data) => (listeners[ev] || []).forEach((fn) => fn(data));

  // ---------- Звук (синтез WebAudio, без файлов) ----------
  let actx = null;
  function audio() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (e) {}
      actx = new AC();
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function tone(freq, dur, type, vol, when, slideTo) {
    if (!BT.settings.sound) return;
    const a = audio();
    if (!a) return;
    const t0 = a.currentTime + (when || 0);
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.1, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(a.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  }
  const SCALE = [392, 440, 494, 523, 587, 659, 698, 784, 880, 988, 1047, 1175, 1319, 1397, 1568, 1760];
  BT.sound = {
    unlock: () => audio(),
    tap: () => tone(700, 0.05, 'sine', 0.05),
    good() { tone(880, 0.09, 'sine', 0.09); tone(1320, 0.14, 'sine', 0.07, 0.06); },
    bad: () => tone(240, 0.22, 'triangle', 0.12, 0, 150),
    tick: () => tone(1100, 0.035, 'square', 0.025),
    go() { tone(523, 0.09, 'sine', 0.09); tone(784, 0.16, 'sine', 0.09, 0.09); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'sine', 0.09, i * 0.09)); },
    lose() { [392, 330, 262].forEach((f, i) => tone(f, 0.22, 'triangle', 0.09, i * 0.12)); },
    note: (i) => tone(SCALE[i % SCALE.length], 0.26, 'sine', 0.1),
  };

  // ---------- Вибрация ----------
  // iPhone (iOS 18+): нажатие на <label> скрытого <input type="checkbox" switch> даёт тактильный отклик.
  // Android: navigator.vibrate.
  let hapticLabel = null;
  function initHaptic() {
    const input = BT.h('input', { type: 'checkbox', id: 'bt-haptic', switch: true, tabindex: '-1', 'aria-hidden': 'true' });
    hapticLabel = BT.h('label', { for: 'bt-haptic', 'aria-hidden': 'true' });
    const wrap = BT.h('div', { style: { position: 'fixed', left: '-200px', top: '0', width: '1px', height: '1px', overflow: 'hidden', opacity: '0' } }, input, hapticLabel);
    document.body.appendChild(wrap);
  }
  BT.haptic = function (kind) {
    if (!BT.settings.haptics) return;
    try {
      if (navigator.vibrate) {
        navigator.vibrate(kind === 'error' ? [25, 50, 25] : kind === 'heavy' ? 22 : 8);
        return;
      }
      if (!hapticLabel) initHaptic();
      hapticLabel.click();
      if (kind === 'error') setTimeout(() => hapticLabel.click(), 110);
    } catch (e) {}
  };

  // ---------- Игровые часы с паузой ----------
  // Все таймеры игр идут через них: пауза останавливает всё сразу.
  BT.createClock = function () {
    let now = 0, last = null, running = false, raf = 0, seq = 0;
    const jobs = new Map();
    const tickers = new Set();
    function frame(t) {
      if (!running) return;
      if (last != null) now += Math.min(100, t - last);
      last = t;
      for (const [id, j] of jobs) {
        if (now >= j.at) {
          if (j.every) j.at += j.every;
          else jobs.delete(id);
          j.fn();
          if (!running) return;
        }
      }
      tickers.forEach((fn) => fn(now));
      raf = requestAnimationFrame(frame);
    }
    return {
      get now() { return now; },
      get running() { return running; },
      start() {
        if (running) return;
        running = true;
        last = null;
        raf = requestAnimationFrame(frame);
      },
      pause() {
        running = false;
        cancelAnimationFrame(raf);
      },
      after(ms, fn) {
        const id = ++seq;
        jobs.set(id, { at: now + ms, fn });
        return id;
      },
      every(ms, fn) {
        const id = ++seq;
        jobs.set(id, { at: now + ms, fn, every: ms });
        return id;
      },
      cancel(id) { jobs.delete(id); },
      onTick(fn) {
        tickers.add(fn);
        return () => tickers.delete(fn);
      },
      destroy() {
        running = false;
        cancelAnimationFrame(raf);
        jobs.clear();
        tickers.clear();
      },
    };
  };

  // ---------- Категории и реестр игр ----------
  BT.CATS = [
    { id: 'memory', name: 'Память', color: 'var(--c-memory)' },
    { id: 'attention', name: 'Внимание', color: 'var(--c-attention)' },
    { id: 'logic', name: 'Логика и счёт', color: 'var(--c-logic)' },
    { id: 'words', name: 'Эрудиция и слова', color: 'var(--c-words)' },
    { id: 'puzzles', name: 'Головоломки', color: 'var(--c-puzzles)' },
  ];
  BT.cat = (id) => BT.CATS.find((c) => c.id === id);
  BT.games = [];
  BT.registerGame = (g) => BT.games.push(g);
  BT.game = (id) => BT.games.find((g) => g.id === id);
})();
