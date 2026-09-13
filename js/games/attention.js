// Игры на внимание и реакцию: «Шульте», «Струп», «Оттенок», «Реакция».
(function () {
  'use strict';
  const BT = window.BT;

  // ------------------------------------------------------------------ Шульте
  const SCH = [null, { n: 4 }, { n: 5 }, { n: 5, rot: true }, { n: 6 }, { n: 6, rot: true }];
  BT.registerGame({
    id: 'schulte', cat: 'attention', icon: 'schulte',
    name: 'Шульте', short: 'Найди числа по порядку',
    howto: [
      'На поле перемешаны числа.',
      'Нажимайте их по порядку — 1, 2, 3… — как можно быстрее.',
      'Ошибка добавляет 2 секунды. Совет: смотрите в центр и ищите боковым зрением.',
    ],
    ref: 1000, startLevel: 1, maxLevel: 5,
    run(ctx) {
      const h = ctx.h;
      const lvl = BT.clamp(ctx.level, 1, 5), cfg = SCH[lvl], n = cfg.n, total = n * n;
      let next = 1, penalty = 0, errors = 0;
      const targetNum = h('b', { text: '1' });
      const target = h('div', { class: 'target' }, 'Найдите', targetNum);
      const board = h('div', { class: 'board', style: { gridTemplateColumns: 'repeat(' + n + ', 1fr)', gap: n > 5 ? '6px' : '8px' } });
      const fs = n > 5 ? 'clamp(17px, 5.2vw, 24px)' : n > 4 ? 'clamp(20px, 6.5vw, 28px)' : 'clamp(24px, 8vw, 34px)';

      BT.rand.shuffle(Array.from({ length: total }, (_, i) => i + 1)).forEach((num) => {
        const span = h('span', { text: num });
        if (cfg.rot) {
          span.style.display = 'inline-block';
          span.style.transform = 'rotate(' + BT.rand.pick([0, 90, 180, 270, 45, -45, 135, -135]) + 'deg)';
          if (num === 6 || num === 9) span.style.textDecoration = 'underline';
        }
        const c = h('div', { class: 'cell card', style: { fontSize: fs } }, span);
        ctx.tap(c, () => {
          if (c.classList.contains('done')) return;
          if (num === next) {
            c.classList.add('done');
            BT.sound.note(Math.min(15, Math.floor(next / 2)));
            BT.haptic();
            next++;
            ctx.hud({ score: next - 1, progress: (next - 1) / total });
            if (next > total) return finish();
            targetNum.textContent = next;
          } else {
            errors++;
            penalty += 2000;
            ctx.bad(c, '+2 с');
            c.classList.remove('shake');
            void c.offsetWidth;
            c.classList.add('shake');
          }
        });
        board.append(c);
      });
      ctx.stage.append(target, board);
      ctx.hud({ score: 0, label: 'из ' + total, progress: 0 });
      const off = ctx.clock.onTick((now) => ctx.hud({ text: ((now + penalty) / 1000).toFixed(1).replace('.', ',') + ' с' }));

      function finish() {
        off();
        const ms = ctx.clock.now + penalty, sec = ms / 1000;
        const score = Math.round((total / sec) * 1000 * (total / 25));
        const spc = sec / total;
        const nl = spc <= 1.0 ? lvl + 1 : spc >= 1.8 ? lvl - 1 : lvl;
        ctx.end({
          score, accuracy: total / (total + errors), nextLevel: BT.clamp(nl, 1, 5),
          stats: [['Время', BT.fmt.sec(ms)], ['Ошибки', errors], ['Поле', n + '×' + n]],
          details: { ms: Math.round(ms), errors, n },
        });
      }
    },
  });

  // ------------------------------------------------------------------ Струп
  const COLORS = [
    { name: 'красный', word: 'КРАСНЫЙ', c: '#FF3B30' },
    { name: 'синий', word: 'СИНИЙ', c: '#007AFF' },
    { name: 'зелёный', word: 'ЗЕЛЁНЫЙ', c: '#28B14C' },
    { name: 'жёлтый', word: 'ЖЁЛТЫЙ', c: '#F2B705' },
  ];
  BT.registerGame({
    id: 'stroop', cat: 'attention', icon: 'stroop',
    name: 'Струп', short: 'Цвет или слово — не перепутай',
    howto: [
      'Слово написано цветом, который может не совпадать со смыслом.',
      'Обычно нужно выбрать ЦВЕТ БУКВ. На высоких уровнях иногда просят выбрать САМО СЛОВО — следите за подсказкой.',
      '45 секунд. Серия верных ответов даёт бонус.',
    ],
    ref: 1000, startLevel: 1, maxLevel: 5,
    run(ctx) {
      const h = ctx.h;
      const lvl = BT.clamp(ctx.level, 1, 5);
      const altP = [0, 0, 0.25, 0.4, 0.5, 0.5][lvl];
      let score = 0, combo = 0, maxCombo = 0, right = 0, wrong = 0, cur = null, locked = false;
      const rule = h('div', { class: 'stroop-rule' });
      const word = h('div', { class: 'stroop-word' });
      const btns = h('div', { class: 'choices' });
      COLORS.forEach((col, i) => {
        const b = h('button', { class: 'choice color-btn', type: 'button' }, h('i', { style: { '--sw': col.c } }), col.name);
        ctx.tap(b, () => answer(i, b));
        btns.append(b);
      });
      ctx.stage.append(rule, word, btns);
      ctx.hud({ score: 0 });

      function nextQ() {
        const alt = Math.random() < altP;
        const wi = BT.rand.int(0, 3);
        let ci = wi;
        if (Math.random() > 0.22) while (ci === wi) ci = BT.rand.int(0, 3);
        cur = { alt, ans: alt ? wi : ci };
        rule.textContent = alt ? 'Выберите СЛОВО' : 'Выберите ЦВЕТ букв';
        rule.classList.toggle('alt', alt);
        word.textContent = COLORS[wi].word;
        word.style.color = COLORS[ci].c;
        word.classList.remove('bump');
        void word.offsetWidth;
        word.classList.add('bump');
        locked = false;
      }
      function answer(i, b) {
        if (locked) return;
        if (i === cur.ans) {
          right++;
          combo++;
          maxCombo = Math.max(maxCombo, combo);
          const pts = 10 + Math.min(combo, 10) * 2 + (cur.alt ? 5 : 0);
          score += pts;
          ctx.hud({ score });
          ctx.good(b, '+' + pts);
          nextQ();
        } else {
          wrong++;
          combo = 0;
          locked = true;
          ctx.bad(b);
          b.classList.add('wrong');
          ctx.clock.after(380, () => {
            b.classList.remove('wrong');
            nextQ();
          });
        }
      }
      ctx.timer(45, finish);
      nextQ();

      function finish() {
        const acc = right / Math.max(1, right + wrong);
        const nl = acc >= 0.9 && right >= 25 ? lvl + 1 : acc < 0.75 ? lvl - 1 : lvl;
        ctx.end({
          score, accuracy: acc, nextLevel: BT.clamp(nl, 1, 5),
          stats: [['Верно', right], ['Ошибки', wrong], ['Лучшая серия', maxCombo]],
          details: { right, wrong, maxCombo },
        });
      }
    },
  });

  // ------------------------------------------------------------------ Оттенок
  BT.registerGame({
    id: 'hue', cat: 'attention', icon: 'hue',
    name: 'Оттенок', short: 'Найди клетку другого цвета',
    howto: [
      'Все клетки одного цвета, кроме одной — она чуть светлее или темнее.',
      'Найдите её. С каждым шагом клеток больше, а разница тоньше.',
      '45 секунд. Ошибка отнимает 3 секунды.',
    ],
    ref: 800, levels: false,
    run(ctx) {
      const h = ctx.h;
      let step = 0, score = 0, right = 0, wrong = 0, oddEl = null;
      const msg = h('div', { class: 'stage-msg', text: 'Найдите клетку другого оттенка' });
      const board = h('div', { class: 'board' });
      ctx.stage.append(msg, board);
      ctx.hud({ score: 0 });
      const timer = ctx.timer(45, finish);

      function nextStep() {
        step++;
        // OKLCH — перцептивно равномерная яркость: разница одинаково заметна для любого цвета.
        // Разница не меньше 5% — её видно на любом экране; дальше сложность растёт за счёт размера поля.
        const n = Math.min(7, 2 + Math.floor(step / 2));
        const delta = Math.max(0.05, 0.2 * Math.pow(0.9, step - 1));
        const hue = BT.rand.int(0, 359), chroma = 0.1 + Math.random() * 0.06, light = 0.6 + Math.random() * 0.14;
        const oddLight = light + (light > 0.67 ? -delta : delta);
        const odd = BT.rand.int(0, n * n - 1);
        board.style.gridTemplateColumns = 'repeat(' + n + ', 1fr)';
        board.style.gap = n >= 7 ? '4px' : n >= 5 ? '6px' : '8px';
        board.innerHTML = '';
        for (let i = 0; i < n * n; i++) {
          const c = h('div', {
            class: 'cell',
            style: { background: 'oklch(' + (i === odd ? oddLight : light).toFixed(3) + ' ' + chroma.toFixed(3) + ' ' + hue + ')', borderRadius: n >= 7 ? '8px' : '12px' },
          });
          ctx.tap(c, () => pick(i === odd, c));
          board.append(c);
          if (i === odd) oddEl = c;
        }
      }
      function pick(ok, c) {
        if (ok) {
          right++;
          const pts = 10 + step;
          score += pts;
          ctx.hud({ score });
          ctx.good(c, '+' + pts);
          nextStep();
        } else {
          wrong++;
          timer.add(-3000);
          ctx.bad(c, '−3 с');
          oddEl.classList.remove('bump');
          void oddEl.offsetWidth;
          oddEl.classList.add('bump');
        }
      }
      nextStep();

      function finish() {
        ctx.end({
          score, accuracy: right / Math.max(1, right + wrong),
          stats: [['Найдено', right], ['Ошибки', wrong], ['Этап', step]],
          details: { right, wrong, step },
        });
      }
    },
  });

  // ------------------------------------------------------------------ Реакция
  BT.registerGame({
    id: 'reaction', cat: 'attention', icon: 'reaction',
    name: 'Реакция', short: 'Жми, как только станет зелёным',
    howto: [
      'Поле серое — ждите. Как только оно станет зелёным, нажмите как можно быстрее.',
      'Нажали раньше — фальстарт, попытка повторится.',
      '5 попыток, считается среднее время.',
    ],
    ref: 800, levels: false,
    run(ctx) {
      const h = ctx.h;
      const TRIES = 5;
      let done = 0, early = 0, state = 'idle', t0 = 0, job = null;
      const times = [];
      const pad = h('div', { class: 'react' });
      const msg = h('div', { class: 'stage-msg', text: 'Нажмите, как только поле станет зелёным' });
      ctx.stage.append(msg, pad);
      ctx.hud({ score: 0, label: 'мс', text: '1/' + TRIES, progress: 0 });

      function setPad(cls, big, small) {
        pad.className = 'react' + (cls ? ' ' + cls : '');
        pad.innerHTML = '';
        pad.append(h('b', { text: big }), small ? h('span', { text: small }) : null);
      }
      function arm() {
        state = 'wait';
        setPad('', 'Ждите…', 'Не торопитесь');
        job = ctx.clock.after(BT.rand.int(1300, 3600), () => {
          state = 'go';
          setPad('go', 'Жмите!');
          t0 = performance.now();
        });
      }
      ctx.tap(pad, () => {
        if (state === 'wait') {
          ctx.clock.cancel(job);
          early++;
          state = 'pause';
          ctx.bad();
          setPad('early', 'Рано!', 'Дождитесь зелёного');
          ctx.clock.after(1200, arm);
        } else if (state === 'go') {
          const ms = Math.round(performance.now() - t0);
          state = 'pause';
          if (ms < 100) {
            // Быстрее 100 мс человек не реагирует — это угадывание, считаем фальстартом.
            early++;
            ctx.bad();
            setPad('early', 'Рано!', 'Реакция быстрее 0,1 с — это угадывание');
            ctx.clock.after(1200, arm);
            return;
          }
          if (ms > 1500) {
            setPad('early', 'Слишком долго', 'Попробуем ещё раз');
            ctx.clock.after(1100, arm);
            return;
          }
          times.push(ms);
          done++;
          ctx.good();
          pad.className = 'react show';
          pad.innerHTML = '';
          pad.append(h('div', { class: 'ms', text: ms }), h('span', { text: 'миллисекунд' }));
          ctx.hud({ score: Math.round(BT.avg(times)), text: Math.min(TRIES, done + 1) + '/' + TRIES, progress: done / TRIES });
          ctx.clock.after(done >= TRIES ? 1000 : 1100, done >= TRIES ? finish : arm);
        }
      });
      arm();

      function finish() {
        const avg = BT.avg(times), best = Math.min.apply(null, times);
        ctx.end({
          score: Math.round(200000 / avg), accuracy: TRIES / (TRIES + early),
          stats: [['Среднее', Math.round(avg) + ' мс'], ['Лучшее', best + ' мс'], ['Фальстарты', early]],
          details: { avg: Math.round(avg), best, early, times },
        });
      }
    },
  });
})();
