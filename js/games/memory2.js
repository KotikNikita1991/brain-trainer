// Память, часть 2: «Числа», «Слова», «N-назад», «Что изменилось», «Лица и имена».
(function () {
  'use strict';
  const BT = window.BT;
  const D = (BT.DATA = BT.DATA || {});
  const plural = BT.fmt.plural;
  const shuffle = BT.rand.shuffle;

  // ------------------------------------------------------------------ Числа
  BT.registerGame({
    id: 'digits', cat: 'memory', icon: 'digits',
    name: 'Числа', short: 'Запомни число и введи его',
    howto: [
      'На экране появляется число — запомните его.',
      'Число исчезает: наберите его на клавиатуре. В режиме «Задом наперёд» — в обратном порядке.',
      'Верно — цифр становится больше. 3 ошибки или 12 раундов — конец.',
    ],
    ref: 700, startLevel: 4, minLevel: 3, maxLevel: 14,
    options: [{ key: 'mode', label: 'Порядок', def: 'fwd', values: [{ id: 'fwd', name: 'Как показано' }, { id: 'back', name: 'Задом наперёд' }] }],
    run(ctx) {
      const h = ctx.h;
      const back = ctx.opts.mode === 'back';
      const ROUNDS = 12, LIVES = 3;
      let n = BT.clamp(ctx.level, 3, 14), lives = LIVES, round = 0, score = 0, maxSolved = 0, solved = 0;
      let target = '', input = '', phase = 'wait';
      const msg = h('div', { class: 'stage-msg strong' });
      const show = h('div', { class: 'digits-show' });
      const ans = h('div', { class: 'answer hidden' });
      const pad = h('div', { class: 'keypad hidden' });
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'].forEach((k) => {
        const b = h('button', { type: 'button', class: 'key' + (k === 'del' || k === 'ok' ? ' fn' : ''), html: k === 'del' ? BT.icon('backspace') : k === 'ok' ? 'Готово' : k });
        ctx.tap(b, () => press(k));
        pad.append(b);
      });
      ctx.stage.append(msg, show, ans, pad);
      ctx.hud({ score: 0, lives, maxLives: LIVES });

      async function next() {
        if (round >= ROUNDS || lives <= 0) return finish();
        round++;
        ctx.hud({ text: round + '/' + ROUNDS, progress: (round - 1) / ROUNDS });
        target = '';
        for (let i = 0; i < n; i++) target += String(i === 0 ? BT.rand.int(1, 9) : BT.rand.int(0, 9));
        input = '';
        phase = 'show';
        ans.classList.add('hidden');
        pad.classList.add('hidden');
        msg.textContent = 'Запомните ' + n + ' ' + plural(n, 'цифру', 'цифры', 'цифр');
        show.textContent = target.replace(/(\d{3})(?=\d)/g, '$1 ');
        show.classList.remove('hidden');
        await ctx.wait(900 + n * 450);
        show.classList.add('hidden');
        msg.textContent = back ? 'Введите задом наперёд' : 'Введите число';
        ans.className = 'answer';
        ans.textContent = ' ';
        pad.classList.remove('hidden');
        phase = 'input';
      }
      function press(k) {
        if (phase !== 'input') return;
        if (k === 'ok') return check();
        BT.sound.tap();
        BT.haptic();
        if (k === 'del') input = input.slice(0, -1);
        else if (input.length < n) input += k;
        ans.textContent = input || ' ';
        if (input.length === n) check();
      }
      function check() {
        phase = 'wait';
        const want = back ? target.split('').reverse().join('') : target;
        if (input === want) {
          const pts = Math.round(n * 10 * (back ? 1.5 : 1));
          score += pts;
          solved++;
          maxSolved = Math.max(maxSolved, n);
          ans.classList.add('ok');
          ctx.hud({ score });
          ctx.good(ans, '+' + pts);
          n = Math.min(14, n + 1);
          ctx.clock.after(700, next);
        } else {
          lives--;
          ans.classList.add('err');
          ans.textContent = want;
          ctx.hud({ lives, maxLives: LIVES });
          ctx.bad();
          msg.textContent = 'Правильно было: ' + want;
          n = Math.max(3, n - 1);
          ctx.clock.after(1600, next);
        }
      }
      function finish() {
        ctx.end({
          score, accuracy: solved / Math.max(1, round), nextLevel: Math.max(3, (maxSolved || ctx.level) - 1),
          stats: [['Макс. цифр', maxSolved || '—'], ['Раундов', solved + ' из ' + round], ['Режим', back ? 'Наоборот' : 'Прямой']],
          details: { maxSolved, back },
        });
      }
      next();
    },
  });

  // ------------------------------------------------------------------ Слова
  BT.registerGame({
    id: 'wordlist', cat: 'memory', icon: 'wordlist',
    name: 'Слова', short: 'Запомни список слов',
    howto: [
      'Покажем список слов — запомните как можно больше.',
      'Затем среди похожего набора отметьте те, что были в списке, и нажмите «Готово».',
      '3 раунда. За лишние отметки очки снимаются.',
    ],
    ref: 600, startLevel: 6, minLevel: 4, maxLevel: 16,
    run(ctx) {
      const h = ctx.h;
      const dict = (D.words && (D.words.dict || D.words.nouns)) || [];
      const pool = dict.filter((w) => w.length >= 3 && w.length <= 8);
      const ROUNDS = 3;
      let n = BT.clamp(ctx.level, 4, 16), round = 0, score = 0, hitsAll = 0, shownAll = 0, falseAll = 0, maxOk = 0;
      let shown = [], picked = new Set(), phase = 'wait';
      const msg = h('div', { class: 'stage-msg strong' });
      const grid = h('div', { class: 'word-grid' });
      const doneBtn = h('button', { type: 'button', class: 'btn hidden', text: 'Готово' });
      ctx.stage.append(msg, grid, doneBtn);
      ctx.hud({ score: 0 });
      ctx.tap(doneBtn, () => { if (phase === 'recall') check(); });

      async function next() {
        if (round >= ROUNDS) return finish();
        round++;
        const sample = BT.rand.sample(pool, n * 2);
        shown = sample.slice(0, n);
        const all = shuffle(sample);
        picked = new Set();
        phase = 'show';
        doneBtn.classList.add('hidden');
        msg.textContent = 'Раунд ' + round + ': запомните ' + n + ' ' + plural(n, 'слово', 'слова', 'слов');
        grid.innerHTML = '';
        shown.forEach((w) => grid.append(h('div', { class: 'wchip show', text: w })));
        const ms = 2500 + n * 1300;
        const t = ctx.timer(ms / 1000, () => {});
        await ctx.wait(ms);
        t.stop();
        phase = 'recall';
        msg.textContent = 'Отметьте слова из списка (' + n + ')';
        grid.innerHTML = '';
        all.forEach((w) => {
          const c = h('button', { type: 'button', class: 'wchip', text: w });
          ctx.tap(c, () => {
            if (phase !== 'recall') return;
            if (picked.has(w)) picked.delete(w);
            else picked.add(w);
            c.classList.toggle('on', picked.has(w));
            BT.haptic();
          });
          grid.append(c);
        });
        ctx.hud({ text: '', progress: (round - 1) / ROUNDS });
        doneBtn.classList.remove('hidden');
      }
      function check() {
        phase = 'wait';
        doneBtn.classList.add('hidden');
        const set = new Set(shown);
        let hits = 0, fa = 0;
        Array.from(grid.children).forEach((c) => {
          const w = c.textContent, was = set.has(w), on = picked.has(w);
          if (was && on) { hits++; c.classList.add('hit'); }
          else if (!was && on) { fa++; c.classList.add('miss'); }
          else if (was && !on) c.classList.add('missed');
          else c.classList.add('dim');
        });
        const pts = Math.max(0, hits * 20 - fa * 10);
        score += pts;
        hitsAll += hits;
        shownAll += n;
        falseAll += fa;
        ctx.hud({ score });
        (hits >= n - 1 && fa <= 1 ? ctx.good : ctx.bad)(grid, '+' + pts);
        msg.textContent = 'Вспомнили ' + hits + ' из ' + n + (fa ? ', лишних: ' + fa : '');
        if (hits >= n - 1 && fa <= 1) { maxOk = Math.max(maxOk, n); n = Math.min(16, n + 1); }
        else if (hits < n / 2) n = Math.max(4, n - 1);
        ctx.clock.after(2600, next);
      }
      function finish() {
        ctx.end({
          score, accuracy: hitsAll / Math.max(1, shownAll + falseAll), nextLevel: n,
          stats: [['Вспомнили', hitsAll + ' из ' + shownAll], ['Лишних', falseAll], ['Уровень', n]],
          details: { hitsAll, shownAll, falseAll },
        });
      }
      next();
    },
  });

  // ------------------------------------------------------------------ N-назад
  const LETTERS = ['К', 'Л', 'М', 'Н', 'Р', 'С', 'Т', 'Ф'];
  BT.registerGame({
    id: 'nback', cat: 'memory', icon: 'nback',
    name: 'N-назад', short: 'Рабочая память: совпало ли N шагов назад',
    howto: [
      'Клетки загораются по одной. Уровень N — на сколько шагов назад сравнивать.',
      'Жмите «Место», если клетка та же, что N шагов назад. В режиме «Место + буква» ещё и «Буква» — если совпала буква.',
      'Это классический тренажёр рабочей памяти (dual n-back). Ложные нажатия снижают счёт.',
    ],
    ref: 800, startLevel: 1, maxLevel: 6,
    options: [{ key: 'mode', label: 'Режим', def: 'single', values: [{ id: 'single', name: 'Только место' }, { id: 'dual', name: 'Место + буква' }] }],
    run(ctx) {
      const h = ctx.h;
      const N = BT.clamp(ctx.level, 1, 6), dual = ctx.opts.mode === 'dual';
      const T = 20 + N, STEP = 2500, SHOW = 650;
      const pos = [], let_ = [];
      for (let i = 0; i < T; i++) {
        const mp = i >= N && Math.random() < 0.3, ml = i >= N && Math.random() < 0.3;
        let p = mp ? pos[i - N] : BT.rand.int(0, 8);
        if (!mp && i >= N) while (p === pos[i - N]) p = BT.rand.int(0, 8);
        let l = ml ? let_[i - N] : BT.rand.pick(LETTERS);
        if (!ml && i >= N) while (l === let_[i - N]) l = BT.rand.pick(LETTERS);
        pos.push(p);
        let_.push(l);
      }
      let i = -1, score = 0, correct = 0, decisions = 0, fa = 0, pressP = false, pressL = false;
      const msg = h('div', { class: 'stage-msg strong', text: 'N = ' + N + ': сравнивайте с тем, что было ' + N + ' ' + plural(N, 'шаг', 'шага', 'шагов') + ' назад' });
      const board = h('div', { class: 'board', style: { gridTemplateColumns: 'repeat(3, 1fr)', width: 'min(76vw, 320px, 42vh)' } });
      const cells = Array.from({ length: 9 }, () => { const c = h('div', { class: 'cell nb' }); board.append(c); return c; });
      const bP = h('button', { type: 'button', class: 'btn nb-btn', text: 'Место' });
      const bL = h('button', { type: 'button', class: 'btn nb-btn' + (dual ? '' : ' hidden'), text: 'Буква' });
      ctx.stage.append(msg, board, h('div', { class: 'nb-btns' }, bP, bL));
      ctx.hud({ score: 0, progress: 0 });
      ctx.tap(bP, () => { if (i >= N && !pressP) { pressP = true; bP.classList.add('pressed'); BT.haptic(); } });
      ctx.tap(bL, () => { if (i >= N && !pressL) { pressL = true; bL.classList.add('pressed'); BT.haptic(); } });

      function judge() {
        if (i < N) return;
        const chans = [[pressP, pos[i] === pos[i - N], bP]];
        if (dual) chans.push([pressL, let_[i] === let_[i - N], bL]);
        chans.forEach(([pressed, match, btn]) => {
          decisions++;
          if (pressed === match) {
            correct++;
            if (match) {
              score += 10 * N;
              btn.classList.add('ok');
            }
          } else if (pressed) {
            fa++;
            score = Math.max(0, score - 5 * N);
            btn.classList.add('bad');
          } else {
            btn.classList.add('missedm');
          }
        });
        ctx.hud({ score });
      }
      function step() {
        judge();
        i++;
        if (i >= T) return finish();
        pressP = pressL = false;
        [bP, bL].forEach((b) => b.classList.remove('pressed', 'ok', 'bad', 'missedm'));
        const c = cells[pos[i]];
        c.textContent = dual ? let_[i] : '';
        c.classList.add('lit');
        BT.sound.note(pos[i]);
        ctx.clock.after(SHOW, () => { c.classList.remove('lit'); c.textContent = ''; });
        ctx.hud({ text: (i + 1) + '/' + T, progress: (i + 1) / T });
        ctx.clock.after(STEP, step);
      }
      function finish() {
        const acc = correct / Math.max(1, decisions);
        const nl = acc >= 0.8 ? N + 1 : acc < 0.6 ? N - 1 : N;
        ctx.end({
          score: Math.round(score * (dual ? 1.5 : 1)), accuracy: acc, nextLevel: BT.clamp(nl, 1, 6),
          stats: [['Точность', BT.fmt.pct(acc)], ['Ложных', fa], ['N', N + (dual ? ' · 2 канала' : '')]],
          details: { N, dual, acc: Math.round(acc * 100) },
        });
      }
      ctx.clock.after(600, step);
    },
  });

  // ------------------------------------------------------------------ Что изменилось
  const OBJ = ['🍎', '🍋', '🍇', '🍓', '🥕', '🌽', '🍄', '🌸', '🌻', '🌵', '🍀', '🐶', '🐱', '🦊', '🐻', '🐼', '🐸', '🐧', '🦉', '🐙', '🦋', '🐝', '🐢', '⚽', '🎲', '🎸', '🚀', '⭐', '🌙', '☀️', '⚡', '❄️', '🔥', '💎', '🎁', '🎈', '🔑', '⏰', '📚', '✏️', '🎩', '👓', '☂️', '🧲', '🔔', '🧩'];
  BT.registerGame({
    id: 'changes', cat: 'memory', icon: 'changes',
    name: 'Что изменилось', short: 'Найди, что поменялось',
    howto: [
      'Запомните предметы на поле.',
      'Поле на миг гаснет, а затем часть предметов заменяется другими.',
      'Нажмите все изменившиеся клетки. Ошибка завершает раунд. 8 раундов.',
    ],
    ref: 700, startLevel: 1, maxLevel: 10,
    run(ctx) {
      const h = ctx.h;
      const lvl = BT.clamp(ctx.level, 1, 10);
      const K = Math.min(16, lvl + 5), cols = K <= 6 ? 3 : 4, changesN = lvl >= 7 ? 3 : lvl >= 4 ? 2 : 1;
      const ROUNDS = 8;
      let round = 0, score = 0, perfect = 0, phase = 'wait';
      const msg = h('div', { class: 'stage-msg strong' });
      const board = h('div', { class: 'board', style: { gridTemplateColumns: 'repeat(' + cols + ', 1fr)', aspectRatio: cols + ' / ' + Math.ceil(K / cols), width: 'min(88vw, 400px)' } });
      ctx.stage.append(msg, board);
      ctx.hud({ score: 0, progress: 0 });

      async function next() {
        if (round >= ROUNDS) return finish();
        round++;
        ctx.hud({ text: round + '/' + ROUNDS, progress: (round - 1) / ROUNDS });
        const items = BT.rand.sample(OBJ, K + changesN);
        const before = items.slice(0, K), spare = items.slice(K);
        const changed = new Set(BT.rand.sample(before.map((x, j) => j), changesN));
        let found = 0;
        phase = 'show';
        msg.textContent = 'Запомните ' + K + ' ' + plural(K, 'предмет', 'предмета', 'предметов');
        board.innerHTML = '';
        const cells = before.map((e) => { const c = h('div', { class: 'cell emo', text: e }); board.append(c); return c; });
        await ctx.wait(1800 + K * 280);
        board.classList.add('blank');
        await ctx.wait(700);
        let s = 0;
        changed.forEach((j) => { cells[j].textContent = spare[s++]; });
        board.classList.remove('blank');
        phase = 'input';
        msg.textContent = 'Что изменилось? (' + changesN + ')';
        cells.forEach((c, j) => ctx.tap(c, () => {
          if (phase !== 'input' || c.classList.contains('hit')) return;
          if (changed.has(j)) {
            found++;
            c.classList.add('hit');
            BT.sound.note(found + 3);
            BT.haptic();
            if (found === changesN) {
              phase = 'wait';
              perfect++;
              const pts = 30 + K * 5 * changesN;
              score += pts;
              ctx.hud({ score });
              ctx.good(board, '+' + pts);
              msg.textContent = 'Верно!';
              ctx.clock.after(900, next);
            }
          } else {
            phase = 'wait';
            c.classList.add('miss');
            changed.forEach((x) => { if (!cells[x].classList.contains('hit')) cells[x].classList.add('ghost'); });
            ctx.bad();
            msg.textContent = 'Не то — изменились подсвеченные';
            ctx.clock.after(1700, next);
          }
        }));
      }
      function finish() {
        const nl = perfect >= 6 ? lvl + 1 : perfect <= 3 ? lvl - 1 : lvl;
        ctx.end({
          score, accuracy: perfect / ROUNDS, nextLevel: BT.clamp(nl, 1, 10),
          stats: [['Без ошибок', perfect + ' из ' + ROUNDS], ['Предметов', K], ['Изменений', changesN]],
          details: { perfect, K, changesN },
        });
      }
      next();
    },
  });

  // ------------------------------------------------------------------ Лица и имена
  const MEN = ['👨', '👨‍🦰', '👨‍🦱', '👨‍🦳', '👨‍🦲', '🧔', '👴', '👱‍♂️', '👲', '🧑‍🎓'];
  const WOMEN = ['👩', '👩‍🦰', '👩‍🦱', '👩‍🦳', '👱‍♀️', '👵', '🧕', '👩‍🎓', '👩‍🍳', '👸'];
  const MNAMES = ['Алексей', 'Андрей', 'Борис', 'Вадим', 'Глеб', 'Денис', 'Егор', 'Игорь', 'Кирилл', 'Леонид', 'Максим', 'Олег', 'Павел', 'Роман', 'Семён', 'Тимур', 'Фёдор', 'Юрий', 'Ярослав', 'Виктор'];
  const FNAMES = ['Анна', 'Вера', 'Галина', 'Дарья', 'Ева', 'Жанна', 'Зоя', 'Ирина', 'Ксения', 'Лариса', 'Марина', 'Нина', 'Ольга', 'Полина', 'Раиса', 'Софья', 'Тамара', 'Ульяна', 'Юлия', 'Яна'];
  const JOBS = ['врач', 'пилот', 'повар', 'учитель', 'юрист', 'дизайнер', 'инженер', 'художник', 'музыкант', 'фермер', 'журналист', 'архитектор'];
  BT.registerGame({
    id: 'faces', cat: 'memory', icon: 'faces',
    name: 'Лица и имена', short: 'Запомни, кого как зовут',
    howto: [
      'Вас знакомят с людьми — запомните имя каждого (на высоких уровнях — и профессию).',
      'Потом покажем лицо: выберите имя из вариантов.',
      'Полезный навык для жизни: запоминать имена новых знакомых.',
    ],
    ref: 450, startLevel: 3, minLevel: 3, maxLevel: 10,
    run(ctx) {
      const h = ctx.h;
      const L = BT.clamp(ctx.level, 3, 10), withJob = L >= 6;
      const nm = Math.ceil(L / 2), nf = L - nm;
      const people = shuffle(
        BT.rand.sample(MEN, nm).map((f, i) => ({ face: f, name: BT.rand.sample(MNAMES, nm)[i] }))
          .concat(BT.rand.sample(WOMEN, nf).map((f, i) => ({ face: f, name: BT.rand.sample(FNAMES, nf)[i] })))
      );
      // имена без повторов
      const used = new Set();
      people.forEach((p) => {
        const list = MEN.includes(p.face) ? MNAMES : FNAMES;
        while (used.has(p.name)) p.name = BT.rand.pick(list);
        used.add(p.name);
      });
      const jobs = BT.rand.sample(JOBS, L);
      people.forEach((p, i) => { p.job = jobs[i]; });
      const review = [];
      let k = -1, score = 0, right = 0, order = [], locked = true;
      const msg = h('div', { class: 'stage-msg strong' });
      const area = h('div', { class: 'faces-area' });
      const startBtn = h('button', { type: 'button', class: 'btn', text: 'Запомнил(а)!' });
      ctx.stage.append(msg, area, startBtn);
      ctx.hud({ score: 0 });

      msg.textContent = 'Знакомьтесь: ' + L + ' ' + plural(L, 'человек', 'человека', 'человек');
      people.forEach((p) => area.append(h('div', { class: 'face-card' }, h('div', { class: 'face', text: p.face }), h('div', { class: 'fname', text: p.name }), withJob ? h('div', { class: 'fjob', text: p.job }) : null)));
      const t = ctx.timer(Math.round(3 + L * (withJob ? 3.5 : 2.5)), () => begin());
      ctx.tap(startBtn, () => begin());

      let begun = false;
      function begin() {
        if (begun) return;
        begun = true;
        t.stop();
        startBtn.remove();
        const qs = [];
        people.forEach((p) => {
          qs.push({ p, kind: 'name' });
          if (withJob) qs.push({ p, kind: 'job' });
        });
        order = shuffle(qs);
        ctx.hud({ text: '' });
        next();
      }
      function next() {
        k++;
        if (k >= order.length) return finish();
        const { p, kind } = order[k];
        const answer = p[kind];
        const pool = people.map((x) => x[kind]).filter((x) => x !== answer);
        const extra = (kind === 'name' ? (MEN.includes(p.face) ? MNAMES : FNAMES) : JOBS).filter((x) => x !== answer && !pool.includes(x));
        const opts = shuffle([answer].concat(BT.rand.sample(pool.length >= 3 ? pool : pool.concat(BT.rand.sample(extra, 3 - pool.length)), 3)));
        msg.textContent = (kind === 'name' ? 'Как зовут?' : 'Кем работает ' + p.name + '?') + ' · ' + (k + 1) + ' из ' + order.length;
        area.innerHTML = '';
        area.append(h('div', { class: 'face-big', text: p.face }));
        const grid = h('div', { class: 'choices' });
        opts.forEach((v) => {
          const b = h('button', { type: 'button', class: 'choice txt', text: v });
          ctx.tap(b, () => choose(v, b, answer, p, kind, grid));
          grid.append(b);
        });
        area.append(grid);
        ctx.hud({ progress: k / order.length });
        locked = false;
      }
      function choose(v, b, answer, p, kind, grid) {
        if (locked) return;
        locked = true;
        const ok = v === answer;
        Array.from(grid.children).forEach((x) => { if (x.textContent === answer) x.classList.add('right'); else if (x !== b) x.classList.add('dim'); });
        if (ok) {
          right++;
          score += 50;
          ctx.hud({ score });
          ctx.good(b, '+50');
        } else {
          b.classList.add('wrong');
          ctx.bad(b);
        }
        review.push({ q: p.face + ' — ' + (kind === 'name' ? 'имя' : 'профессия'), your: v, right: answer, ok });
        ctx.clock.after(ok ? 700 : 1500, next);
      }
      function finish() {
        const acc = right / Math.max(1, order.length);
        const nl = acc === 1 ? L + 1 : acc <= 0.5 ? L - 1 : L;
        ctx.end({
          score, accuracy: acc, nextLevel: BT.clamp(nl, 3, 10), review, reviewTitle: 'Кого как звали',
          stats: [['Верно', right + ' из ' + order.length], ['Людей', L], ['Точность', BT.fmt.pct(acc)]],
          details: { L, right },
        });
      }
    },
  });
})();
