// Логика и счёт: «Быстрый счёт», «Больше-меньше», «Числовой ряд».
(function () {
  'use strict';
  const BT = window.BT;
  const r = BT.rand.int, pick = BT.rand.pick;
  const seq = (n, f) => Array.from({ length: n }, (_, i) => f(i));

  // ------------------------------------------------------------------ Быстрый счёт
  function mathProblem(d) {
    let a, b, c, q, ans;
    const t = r(0, 2);
    switch (d) {
      case 1:
        if (t) { a = r(1, 9); b = r(1, 9); q = a + ' + ' + b; ans = a + b; }
        else { a = r(3, 10); b = r(1, a - 1); q = a + ' − ' + b; ans = a - b; }
        break;
      case 2:
        if (t) { a = r(5, 19); b = r(2, 9); q = a + ' + ' + b; ans = a + b; }
        else { a = r(11, 20); b = r(2, 9); q = a + ' − ' + b; ans = a - b; }
        break;
      case 3:
        if (t === 0) { a = r(11, 49); b = r(2, 9); q = a + ' + ' + b; ans = a + b; }
        else if (t === 1) { a = r(20, 60); b = r(2, 9); q = a + ' − ' + b; ans = a - b; }
        else { a = r(2, 5); b = r(2, 9); q = a + ' × ' + b; ans = a * b; }
        break;
      case 4:
        if (t === 0) { a = r(12, 59); b = r(11, 39); q = a + ' + ' + b; ans = a + b; }
        else if (t === 1) { a = r(40, 99); b = r(11, a - 10); q = a + ' − ' + b; ans = a - b; }
        else { a = r(3, 9); b = r(3, 9); q = a + ' × ' + b; ans = a * b; }
        break;
      case 5:
        if (t === 0) { a = r(25, 89); b = r(15, 79); q = a + ' + ' + b; ans = a + b; }
        else if (t === 1) { b = r(2, 9); ans = r(3, 12); a = b * ans; q = a + ' : ' + b; }
        else { a = r(6, 9); b = r(6, 12); q = a + ' × ' + b; ans = a * b; }
        break;
      case 6:
        if (t === 0) { a = r(11, 25); b = r(3, 9); q = a + ' × ' + b; ans = a * b; }
        else if (t === 1) { a = r(10, 40); b = r(10, 40); c = r(5, a + b - 5); q = a + ' + ' + b + ' − ' + c; ans = a + b - c; }
        else { a = r(101, 450); b = r(11, 99); q = a + ' − ' + b; ans = a - b; }
        break;
      case 7:
        if (t === 0) { a = r(26, 99); b = r(3, 9); q = a + ' × ' + b; ans = a * b; }
        else if (t === 1) { b = r(3, 9); ans = r(12, 40); a = b * ans; q = a + ' : ' + b; }
        else { a = r(120, 900); b = r(110, 700); q = a + ' + ' + b; ans = a + b; }
        break;
      case 8:
        if (t === 0) { a = r(11, 25); q = a + '²'; ans = a * a; }
        else if (t === 1) {
          const p = pick([10, 20, 25, 50, 75]);
          b = pick([40, 60, 80, 120, 160, 200, 240, 300, 360, 400]);
          q = p + '% от ' + b; ans = (p * b) / 100;
        } else { a = r(3, 9); b = r(3, 9); c = r(2, 30); q = a + ' × ' + b + ' + ' + c; ans = a * b + c; }
        break;
      case 9:
        if (t) { a = r(11, 29); b = r(11, 19); q = a + ' × ' + b; ans = a * b; }
        else { b = r(4, 9); ans = r(25, 120); a = b * ans; q = a + ' : ' + b; }
        break;
      default:
        if (t === 0) { a = r(21, 49); b = r(12, 29); q = a + ' × ' + b; ans = a * b; }
        else if (t === 1) { a = r(12, 30); b = r(3, 9); c = r(10, a * b - 10); q = a + ' × ' + b + ' − ' + c; ans = a * b - c; }
        else { a = r(21, 35); q = a + '²'; ans = a * a; }
    }
    return { q, ans };
  }

  BT.registerGame({
    id: 'math', cat: 'logic', icon: 'math',
    name: 'Быстрый счёт', short: 'Считай в уме на скорость',
    howto: [
      'Решайте примеры и набирайте ответ — проверка автоматическая, кнопка «ОК» не нужна.',
      'Три верных подряд — примеры сложнее, ошибка — проще.',
      '60 секунд. Чем сложнее пример, тем больше очков.',
    ],
    ref: 1000, startLevel: 1, maxLevel: 10,
    run(ctx) {
      const h = ctx.h;
      let d = BT.clamp(ctx.level, 1, 10), maxD = d, streak = 0, score = 0, right = 0, wrong = 0, skipped = 0;
      let input = '', cur = null, locked = true;
      const lvlEl = h('div', { class: 'stage-msg' });
      const q = h('div', { class: 'big-q' });
      const ans = h('div', { class: 'answer' });
      const pad = h('div', { class: 'keypad' });
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'skip'].forEach((k) => {
        const fn = k === 'del' || k === 'skip';
        const b = h('button', { type: 'button', class: 'key' + (fn ? ' fn' : ''), html: k === 'del' ? BT.icon('backspace') : k === 'skip' ? 'Пропуск' : k });
        ctx.tap(b, () => press(k));
        pad.append(b);
      });
      ctx.stage.append(lvlEl, q, ans, pad);
      ctx.hud({ score: 0 });

      const show = () => { ans.textContent = input || ' '; };
      function nextQ() {
        cur = mathProblem(d);
        q.textContent = cur.q + ' =';
        lvlEl.textContent = 'Сложность ' + d + ' из 10';
        input = '';
        ans.className = 'answer';
        show();
        locked = false;
      }
      function press(k) {
        if (locked) return;
        if (k === 'skip') return skip();
        BT.sound.tap();
        BT.haptic();
        if (k === 'del') input = input.slice(0, -1);
        else if (input.length < 6) input += k;
        show();
        const want = String(cur.ans);
        if (input === want) correct();
        else if (input.length >= want.length) miss();
      }
      function correct() {
        locked = true;
        right++;
        streak++;
        const pts = 10 * d;
        score += pts;
        ans.classList.add('ok');
        ctx.hud({ score });
        ctx.good(ans, '+' + pts);
        if (streak >= 3) {
          streak = 0;
          d = Math.min(10, d + 1);
          maxD = Math.max(maxD, d);
        }
        ctx.clock.after(260, nextQ);
      }
      function miss() {
        locked = true;
        wrong++;
        streak = 0;
        d = Math.max(1, d - 1);
        ans.classList.add('err');
        ans.textContent = cur.ans;
        ctx.bad();
        ctx.clock.after(900, nextQ);
      }
      function skip() {
        locked = true;
        skipped++;
        streak = 0;
        ans.textContent = cur.ans;
        ans.style.color = 'var(--text3)';
        ctx.clock.after(700, () => { ans.style.color = ''; nextQ(); });
      }
      const onKey = (e) => {
        if (!ctx.alive || !ctx.clock.running) return;
        if (/^[0-9]$/.test(e.key)) press(e.key);
        else if (e.key === 'Backspace') press('del');
      };
      document.addEventListener('keydown', onKey);
      ctx.timer(60, finish);
      nextQ();

      function finish() {
        ctx.end({
          score, accuracy: right / Math.max(1, right + wrong), nextLevel: Math.max(1, d - 1),
          stats: [['Верно', right], ['Ошибки', wrong + skipped], ['Макс. сложность', maxD]],
          details: { right, wrong, skipped, maxD },
        });
      }
      return () => document.removeEventListener('keydown', onKey);
    },
  });

  // ------------------------------------------------------------------ Больше-меньше
  const KINDS = [
    () => { const v = r(10, 99); return { t: String(v), v }; },
    () => { const a = r(5, 50), b = r(5, 50); return { t: a + ' + ' + b, v: a + b }; },
    () => { const a = r(30, 99), b = r(5, 29); return { t: a + ' − ' + b, v: a - b }; },
    () => { const a = r(2, 12), b = r(2, 12); return { t: a + ' × ' + b, v: a * b }; },
    () => { const b = r(2, 9), v = r(2, 15); return { t: b * v + ' : ' + b, v }; },
    () => { const a = r(11, 25), b = r(3, 9); return { t: a + ' × ' + b, v: a * b }; },
    () => { const p = pick([10, 20, 25, 50]), b = pick([40, 80, 120, 160, 200, 240]); return { t: p + '% от ' + b, v: (p * b) / 100 }; },
    () => { const a = r(2, 9), b = r(2, 9), c = r(2, 20); return { t: a + ' × ' + b + ' + ' + c, v: a * b + c }; },
  ];
  const ALLOWED = [[0, 1], [0, 1, 2], [1, 2, 3], [2, 3, 4], [3, 4, 5], [3, 5, 6], [4, 5, 6, 7], [5, 6, 7]];
  function makePair(lvl) {
    const kinds = ALLOWED[lvl - 1], maxDiff = Math.max(2, 30 - lvl * 3);
    let fallback = null;
    for (let i = 0; i < 40; i++) {
      const a = KINDS[pick(kinds)](), b = KINDS[pick(kinds)]();
      if (a.v === b.v || a.t === b.t) continue;
      if (Math.abs(a.v - b.v) <= maxDiff) return [a, b];
      if (!fallback) fallback = [a, b];
    }
    return fallback || [{ t: '12', v: 12 }, { t: '21', v: 21 }];
  }

  BT.registerGame({
    id: 'compare', cat: 'logic', icon: 'compare',
    name: 'Больше-меньше', short: 'Выбери большее выражение',
    howto: [
      'Слева и справа — числа или выражения.',
      'Нажмите на то, что больше. Считайте в уме — и быстро.',
      '45 секунд. Ошибка отнимает 2 секунды, серия верных даёт бонус.',
    ],
    ref: 750, startLevel: 1, maxLevel: 8,
    run(ctx) {
      const h = ctx.h;
      const lvl = BT.clamp(ctx.level, 1, 8);
      let score = 0, streak = 0, right = 0, wrong = 0, locked = false, cur = null;
      const msg = h('div', { class: 'stage-msg strong', text: 'Что больше?' });
      const L = h('button', { type: 'button', class: 'cmp' });
      const R = h('button', { type: 'button', class: 'cmp' });
      ctx.stage.append(msg, h('div', { class: 'cmp-row' }, L, R));
      ctx.hud({ score: 0 });
      const timer = ctx.timer(45, finish);

      function nextQ() {
        cur = makePair(lvl);
        [L, R].forEach((b, i) => {
          b.className = 'cmp';
          b.innerHTML = '';
          b.append(h('div', { text: cur[i].t }));
        });
        locked = false;
      }
      function choose(i) {
        if (locked) return;
        locked = true;
        const btns = [L, R];
        btns.forEach((b, j) => { if (cur[j].t !== String(cur[j].v)) b.append(h('div', { class: 'cmp-v', text: '= ' + cur[j].v })); });
        if (cur[i].v > cur[1 - i].v) {
          right++;
          streak++;
          const pts = 10 + lvl * 2 + Math.min(streak, 5) * 2;
          score += pts;
          ctx.hud({ score });
          btns[i].classList.add('right');
          ctx.good(btns[i], '+' + pts);
          ctx.clock.after(420, nextQ);
        } else {
          wrong++;
          streak = 0;
          timer.add(-2000);
          btns[i].classList.add('wrong');
          ctx.bad(btns[i], '−2 с');
          ctx.clock.after(950, nextQ);
        }
      }
      ctx.tap(L, () => choose(0));
      ctx.tap(R, () => choose(1));
      nextQ();

      function finish() {
        const acc = right / Math.max(1, right + wrong);
        const nl = acc >= 0.9 && right >= 20 ? lvl + 1 : acc < 0.75 ? lvl - 1 : lvl;
        ctx.end({
          score, accuracy: acc, nextLevel: BT.clamp(nl, 1, 8),
          stats: [['Верно', right], ['Ошибки', wrong], ['Уровень', lvl]],
          details: { right, wrong },
        });
      }
    },
  });

  // ------------------------------------------------------------------ Числовой ряд
  // [минимальный уровень, генератор 6 чисел]
  const SERIES = [
    [1, () => { const a = r(1, 20), d = r(2, 9); return seq(6, (i) => a + d * i); }],
    [1, () => { const a = r(60, 120), d = r(2, 9); return seq(6, (i) => a - d * i); }],
    [1, () => { const a = r(1, 5), k = pick([2, 3]); return seq(6, (i) => a * Math.pow(k, i)); }],
    [2, () => { const a = r(10, 30), p = r(3, 9), m = r(1, p - 1); return seq(6, (i) => a + Math.ceil(i / 2) * p - Math.floor(i / 2) * m); }],
    [2, () => { const a = r(1, 10), d = r(1, 3); return seq(6, (i) => a + (d * i * (i + 1)) / 2); }],
    [3, () => { const s = r(1, 6); return seq(6, (i) => (s + i) * (s + i)); }],
    [3, () => { const out = [r(1, 5), r(1, 6)]; while (out.length < 6) out.push(out[out.length - 1] + out[out.length - 2]); return out; }],
    [4, () => { const a = r(1, 20), b = r(30, 60), d1 = r(2, 6), d2 = r(2, 6); return seq(6, (i) => (i % 2 === 0 ? a + (d1 * i) / 2 : b - (d2 * (i - 1)) / 2)); }],
    [4, () => { const k = pick([2, 3]), c = pick([1, 2, 3]), out = [r(1, 4)]; while (out.length < 6) out.push(out[out.length - 1] * k + c); return out; }],
    [5, () => { const P = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47], s = r(0, 6); return P.slice(s, s + 6); }],
    [5, () => { const p = r(2, 5), out = [r(1, 6)]; for (let i = 1; i < 6; i++) out.push(i % 2 ? out[i - 1] * 2 : out[i - 1] + p); return out; }],
    [5, () => { const a = r(1, 20); return seq(6, (i) => a + Math.pow(2, i) - 1); }],
    [6, () => { const s = r(1, 4); return seq(6, (i) => Math.pow(s + i, 3)); }],
    [6, () => { const s = r(1, 4); return seq(6, (i) => (s + i) * (s + i + 1)); }],
  ];
  function distractors(s) {
    const ans = s[5], d1 = s[5] - s[4], lin = s[4] + (s[4] - s[3]);
    const set = new Set();
    if (lin !== ans && lin >= 0) set.add(lin);
    const cand = [ans + d1, ans - Math.round(d1 / 2), ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, ans - 10, s[4] + d1 * 2, Math.round(ans * 1.5)];
    for (const v of BT.rand.shuffle(cand)) {
      if (set.size >= 3) break;
      if (v !== ans && v >= 0 && Number.isInteger(v)) set.add(v);
    }
    let k = 3;
    while (set.size < 3) {
      if (ans + k !== ans) set.add(ans + k);
      k++;
    }
    return Array.from(set).slice(0, 3);
  }

  BT.registerGame({
    id: 'series', cat: 'logic', icon: 'series',
    name: 'Числовой ряд', short: 'Найди закономерность',
    howto: [
      'Посмотрите на ряд чисел и найдите закономерность.',
      'Выберите число, которое идёт следующим.',
      '12 вопросов, на каждый — 20 секунд. Быстрый ответ даёт больше очков.',
    ],
    ref: 900, startLevel: 1, maxLevel: 6,
    run(ctx) {
      const h = ctx.h;
      const lvl = BT.clamp(ctx.level, 1, 6);
      const Q = 12, PER = 20;
      const pool = SERIES.map((s, i) => ({ min: s[0], gen: s[1], i })).filter((s) => s.min <= lvl);
      let qn = 0, score = 0, right = 0, lastIdx = -1, locked = false, timer = null, cur = null;
      const msg = h('div', { class: 'stage-msg' });
      const row = h('div', { class: 'series' });
      const opts = h('div', { class: 'choices' });
      ctx.stage.append(msg, row, opts);
      ctx.hud({ score: 0 });

      function nextQ() {
        if (qn >= Q) return finish();
        qn++;
        let p;
        do { p = pick(pool); } while (pool.length > 1 && p.i === lastIdx);
        lastIdx = p.i;
        const s = p.gen();
        cur = { ans: s[5] };
        msg.textContent = 'Вопрос ' + qn + ' из ' + Q + ': что дальше?';
        row.innerHTML = '';
        s.slice(0, 5).forEach((v) => row.append(h('span', { text: v })));
        cur.qEl = h('span', { class: 'q', text: '?' });
        row.append(cur.qEl);
        opts.innerHTML = '';
        BT.rand.shuffle([cur.ans].concat(distractors(s))).forEach((v) => {
          const b = h('button', { type: 'button', class: 'choice', text: v });
          b.dataset.v = v;
          ctx.tap(b, () => choose(v, b));
          opts.append(b);
        });
        ctx.hud({ progress: (qn - 1) / Q });
        locked = false;
        timer = ctx.timer(PER, timeout);
      }
      function reveal(picked) {
        cur.qEl.textContent = cur.ans;
        BT.$$('.choice', opts).forEach((b) => {
          if (Number(b.dataset.v) === cur.ans) b.classList.add('right');
          else if (b !== picked) b.classList.add('dim');
        });
      }
      function choose(v, b) {
        if (locked) return;
        locked = true;
        const left = timer.left();
        timer.stop();
        if (v === cur.ans) {
          right++;
          const pts = 50 + Math.round((50 * left) / (PER * 1000));
          score += pts;
          ctx.hud({ score });
          ctx.good(b, '+' + pts);
          reveal(b);
          ctx.clock.after(750, nextQ);
        } else {
          b.classList.add('wrong');
          ctx.bad(b);
          reveal(b);
          ctx.clock.after(1500, nextQ);
        }
      }
      function timeout() {
        if (locked) return;
        locked = true;
        ctx.bad();
        msg.textContent = 'Время вышло';
        reveal(null);
        ctx.clock.after(1500, nextQ);
      }
      nextQ();

      function finish() {
        const nl = right >= 10 ? lvl + 1 : right <= 6 ? lvl - 1 : lvl;
        ctx.end({
          score, accuracy: right / Q, nextLevel: BT.clamp(nl, 1, 6),
          stats: [['Верно', right + ' из ' + Q], ['Уровень', lvl], ['За ответ', right ? Math.round(score / right) : '—']],
          details: { right },
        });
      }
    },
  });
})();
