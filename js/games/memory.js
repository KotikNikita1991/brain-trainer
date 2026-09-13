// Игры на память: «Матрица», «Цепочка», «Пары».
(function () {
  'use strict';
  const BT = window.BT;
  const plural = BT.fmt.plural;
  const mmss = (ms) => {
    const s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };

  // ------------------------------------------------------------------ Матрица
  BT.registerGame({
    id: 'matrix', cat: 'memory', icon: 'matrix',
    name: 'Матрица', short: 'Запомни, какие клетки загорелись',
    howto: [
      'На мгновение загораются несколько клеток — запомните, какие.',
      'Клетки гаснут: нажмите все, что светились, в любом порядке.',
      'Без ошибок — клеток становится больше. 3 ошибки или 12 раундов — конец.',
    ],
    ref: 800, startLevel: 3, minLevel: 3, maxLevel: 16,
    run(ctx) {
      const h = ctx.h;
      const ROUNDS = 12, LIVES = 3;
      let tiles = Math.max(3, ctx.level);
      let lives = LIVES, round = 0, score = 0, solved = 0, maxSolved = 0, taps = 0, hits = 0;
      const msg = h('div', { class: 'stage-msg' });
      const board = h('div', { class: 'board' });
      ctx.stage.append(msg, board);
      ctx.hud({ score: 0, lives, maxLives: LIVES, progress: 0 });
      const gridSize = (t) => (t <= 3 ? 3 : t <= 5 ? 4 : t <= 8 ? 5 : t <= 12 ? 6 : 7);

      async function next() {
        if (!ctx.alive) return;
        if (round >= ROUNDS || lives <= 0) return finish();
        round++;
        ctx.hud({ text: round + '/' + ROUNDS, progress: (round - 1) / ROUNDS });
        const n = gridSize(tiles);
        board.style.gridTemplateColumns = 'repeat(' + n + ', 1fr)';
        board.style.gap = n >= 6 ? '6px' : '8px';
        board.innerHTML = '';
        const cells = [];
        for (let i = 0; i < n * n; i++) {
          const c = h('div', { class: 'cell' });
          cells.push(c);
          board.append(c);
        }
        const target = new Set(BT.rand.sample(Array.from({ length: n * n }, (_, i) => i), tiles));
        let phase = 'show', found = 0;
        msg.textContent = 'Запомните ' + tiles + ' ' + plural(tiles, 'клетку', 'клетки', 'клеток');
        msg.classList.add('strong');

        cells.forEach((c, i) => ctx.tap(c, () => {
          if (phase !== 'input' || c.dataset.done) return;
          c.dataset.done = '1';
          taps++;
          if (target.has(i)) {
            hits++;
            found++;
            c.classList.add('hit');
            BT.sound.note(found);
            BT.haptic();
            if (found === tiles) {
              phase = 'done';
              const pts = tiles * 10;
              score += pts;
              solved++;
              maxSolved = Math.max(maxSolved, tiles);
              ctx.hud({ score });
              ctx.good(board, '+' + pts);
              msg.textContent = 'Отлично!';
              tiles = Math.min(24, tiles + 1);
              ctx.clock.after(800, next);
            }
          } else {
            phase = 'done';
            c.classList.add('miss');
            lives--;
            ctx.hud({ lives, maxLives: LIVES });
            ctx.bad();
            target.forEach((j) => { if (!cells[j].classList.contains('hit')) cells[j].classList.add('ghost'); });
            msg.textContent = lives > 0 ? 'Мимо — вот где были клетки' : 'Попытки закончились';
            tiles = Math.max(3, tiles - 1);
            ctx.clock.after(1400, next);
          }
        }));

        await ctx.wait(500);
        target.forEach((i) => cells[i].classList.add('lit'));
        await ctx.wait(700 + tiles * 120);
        target.forEach((i) => cells[i].classList.remove('lit'));
        phase = 'input';
        msg.textContent = 'Нажмите светившиеся клетки';
        msg.classList.remove('strong');
      }

      function finish() {
        const acc = taps ? hits / taps : 0;
        ctx.hud({ progress: 1 });
        ctx.end({
          score, accuracy: acc,
          nextLevel: Math.max(3, (maxSolved || ctx.level) - 1),
          stats: [['Макс. клеток', maxSolved || '—'], ['Раундов', solved + ' из ' + round], ['Точность', BT.fmt.pct(acc)]],
          details: { maxSolved, solved, rounds: round },
        });
      }
      next();
    },
  });

  // ------------------------------------------------------------------ Цепочка
  const PADS = ['#FF375F', '#FF9F0A', '#FFD60A', '#30D158', '#64D2FF', '#0A84FF', '#5E5CE6', '#BF5AF2', '#FF6482'];
  BT.registerGame({
    id: 'sequence', cat: 'memory', icon: 'sequence',
    name: 'Цепочка', short: 'Повтори порядок вспышек',
    howto: [
      'Плитки вспыхивают по очереди — запомните порядок.',
      'Повторите последовательность теми же нажатиями.',
      'Каждый успех добавляет одну вспышку. 3 ошибки или 12 раундов — конец.',
    ],
    ref: 750, startLevel: 3, minLevel: 3, maxLevel: 14,
    run(ctx) {
      const h = ctx.h;
      const ROUNDS = 12, LIVES = 3;
      let len = Math.max(3, ctx.level);
      let lives = LIVES, round = 0, score = 0, solved = 0, maxSolved = 0, taps = 0, hits = 0;
      let seq = [], pos = 0, phase = 'wait';
      const msg = h('div', { class: 'stage-msg' });
      const board = h('div', { class: 'board', style: { gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', width: 'min(82vw, 360px, 50vh)' } });
      const pads = PADS.map((c) => {
        const el = h('div', { class: 'cell pad', style: { '--pad': c, borderRadius: '22px' } });
        board.append(el);
        return el;
      });
      ctx.stage.append(msg, board);
      ctx.hud({ score: 0, lives, maxLives: LIVES, progress: 0 });

      function flashPad(i, ms, silent) {
        const el = pads[i];
        el.classList.add('lit');
        if (!silent) BT.sound.note(i);
        ctx.clock.after(ms, () => el.classList.remove('lit'));
      }

      pads.forEach((el, i) => ctx.tap(el, () => {
        if (phase !== 'input') return;
        taps++;
        if (i === seq[pos]) {
          hits++;
          pos++;
          flashPad(i, 200);
          BT.haptic();
          if (pos === seq.length) {
            phase = 'wait';
            const pts = len * 10;
            score += pts;
            solved++;
            maxSolved = Math.max(maxSolved, len);
            ctx.hud({ score });
            ctx.good(board, '+' + pts);
            msg.textContent = 'Верно!';
            len = Math.min(20, len + 1);
            ctx.clock.after(850, next);
          }
        } else {
          phase = 'wait';
          lives--;
          ctx.hud({ lives, maxLives: LIVES });
          ctx.bad();
          el.classList.add('miss');
          ctx.clock.after(380, () => el.classList.remove('miss'));
          ctx.clock.after(450, () => flashPad(seq[pos], 550, true));
          msg.textContent = lives > 0 ? 'Не тот порядок — вот нужная плитка' : 'Попытки закончились';
          len = Math.max(3, len - 1);
          ctx.clock.after(1600, next);
        }
      }));

      async function next() {
        if (!ctx.alive) return;
        if (round >= ROUNDS || lives <= 0) return finish();
        round++;
        ctx.hud({ text: round + '/' + ROUNDS, progress: (round - 1) / ROUNDS });
        seq = [];
        while (seq.length < len) {
          const v = BT.rand.int(0, 8);
          if (v !== seq[seq.length - 1]) seq.push(v);
        }
        pos = 0;
        phase = 'show';
        msg.textContent = 'Смотрите: ' + len + ' ' + plural(len, 'вспышка', 'вспышки', 'вспышек');
        msg.classList.add('strong');
        await ctx.wait(650);
        const on = Math.max(280, 560 - len * 18), gap = Math.max(120, 230 - len * 6);
        for (const i of seq) {
          flashPad(i, on);
          await ctx.wait(on + gap);
        }
        phase = 'input';
        msg.textContent = 'Повторите';
        msg.classList.remove('strong');
      }

      function finish() {
        const acc = taps ? hits / taps : 0;
        ctx.hud({ progress: 1 });
        ctx.end({
          score, accuracy: acc,
          nextLevel: Math.max(3, (maxSolved || ctx.level) - 1),
          stats: [['Макс. длина', maxSolved || '—'], ['Раундов', solved + ' из ' + round], ['Точность', BT.fmt.pct(acc)]],
          details: { maxSolved, solved, rounds: round },
        });
      }
      next();
    },
  });

  // ------------------------------------------------------------------ Пары
  const EMO = ['🍎', '🍋', '🍇', '🍉', '🍓', '🍒', '🥝', '🍍', '🥥', '🥑', '🥕', '🌽', '🍄', '🌸', '🌻', '🌵', '🍀', '🐶', '🐱', '🦊',
    '🐻', '🐼', '🐨', '🐯', '🦁', '🐸', '🐵', '🐧', '🦉', '🐙', '🦋', '🐝', '🐢', '🐬', '🐳', '⚽', '🎲', '🎸', '🚀', '⭐',
    '🌙', '☀️', '⚡', '❄️', '🔥', '💎', '🎁', '🎈'];
  const PAIR_LEVELS = [null, [4, 3], [4, 4], [4, 5], [4, 6], [5, 6], [6, 6]];
  BT.registerGame({
    id: 'pairs', cat: 'memory', icon: 'pairs',
    name: 'Пары', short: 'Найди одинаковые карточки',
    howto: [
      'Переворачивайте карточки по две.',
      'Одинаковые остаются открытыми, разные закрываются.',
      'Чем меньше лишних ходов и быстрее — тем больше очков и выше уровень.',
    ],
    ref: 1000, startLevel: 1, maxLevel: 6,
    run(ctx) {
      const h = ctx.h;
      const lvl = BT.clamp(ctx.level, 1, 6);
      const [cols, rows] = PAIR_LEVELS[lvl];
      const pairs = (cols * rows) / 2;
      const symbols = BT.rand.sample(EMO, pairs);
      const deck = BT.rand.shuffle(symbols.concat(symbols));
      let first = null, pending = null, found = 0, moves = 0, lastSec = -1;

      const msg = h('div', { class: 'stage-msg', text: 'Найдите ' + pairs + ' ' + plural(pairs, 'пару', 'пары', 'пар') });
      const board = h('div', {
        class: 'board',
        style: {
          gridTemplateColumns: 'repeat(' + cols + ', 1fr)', aspectRatio: cols + ' / ' + rows, gap: '8px',
          width: 'min(90vw, ' + Math.round((440 * cols) / 5) + 'px, ' + Math.round((60 * cols) / rows) + 'vh)',
        },
      });
      deck.forEach((sym) => {
        const el = h('div', { class: 'fcard' }, h('div', { class: 'in' }, h('div', { class: 'b' }), h('div', { class: 'f', text: sym })));
        el.dataset.sym = sym;
        ctx.tap(el, () => flip(el));
        board.append(el);
      });
      ctx.stage.append(msg, board);
      ctx.hud({ score: 0, label: 'из ' + pairs, text: '0:00', progress: 0 });
      const off = ctx.clock.onTick((now) => {
        const s = Math.floor(now / 1000);
        if (s !== lastSec) {
          lastSec = s;
          ctx.hud({ text: mmss(now) });
        }
      });

      function closePending() {
        if (!pending) return;
        ctx.clock.cancel(pending.job);
        pending.a.classList.remove('open');
        pending.b.classList.remove('open');
        pending = null;
      }

      function flip(el) {
        if (el.classList.contains('open') || el.classList.contains('matched')) return;
        closePending();
        el.classList.add('open');
        BT.sound.tap();
        BT.haptic();
        if (!first) {
          first = el;
          return;
        }
        const a = first, b = el;
        first = null;
        moves++;
        if (a.dataset.sym === b.dataset.sym) {
          a.classList.add('matched');
          b.classList.add('matched');
          found++;
          ctx.hud({ score: found, progress: found / pairs });
          ctx.good();
          if (found === pairs) ctx.clock.after(650, finish);
        } else {
          pending = {
            a, b,
            job: ctx.clock.after(850, () => {
              a.classList.remove('open');
              b.classList.remove('open');
              pending = null;
            }),
          };
        }
      }

      function finish() {
        off();
        const ms = ctx.clock.now;
        const eff = pairs / moves;
        const spd = Math.min(1, (pairs * 2.2) / (ms / 1000));
        const score = Math.round(pairs * 100 * (0.35 + 0.65 * eff) * (0.7 + 0.3 * spd));
        const next = eff >= 0.6 ? lvl + 1 : eff < 0.4 ? lvl - 1 : lvl;
        ctx.end({
          score, accuracy: eff, nextLevel: BT.clamp(next, 1, 6),
          stats: [['Пар', pairs], ['Ходов', moves], ['Время', mmss(ms)]],
          details: { pairs, moves, ms: Math.round(ms) },
        });
      }
    },
  });
})();
