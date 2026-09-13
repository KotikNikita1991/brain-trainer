// Головоломки: «Кроссворд» (определения) и «Слова из букв» (перекрёстные слова из набора букв).
(function () {
  'use strict';
  const BT = window.BT;
  const D = (BT.DATA = BT.DATA || {});
  const shuffle = BT.rand.shuffle;
  const key = (r, c) => r + ',' + c;
  const mmss = (ms) => {
    const s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };
  const up = (s) => s.toUpperCase().replace(/Ё/g, 'Е');

  // ---------- Раскладка слов в сетку с пересечениями ----------
  function tryLayout(words, maxSize) {
    const grid = new Map();
    const placed = [];
    let minR = 0, maxR = 0, minC = 0, maxC = 0;
    const put = (w, r, c, d, extra) => {
      const dr = d ? 1 : 0, dc = d ? 0 : 1;
      for (let k = 0; k < w.length; k++) {
        const kk = key(r + dr * k, c + dc * k);
        const cell = grid.get(kk) || { ch: w[k], dirs: 0 };
        cell.dirs |= 1 << d;
        grid.set(kk, cell);
      }
      minR = Math.min(minR, r); minC = Math.min(minC, c);
      maxR = Math.max(maxR, r + dr * (w.length - 1)); maxC = Math.max(maxC, c + dc * (w.length - 1));
      placed.push(Object.assign({ w, r, c, d }, extra));
    };
    const check = (w, r, c, d) => {
      const dr = d ? 1 : 0, dc = d ? 0 : 1;
      if (grid.has(key(r - dr, c - dc)) || grid.has(key(r + dr * w.length, c + dc * w.length))) return -1;
      let cross = 0;
      for (let k = 0; k < w.length; k++) {
        const rr = r + dr * k, cc = c + dc * k, cell = grid.get(key(rr, cc));
        if (cell) {
          if (cell.ch !== w[k] || cell.dirs & (1 << d)) return -1;
          cross++;
        } else if (grid.has(key(rr + dc, cc + dr)) || grid.has(key(rr - dc, cc - dr))) return -1;
      }
      const h = Math.max(maxR, r + dr * (w.length - 1)) - Math.min(minR, r) + 1;
      const wd = Math.max(maxC, c + dc * (w.length - 1)) - Math.min(minC, c) + 1;
      if (h > maxSize || wd > maxSize) return -1;
      return cross;
    };
    words.forEach((item, idx) => {
      const w = item.w;
      if (!placed.length) return put(w, 0, 0, 0, item);
      let best = null;
      placed.forEach((p) => {
        for (let a = 0; a < p.w.length; a++) {
          for (let b = 0; b < w.length; b++) {
            if (p.w[a] !== w[b]) continue;
            const d = 1 - p.d;
            const pr = p.r + (p.d ? a : 0), pc = p.c + (p.d ? 0 : a);
            const r = pr - (d ? b : 0), c = pc - (d ? 0 : b);
            const cross = check(w, r, c, d);
            if (cross > 0) {
              const area = (Math.max(maxR, r + (d ? w.length - 1 : 0)) - Math.min(minR, r) + 1) * (Math.max(maxC, c + (d ? 0 : w.length - 1)) - Math.min(minC, c) + 1);
              const score = cross * 100 - area + Math.random();
              if (!best || score > best.score) best = { r, c, d, score };
            }
          }
        }
      });
      if (best) put(w, best.r, best.c, best.d, item);
    });
    placed.forEach((p) => { p.r -= minR; p.c -= minC; });
    return { placed, rows: maxR - minR + 1, cols: maxC - minC + 1 };
  }
  function layout(items, want, maxSize) {
    let best = null;
    for (let t = 0; t < 40; t++) {
      const sorted = t === 0 ? items.slice().sort((a, b) => b.w.length - a.w.length) : [items[0]].concat(shuffle(items.slice(1)));
      const L = tryLayout(sorted, maxSize);
      const score = Math.min(L.placed.length, want) * 1000 - L.rows * L.cols;
      if (!best || score > best.score) best = Object.assign(L, { score });
      if (L.placed.length >= want && t > 8) break;
    }
    // Нумерация как в настоящем кроссворде
    const starts = new Map();
    best.placed.slice().sort((a, b) => a.r - b.r || a.c - b.c).forEach((p) => {
      const k = key(p.r, p.c);
      if (!starts.has(k)) starts.set(k, starts.size + 1);
      p.num = starts.get(k);
    });
    return best;
  }
  function cellsOf(p) {
    return Array.from({ length: p.w.length }, (_, k) => key(p.r + (p.d ? k : 0), p.c + (p.d ? 0 : k)));
  }
  function buildGrid(L, parent, h, size) {
    const grid = h('div', { class: 'cw-grid', style: { gridTemplateColumns: 'repeat(' + L.cols + ', ' + size + 'px)', gridAutoRows: size + 'px', fontSize: Math.round(size * 0.55) + 'px' } });
    const map = new Map();
    for (let r = 0; r < L.rows; r++) {
      for (let c = 0; c < L.cols; c++) {
        const el = h('div', { class: 'cw-c blank' });
        map.set(key(r, c), el);
        grid.append(el);
      }
    }
    L.placed.forEach((p) => {
      cellsOf(p).forEach((k) => map.get(k).classList.remove('blank'));
      const first = map.get(key(p.r, p.c));
      if (p.num && !first.querySelector('.cw-n')) first.append(h('span', { class: 'cw-n', text: p.num }));
    });
    parent.append(grid);
    return map;
  }
  const cellSize = (L, maxW, maxH) => Math.floor(Math.min(40, (maxW - (L.cols - 1) * 3) / L.cols, (maxH - (L.rows - 1) * 3) / L.rows));

  // ---------- Определения: ручные + из справочников ----------
  let clueBank = null;
  function clues() {
    if (clueBank) return clueBank;
    const out = [];
    const add = (answer, clue) => {
      const a = up(String(answer).trim());
      if (/^[А-Я]{3,9}$/.test(a)) out.push({ a, q: clue.charAt(0).toUpperCase() + clue.slice(1) });
    };
    (D.clues || []).forEach(([a, q]) => add(a, q));
    const S = D.sets || {};
    (S.countries || []).forEach((r) => { add(r[1], 'Столица страны: ' + r[0]); add(r[0], 'Страна со столицей ' + r[1]); });
    (S.elements || []).forEach((r) => add(r[0], 'Химический элемент, символ ' + r[1]));
    (S.myth || []).forEach((r) => add(r[0], r[1]));
    (S.vocab || []).forEach((r) => add(r[0], r[1]));
    const surname = (n) => {
      const p = n.split(' ');
      return p.length === 1 ? p[0] : p.length === 2 && !/ и |Братья/.test(n) ? p[1] : null;
    };
    (S.books || []).forEach((r) => { const s = surname(r[1]); if (s) add(s, 'Автор произведения «' + r[0] + '» (фамилия)'); });
    (S.music || []).forEach((r) => { const s = surname(r[1]); if (s) add(s, 'Композитор: «' + r[0] + '» (фамилия)'); });
    (S.paintings || []).forEach((r) => { const s = surname(r[1]); if (s) add(s, 'Автор картины «' + r[0] + '»'); });
    const seen = new Set();
    clueBank = out.filter((x) => (seen.has(x.a) ? false : (seen.add(x.a), true)));
    return clueBank;
  }

  const KB = ['ЙЦУКЕНГШЩЗХЪ', 'ФЫВАПРОЛДЖЭ', 'ЯЧСМИТЬБЮ'];
  const CW_SIZE = [null, 6, 8, 10, 12];

  // ------------------------------------------------------------------ Кроссворд
  BT.registerGame({
    id: 'crossword', cat: 'puzzles', icon: 'crossword',
    name: 'Кроссворд', short: 'Разгадай слова по определениям',
    howto: [
      'Нажмите на клетку — появится определение слова. Вводите буквы с клавиатуры.',
      'Повторное нажатие на клетку пересечения меняет направление. Стрелки переключают слова.',
      'Подсказка открывает букву. Буква «Ё» пишется как «Е». Уровень — количество слов.',
    ],
    ref: 700, startLevel: 1, maxLevel: 4, noCountdown: true, stageClass: 'stage-top',
    run(ctx) {
      const h = ctx.h;
      const lvl = BT.clamp(ctx.level, 1, 4), want = CW_SIZE[lvl];
      const seen = BT.store.seen(ctx.me.id, 'cw');
      let pool = clues().filter((x) => !seen.has(x.a));
      if (pool.length < 80) {
        BT.store.resetSeen(ctx.me.id, 'cw');
        pool = clues();
      }
      const cand = BT.rand.sample(pool, 70);
      const L = layout(cand.map((x) => ({ w: x.a, q: x.q })), want, lvl >= 3 ? 12 : 10);
      L.placed = L.placed.slice(0, Math.max(want, 4));
      const words = L.placed;
      const size = cellSize(L, Math.min(window.innerWidth - 24, 480), window.innerHeight * 0.4);
      const wrap = h('div', { style: { display: 'flex', justifyContent: 'center', width: '100%' } });
      const clueBox = h('div', { class: 'cw-clue' });
      ctx.stage.append(wrap, clueBox);
      const map = buildGrid(L, wrap, h, size);
      const letters = new Map(), locked = new Set(), revealed = new Set();
      const solved = new Set();
      let cur = 0, pos = 0, hints = 0, lastSec = -1;

      const kb = h('div', { class: 'kb' });
      KB.forEach((row, ri) => {
        const r = h('div', { class: 'kb-row' });
        Array.from(row).forEach((ch) => { const b = h('button', { type: 'button', class: 'kb-k', text: ch }); ctx.tap(b, () => type(ch)); r.append(b); });
        if (ri === 2) {
          const del = h('button', { type: 'button', class: 'kb-k fn', html: BT.icon('backspace') });
          ctx.tap(del, backspace);
          const hint = h('button', { type: 'button', class: 'kb-k fn', html: BT.icon('hint') });
          ctx.tap(hint, doHint);
          r.prepend(hint);
          r.append(del);
        }
        kb.append(r);
      });
      ctx.stage.append(kb);

      words.forEach((p, i) => cellsOf(p).forEach((k) => {
        const el = map.get(k);
        if (!el._bound) {
          el._bound = true;
          ctx.tap(el, () => tapCell(k));
        }
      }));

      function wordsAt(k) {
        return words.map((p, i) => (cellsOf(p).includes(k) ? i : -1)).filter((i) => i >= 0);
      }
      function tapCell(k) {
        const ws = wordsAt(k);
        if (!ws.length) return;
        const already = cellsOf(words[cur])[pos] === k;
        cur = already && ws.length > 1 ? ws.find((i) => i !== cur) : ws.includes(cur) ? cur : ws[0];
        pos = cellsOf(words[cur]).indexOf(k);
        BT.haptic();
        draw();
      }
      function moveWord(step) {
        for (let t = 1; t <= words.length; t++) {
          const i = (cur + step * t + words.length * 2) % words.length;
          if (!solved.has(i)) {
            cur = i;
            pos = firstEmpty(i);
            return draw();
          }
        }
      }
      function firstEmpty(i) {
        const cs = cellsOf(words[i]);
        const e = cs.findIndex((k) => !letters.get(k));
        return e < 0 ? 0 : e;
      }
      function type(ch) {
        const cs = cellsOf(words[cur]);
        let k = cs[pos];
        while (locked.has(k) && pos < cs.length - 1) k = cs[++pos];
        if (locked.has(k)) return;
        letters.set(k, ch);
        BT.sound.tap();
        BT.haptic();
        if (pos < cs.length - 1) pos++;
        afterChange();
      }
      function backspace() {
        const cs = cellsOf(words[cur]);
        if (!letters.get(cs[pos]) || locked.has(cs[pos])) if (pos > 0) pos--;
        if (!locked.has(cs[pos])) letters.delete(cs[pos]);
        BT.haptic();
        draw();
      }
      function doHint() {
        const cs = cellsOf(words[cur]);
        const k = cs.find((x) => letters.get(x) !== words[cur].w[cs.indexOf(x)] && !locked.has(x));
        if (!k) return;
        letters.set(k, words[cur].w[cs.indexOf(k)]);
        locked.add(k);
        revealed.add(k);
        hints++;
        ctx.click();
        afterChange();
      }
      function afterChange() {
        let newly = 0;
        words.forEach((p, i) => {
          if (solved.has(i)) return;
          const cs = cellsOf(p);
          if (cs.every((k, j) => letters.get(k) === p.w[j])) {
            solved.add(i);
            newly++;
            cs.forEach((k) => { locked.add(k); map.get(k).classList.add('pop'); });
          }
        });
        if (newly) {
          ctx.good(map.get(cellsOf(words[cur])[0]));
          ctx.hud({ score: solved.size });
          if (solved.size === words.length) return win();
          if (solved.has(cur)) moveWord(1);
        }
        draw();
      }
      function draw() {
        const act = new Set(cellsOf(words[cur]));
        const curK = cellsOf(words[cur])[pos];
        map.forEach((el, k) => {
          if (el.classList.contains('blank')) return;
          const ch = letters.get(k) || '';
          const num = el.querySelector('.cw-n');
          el.textContent = ch;
          if (num) el.prepend(num);
          const ok = locked.has(k) && !revealed.has(k);
          const wrongFull = words.some((p, i) => !solved.has(i) && cellsOf(p).includes(k) && cellsOf(p).every((x) => letters.get(x)));
          el.className = 'cw-c' + (act.has(k) ? ' act' : '') + (k === curK ? ' cur' : '') + (ok ? ' ok' : '') + (revealed.has(k) ? ' rev' : '') + (wrongFull && !locked.has(k) ? ' bad' : '');
        });
        const p = words[cur];
        clueBox.innerHTML = '';
        const prev = h('button', { type: 'button', text: '‹' });
        const next = h('button', { type: 'button', text: '›' });
        ctx.tap(prev, () => moveWord(-1));
        ctx.tap(next, () => moveWord(1));
        clueBox.append(prev, h('span', { class: 'dir', text: p.num + (p.d ? '↓' : '→') }), h('span', { class: 'txt', text: p.q + ' (' + p.w.length + ')' }), next);
      }
      function win() {
        const ms = ctx.clock.now;
        BT.store.markSeen(ctx.me.id, 'cw', words.map((p) => p.w));
        const base = words.reduce((s, p) => s + p.w.length * 10, 0);
        const tf = BT.clamp((words.length * 40000) / Math.max(1, ms), 0.6, 1.3);
        const score = Math.round(base * tf * Math.max(0.3, 1 - hints * 0.05));
        draw();
        ctx.clock.after(700, () => ctx.end({
          score, accuracy: Math.max(0, 1 - hints / Math.max(1, words.reduce((s, p) => s + p.w.length, 0))),
          nextLevel: hints <= 2 ? lvl + 1 : hints > 8 ? lvl - 1 : lvl, emoji: '📰', title: 'Кроссворд разгадан!',
          review: words.map((p) => ({ q: p.q, right: p.w, ok: !cellsOf(p).some((k) => revealed.has(k)), your: 'с подсказкой' })),
          reviewTitle: 'Ответы кроссворда',
          stats: [['Слов', words.length], ['Подсказки', hints], ['Время', mmss(ms)]],
          details: { words: words.length, hints },
        }));
      }
      ctx.hud({ score: 0, label: 'из ' + words.length });
      ctx.clock.onTick((now) => {
        const s = Math.floor(now / 1000);
        if (s !== lastSec) { lastSec = s; ctx.hud({ text: mmss(now) }); }
      });
      const onKey = (e) => {
        if (!ctx.alive || ctx.paused) return;
        const ch = up(e.key || '');
        if (/^[А-Я]$/.test(ch)) type(ch);
        else if (e.key === 'Backspace') backspace();
      };
      document.addEventListener('keydown', onKey);
      pos = firstEmpty(0);
      draw();
      return () => document.removeEventListener('keydown', onKey);
    },
  });

  // ------------------------------------------------------------------ Слова из букв
  const WC_LEN = [null, 5, 6, 7];
  function dictionary() {
    const W = D.words || {};
    return Array.from(new Set((W.dict || []).concat(W.nouns || []))).map(up).filter((w) => /^[А-Я]{3,8}$/.test(w));
  }
  function counts(w) {
    const m = {};
    for (const ch of w) m[ch] = (m[ch] || 0) + 1;
    return m;
  }
  function fits(w, base) {
    const m = Object.assign({}, base);
    for (const ch of w) {
      if (!m[ch]) return false;
      m[ch]--;
    }
    return true;
  }
  function makePuzzle(len) {
    const dict = dictionary();
    const bases = shuffle(dict.filter((w) => w.length === len));
    let best = null;
    for (const b of bases.slice(0, 250)) {
      const bc = counts(b);
      const subs = dict.filter((w) => w.length <= len && fits(w, bc));
      if (!best || subs.length > best.subs.length) best = { base: b, subs };
      if (subs.length >= 7) break;
    }
    const items = best.subs.slice().sort((a, b) => b.length - a.length).slice(0, 14).map((w) => ({ w }));
    const L = layout(items, 8, 10);
    return { base: best.base, L, all: new Set(best.subs) };
  }

  BT.registerGame({
    id: 'wordcross', cat: 'puzzles', icon: 'wordcross',
    name: 'Слова из букв', short: 'Собери все слова кроссворда',
    howto: [
      'Из букв на круге составьте слова, спрятанные в сетке.',
      'Нажимайте буквы по порядку и жмите «Проверить». Лишние слова из словаря — бонус.',
      'Подсказка открывает букву в сетке. «Перемешать» — чтобы взглянуть на буквы по-новому.',
    ],
    ref: 500, startLevel: 1, maxLevel: 3, noCountdown: true, stageClass: 'stage-top',
    run(ctx) {
      const h = ctx.h;
      const lvl = BT.clamp(ctx.level, 1, 3);
      const P = makePuzzle(WC_LEN[lvl]);
      BT.lex.load();
      const words = P.L.placed;
      const targets = new Map(words.map((p, i) => [p.w, i]));
      const size = cellSize(P.L, Math.min(window.innerWidth - 32, 420), window.innerHeight * 0.34);
      const wrap = h('div', { style: { display: 'flex', justifyContent: 'center', width: '100%' } });
      const wordEl = h('div', { class: 'wc-word', text: ' ' });
      const wheel = h('div', { class: 'wc-wheel' });
      const bonusEl = h('div', { class: 'wc-bonus' });
      const addChip = h('button', { type: 'button', class: 'add-word hidden' });
      let addWord = '';
      function showAdd(w) {
        addWord = w;
        addChip.textContent = '+ «' + w.toLowerCase() + '» — есть такое слово? Засчитать';
        addChip.classList.remove('hidden');
      }
      ctx.stage.append(wrap);
      const map = buildGrid(P.L, wrap, h, size);
      let letters = shuffle(Array.from(P.base));
      let picked = [], score = 0, hints = 0, lastSec = -1;
      const found = new Set(), bonus = new Set(), shown = new Set();
      const shuffleBtn = h('button', { type: 'button', class: 'btn secondary', text: 'Перемешать' });
      const clearBtn = h('button', { type: 'button', class: 'btn secondary', text: 'Стереть' });
      const hintBtn = h('button', { type: 'button', class: 'btn secondary', html: BT.icon('hint') });
      const okBtn = h('button', { type: 'button', class: 'btn', text: 'Проверить' });
      ctx.stage.append(wordEl, wheel, h('div', { class: 'wc-bar' }, shuffleBtn, clearBtn, hintBtn), h('div', { class: 'wc-bar', style: { marginTop: '10px' } }, okBtn), bonusEl, addChip);
      ctx.tap(addChip, () => {
        if (!addWord) return;
        BT.lex.addPersonal(ctx.me.id, addWord);
        bonus.add(addWord);
        score += 5;
        addChip.classList.add('hidden');
        addWord = '';
        BT.toast('Добавлено в ваш словарь');
        drawGrid();
      });
      ctx.tap(shuffleBtn, () => { letters = shuffle(letters); picked = []; drawWheel(); });
      ctx.tap(clearBtn, () => { picked = []; drawWheel(); });
      ctx.tap(hintBtn, doHint);
      ctx.tap(okBtn, submit);

      function drawWheel() {
        wheel.innerHTML = '';
        const n = letters.length, R = 38;
        letters.forEach((ch, i) => {
          const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
          const b = h('button', { type: 'button', class: 'wc-l' + (picked.includes(i) ? ' used' : ''), text: ch, style: { left: 50 + R * Math.cos(ang) + '%', top: 50 + R * Math.sin(ang) + '%' } });
          ctx.tap(b, () => {
            if (picked.includes(i)) return;
            picked.push(i);
            BT.sound.note(picked.length + 2);
            BT.haptic();
            drawWheel();
            if (picked.length === letters.length) submit();
          });
          wheel.append(b);
        });
        wordEl.className = 'wc-word';
        wordEl.textContent = picked.map((i) => letters[i]).join('') || ' ';
      }
      function drawGrid() {
        words.forEach((p, i) => cellsOf(p).forEach((k, j) => {
          const el = map.get(k);
          const vis = found.has(i) || shown.has(k);
          const num = el.querySelector('.cw-n');
          el.textContent = vis ? p.w[j] : '';
          if (num) el.prepend(num);
          el.classList.toggle('ok', found.has(i));
          el.classList.toggle('rev', shown.has(k) && !found.has(i));
        }));
        ctx.hud({ score, label: '', text: found.size + '/' + words.length });
        bonusEl.textContent = bonus.size ? 'Бонусные слова: ' + Array.from(bonus).join(', ').toLowerCase() : 'Найдите ' + words.length + ' ' + BT.fmt.plural(words.length, 'слово', 'слова', 'слов');
      }
      function flashWord(cls) {
        wordEl.classList.add(cls);
        ctx.clock.after(500, () => { picked = []; drawWheel(); });
      }
      function submit() {
        const w = picked.map((i) => letters[i]).join('');
        if (w.length < 3) return;
        addChip.classList.add('hidden');
        if (targets.has(w) && !found.has(targets.get(w))) {
          const i = targets.get(w);
          found.add(i);
          score += w.length * 10;
          cellsOf(words[i]).forEach((k) => map.get(k).classList.add('pop'));
          ctx.good(wordEl, '+' + w.length * 10);
          picked = [];
          drawWheel();
          drawGrid();
          if (found.size === words.length) win();
        } else if (found.has(targets.get(w)) || bonus.has(w)) {
          flashWord('dup');
        } else if (P.all.has(w) || BT.lex.has(w, ctx.me.id)) {
          bonus.add(w);
          score += 5;
          ctx.good(wordEl, '+5');
          picked = [];
          drawWheel();
          drawGrid();
        } else {
          ctx.bad();
          flashWord('bad');
          showAdd(w);
        }
      }
      function doHint() {
        const open = [];
        words.forEach((p, i) => { if (!found.has(i)) cellsOf(p).forEach((k) => { if (!shown.has(k)) open.push(k); }); });
        if (!open.length) return;
        shown.add(BT.rand.pick(open));
        hints++;
        score = Math.max(0, score - 10);
        ctx.click();
        drawGrid();
      }
      function win() {
        const ms = ctx.clock.now;
        const tf = BT.clamp((words.length * 25000) / Math.max(1, ms), 0.6, 1.3);
        const final = Math.round(score * tf);
        ctx.clock.after(700, () => ctx.end({
          score: final, accuracy: Math.max(0, 1 - hints / 10), nextLevel: hints <= 1 ? lvl + 1 : hints > 5 ? lvl - 1 : lvl,
          emoji: '🔤', title: 'Все слова найдены!',
          stats: [['Слов', words.length], ['Бонус', bonus.size], ['Время', mmss(ms)]],
          details: { base: P.base, words: words.length, bonus: bonus.size, hints },
        }));
      }
      ctx.clock.onTick((now) => {
        const s = Math.floor(now / 1000);
        if (s !== lastSec) lastSec = s;
      });
      drawWheel();
      drawGrid();
    },
  });
})();
