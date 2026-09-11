// UI-компоненты: иконки, тост, шторка, конфетти, графики, мелкие хелперы.
(function () {
  'use strict';
  const BT = window.BT;
  const h = BT.h;

  // ---------- Иконки (24×24, линия) ----------
  const P = {
    tabGames: '<rect x="3" y="3" width="7.5" height="7.5" rx="2.2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2.2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2.2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2.2"/>',
    tabProgress: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-7"/>',
    tabSettings: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    pause: '<path d="M9 5v14M15 5v14"/>',
    play: '<path d="M7 4.5l12 7.5-12 7.5z" fill="currentColor"/>',
    chevron: '<path d="M9 5l7 7-7 7"/>',
    replay: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.6"/><path d="M4 4v4.6h4.6"/>',
    sync: '<path d="M20 11a8 8 0 0 0-14.6-4.4L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.6 4.4L20 16"/><path d="M20 20v-4h-4"/>',
    server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
    sound: '<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
    haptic: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M3 9v6M21 9v6"/>',
    theme: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
    swap: '<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    backspace: '<path d="M21 5H9l-6 7 6 7h12z"/><path d="M17 9.5l-5 5M12 9.5l5 5"/>',
    // игры
    matrix: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/><rect x="9" y="9" width="6" height="6" fill="currentColor"/>',
    sequence: '<circle cx="5" cy="12" r="2.5"/><circle cx="12" cy="5.5" r="2.5"/><circle cx="19" cy="12" r="2.5"/><circle cx="12" cy="18.5" r="2.5"/><path d="M6.8 10.2l3.4-3M13.8 7.2l3.4 3M17.2 13.8l-3.4 3"/>',
    pairs: '<rect x="2.5" y="6" width="9" height="13" rx="2"/><rect x="12.5" y="5" width="9" height="13" rx="2"/><path d="M7 11v3M17 10v3"/>',
    schulte: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 8h.01M12 12h.01M16 16h.01M16 8h.01M8 16h.01" stroke-width="3"/>',
    stroop: '<path d="M5 20L11 4h2l6 16"/><path d="M8 14h8"/>',
    hue: '<path d="M12 3s6.5 6.6 6.5 11.3a6.5 6.5 0 0 1-13 0C5.5 9.6 12 3 12 3z"/><path d="M9 15a3 3 0 0 0 3 3"/>',
    reaction: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    math: '<path d="M4 7h6M7 4v6M14 7h6M4.5 15l5 5M9.5 15l-5 5M14 15.5h6M14 19.5h6"/>',
    compare: '<path d="M12 3v18M7 21h10M4 7h16"/><path d="M4 7l-2.5 6a3 3 0 0 0 5 0z"/><path d="M20 7l-2.5 6a3 3 0 0 0 5 0z"/>',
    series: '<path d="M3 17l5-5 4 3 8-8"/><path d="M15 7h5v5"/>',
    quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.2a2.6 2.6 0 0 1 5 .8c0 1.8-2.5 2.2-2.5 4"/><path d="M12 17h.01"/>',
    flag: '<path d="M5 21V4"/><path d="M5 4h12l-2.5 4 2.5 4H5"/>',
    anagram: '<rect x="2" y="7" width="6" height="9" rx="1.5"/><rect x="9" y="7" width="6" height="9" rx="1.5"/><rect x="16" y="7" width="6" height="9" rx="1.5"/><path d="M5 19.5h14"/>',
    spell: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    stress: '<path d="M6 21l6-13 6 13"/><path d="M8.3 16h7.4"/><path d="M13.5 2.5l-2.5 3"/>',
  };
  BT.icon = (name, cls) =>
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' +
    (cls ? ' class="' + cls + '"' : '') + '>' + (P[name] || P.tabGames) + '</svg>';

  // ---------- Мелкие хелперы разметки ----------
  BT.stat = (v, l) => h('div', null, h('div', { class: 'v', text: v }), h('div', { class: 'l', text: l }));
  BT.field = (label, el) => h('div', { class: 'field' }, h('div', { class: 'lbl', text: label }), el);
  BT.rowIcon = (icon, color) => h('div', { class: 'row-icon', style: { '--cc': color }, html: BT.icon(icon) });
  BT.chev = () => h('span', { html: BT.icon('chevron', 'chev') });

  BT.seg = function (items, value, onChange) {
    const el = h('div', { class: 'seg' });
    items.forEach(([v, label]) => {
      const b = h('button', {
        type: 'button',
        class: v === value ? 'on' : '',
        text: label,
        onclick: () => {
          BT.$$('button', el).forEach((x) => x.classList.toggle('on', x === b));
          BT.haptic();
          onChange(v);
        },
      });
      el.append(b);
    });
    return el;
  };

  BT.switchRow = function (icon, color, label, key, onChange) {
    const input = h('input', { type: 'checkbox', class: 'switch' });
    input.checked = !!BT.settings[key];
    input.addEventListener('change', () => {
      BT.settings[key] = input.checked;
      BT.saveSettings();
      if (input.checked) BT.haptic();
      if (onChange) onChange(input.checked);
    });
    return h('label', { class: 'row has-icon' }, BT.rowIcon(icon, color), h('div', { class: 'grow', text: label }), input);
  };

  // ---------- Тост ----------
  let toastEl = null, toastTimer = 0;
  BT.toast = function (text, ms) {
    if (!toastEl) {
      toastEl = h('div', { class: 'toast', role: 'status' });
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text;
    void toastEl.offsetWidth;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms || 2200);
  };

  // ---------- Шторка снизу (закрывается свайпом вниз и тапом по фону) ----------
  BT.sheet = function (content, opts) {
    opts = opts || {};
    const backdrop = h('div', { class: 'backdrop' });
    const sheet = h('div', { class: 'sheet', role: 'dialog', style: opts.style || null }, h('div', { class: 'grabber' }), content);
    document.body.append(backdrop, sheet);
    void sheet.offsetHeight;
    backdrop.classList.add('open');
    sheet.classList.add('open');

    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      backdrop.classList.remove('open');
      sheet.classList.remove('open');
      setTimeout(() => {
        backdrop.remove();
        sheet.remove();
      }, 420);
      if (opts.onClose) opts.onClose();
    }
    backdrop.addEventListener('click', close);

    let startY = null, dy = 0;
    sheet.addEventListener('touchstart', (e) => {
      if (sheet.scrollTop > 0 || e.target.closest('input, textarea')) return;
      startY = e.touches[0].clientY;
      dy = 0;
    }, { passive: true });
    sheet.addEventListener('touchmove', (e) => {
      if (startY == null) return;
      dy = Math.max(0, e.touches[0].clientY - startY);
      if (dy > 0) {
        sheet.style.transition = 'none';
        sheet.style.transform = 'translateY(' + dy + 'px)';
      }
    }, { passive: true });
    sheet.addEventListener('touchend', () => {
      if (startY == null) return;
      startY = null;
      sheet.style.transition = '';
      sheet.style.transform = '';
      if (dy > 110) close();
    });
    return { close, el: sheet };
  };

  // ---------- Конфетти ----------
  BT.confetti = function () {
    const c = h('canvas', { id: 'confetti' });
    document.body.appendChild(c);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = window.innerWidth, H = window.innerHeight;
    c.width = W * dpr;
    c.height = H * dpr;
    const x = c.getContext('2d');
    x.scale(dpr, dpr);
    const colors = ['#5856d6', '#af52de', '#ff9500', '#34c759', '#007aff', '#ff375f', '#ffcc00'];
    const parts = Array.from({ length: 150 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * 80,
      y: H * 0.32,
      vx: (Math.random() - 0.5) * 13,
      vy: -Math.random() * 13 - 4,
      r: Math.random() * 6 + 5,
      c: BT.rand.pick(colors),
      a: Math.random() * Math.PI,
      va: (Math.random() - 0.5) * 0.3,
    }));
    const t0 = performance.now(), LIFE = 2600;
    (function frame(t) {
      const el = t - t0;
      x.clearRect(0, 0, W, H);
      x.globalAlpha = Math.max(0, 1 - el / LIFE);
      parts.forEach((p) => {
        p.vy += 0.33;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.a += p.va;
        x.save();
        x.translate(p.x, p.y);
        x.rotate(p.a);
        x.fillStyle = p.c;
        x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
        x.restore();
      });
      if (el < LIFE) requestAnimationFrame(frame);
      else c.remove();
    })(t0);
  };

  // ---------- Анимированный счётчик ----------
  BT.countUp = function (el, to, ms) {
    ms = ms || 900;
    const t0 = performance.now();
    (function f(t) {
      const k = Math.min(1, (t - t0) / ms);
      el.textContent = BT.fmt.int(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(f);
    })(t0);
  };

  // ---------- Кольцо индекса ----------
  BT.ring = function (v, label) {
    const r = 52, C = 2 * Math.PI * r, k = v == null ? 0 : BT.clamp(v / 1000, 0, 1);
    return '<div class="ring"><svg viewBox="0 0 120 120">' +
      '<defs><linearGradient id="ringg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5856d6"/><stop offset="1" stop-color="#c056f2"/></linearGradient></defs>' +
      '<circle cx="60" cy="60" r="' + r + '" fill="none" style="stroke:var(--fill)" stroke-width="11"/>' +
      (k > 0 ? '<circle cx="60" cy="60" r="' + r + '" fill="none" stroke="url(#ringg)" stroke-width="11" stroke-linecap="round" stroke-dasharray="' + (C * k).toFixed(1) + ' ' + C.toFixed(1) + '"/>' : '') +
      '</svg><div class="ring-v"><div><b>' + (v == null ? '—' : v) + '</b><span>' + BT.esc(label) + '</span></div></div></div>';
  };

  // ---------- Линейный график ----------
  BT.lineChart = function (pts, color) {
    const vals = pts.filter((p) => p.v != null).map((p) => p.v);
    if (vals.length < 2) return null;
    const W = 340, H = 170, pl = 32, pr = 12, pt = 12, pb = 24;
    const lo = Math.max(0, Math.floor((Math.min.apply(null, vals) - 30) / 100) * 100);
    const hi = Math.min(1000, Math.max(lo + 100, Math.ceil((Math.max.apply(null, vals) + 30) / 100) * 100));
    const X = (i) => pl + (i / Math.max(1, pts.length - 1)) * (W - pl - pr);
    const Y = (v) => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
    let line = '', firstX = null, lastX = 0, lastY = 0;
    pts.forEach((p, i) => {
      if (p.v == null) return;
      const x = X(i), y = Y(p.v);
      line += (line ? ' L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      if (firstX == null) firstX = x;
      lastX = x;
      lastY = y;
    });
    const area = line + ' L' + lastX.toFixed(1) + ' ' + (H - pb) + ' L' + firstX.toFixed(1) + ' ' + (H - pb) + ' Z';
    let grid = '';
    for (let k = 0; k <= 4; k++) {
      const v = lo + ((hi - lo) * k) / 4, y = Y(v).toFixed(1);
      grid += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y + '" y2="' + y + '" style="stroke:var(--sep)" stroke-width="1"/>' +
        '<text x="' + (pl - 6) + '" y="' + (Number(y) + 3) + '" text-anchor="end">' + Math.round(v) + '</text>';
    }
    const lab = (ts) => {
      const d = new Date(ts);
      return d.getDate() + '.' + String(d.getMonth() + 1).padStart(2, '0');
    };
    const id = 'lg' + Math.random().toString(36).slice(2, 7);
    return '<svg class="chart" style="height:auto" viewBox="0 0 ' + W + ' ' + H + '">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:' + color + ';stop-opacity:.3"/><stop offset="1" style="stop-color:' + color + ';stop-opacity:0"/></linearGradient></defs>' +
      grid +
      '<path d="' + area + '" fill="url(#' + id + ')"/>' +
      '<path d="' + line + '" fill="none" style="stroke:' + color + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + lastX.toFixed(1) + '" cy="' + lastY.toFixed(1) + '" r="4.5" style="fill:' + color + ';stroke:var(--card)" stroke-width="2"/>' +
      '<text x="' + pl + '" y="' + (H - 6) + '">' + lab(pts[0].ts) + '</text>' +
      '<text x="' + (W - pr) + '" y="' + (H - 6) + '" text-anchor="end">' + lab(pts[pts.length - 1].ts) + '</text>' +
      '</svg>';
  };

  // ---------- Спарклайн ----------
  BT.spark = function (vals, color) {
    if (!vals || vals.length < 2) return '';
    const W = 64, H = 26;
    const lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), span = hi - lo || 1;
    const pts = vals.map((v, i) => ((i / (vals.length - 1)) * (W - 4) + 2).toFixed(1) + ',' + (H - 3 - ((v - lo) / span) * (H - 6)).toFixed(1)).join(' ');
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '"><polyline points="' + pts + '" fill="none" style="stroke:' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  };
})();
