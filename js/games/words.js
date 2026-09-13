// Эрудиция и слова: «Викторина», «Флаги и столицы», «Анаграммы», «Правописание», «Ударения».
(function () {
  'use strict';
  const BT = window.BT;
  const D = (BT.DATA = BT.DATA || {});
  const pick = BT.rand.pick, shuffle = BT.rand.shuffle;

  const TOPICS = [
    { id: 'all', name: 'Все темы' },
    { id: 'general', name: 'Общие знания' },
    { id: 'nature', name: 'Природа' },
    { id: 'sport', name: 'Спорт' },
    { id: 'geo', name: 'География' },
    { id: 'science', name: 'Наука' },
    { id: 'history', name: 'История' },
    { id: 'lit', name: 'Литература' },
    { id: 'art', name: 'Искусство' },
    { id: 'lang', name: 'Язык' },
    { id: 'dates', name: 'Даты' },
  ];
  // Вес тем в режиме «Все темы»: упор на общие знания, даты — изредка.
  const MIX = { general: 3, nature: 2, sport: 2, geo: 2, science: 2, history: 1.5, lit: 1.5, art: 1.5, lang: 1.5, dates: 0.4 };
  function weightedTopic(topics) {
    const total = topics.reduce((s, t) => s + (MIX[t] || 1), 0);
    let x = Math.random() * total;
    for (const t of topics) {
      x -= MIX[t] || 1;
      if (x <= 0) return t;
    }
    return topics[topics.length - 1];
  }
  const topicName = (id) => (TOPICS.find((t) => t.id === id) || TOPICS[0]).name;

  // n различных значений из колонки ai (кроме правильного); filter — предпочтительный круг (например, тот же континент).
  function distinct(rows, i, ai, n, filter) {
    const right = rows[i][ai];
    let pool = rows.filter((x, j) => j !== i && x[ai] !== right && (!filter || filter(x)));
    if (pool.length < n) pool = rows.filter((x, j) => j !== i && x[ai] !== right);
    const out = [], seen = new Set([right]);
    for (const x of shuffle(pool)) {
      if (!seen.has(x[ai])) {
        seen.add(x[ai]);
        out.push(x[ai]);
        if (out.length === n) break;
      }
    }
    return out;
  }

  function yearsNear(y) {
    const out = [];
    for (const o of shuffle([-30, -20, -12, -10, -7, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 7, 10, 12, 20, 30])) {
      const v = y + o;
      if (v > 0 && v <= 2025) out.push(String(v));
      if (out.length === 3) break;
    }
    return out;
  }

  // ---------- Банк вопросов: ручные + сгенерированные из справочных таблиц ----------
  let bank = null;
  function fromTable(key, topic, rows, qf, ai, sameCol) {
    rows.forEach((row, i) => bank.push({
      id: key + ':' + i, topic, q: qf(row), a: row[ai],
      wrong: () => distinct(rows, i, ai, 3, sameCol != null ? (x) => x[sameCol] === row[sameCol] : null),
    }));
  }
  function buildBank() {
    bank = [];
    (D.quiz || []).forEach((x, i) => bank.push({ id: 'q:' + i, topic: x[0] === 'misc' ? 'general' : x[0], q: x[1], a: x[2], wrong: () => x.slice(3, 6) }));
    const S = D.sets || {};
    if (S.countries) {
      fromTable('cap', 'geo', S.countries, (r) => 'Столица страны ' + r[0] + '?', 1, 3);
      fromTable('capr', 'geo', S.countries, (r) => r[1] + ' — столица какой страны?', 0, 3);
    }
    if (S.books) fromTable('book', 'lit', S.books, (r) => 'Кто автор произведения «' + r[0] + '»?', 1);
    if (S.paintings) fromTable('paint', 'art', S.paintings, (r) => 'Кто автор картины «' + r[0] + '»?', 1);
    if (S.music) fromTable('mus', 'art', S.music, (r) => 'Кто композитор: «' + r[0] + '»?', 1);
    if (S.elements) {
      fromTable('el', 'science', S.elements, (r) => 'Химический символ элемента «' + r[0] + '»?', 1);
      fromTable('elr', 'science', S.elements, (r) => 'Какой химический элемент обозначается символом ' + r[1] + '?', 0);
    }
    if (S.inventions) fromTable('inv', 'science', S.inventions, (r) => 'Кто ' + r[0] + '?', 1);
    if (S.vocab) fromTable('voc', 'lang', S.vocab, (r) => 'Что означает слово «' + r[0] + '»?', 1);
    if (S.idioms) fromTable('idi', 'lang', S.idioms, (r) => 'Что значит выражение «' + r[0] + '»?', 1);
    if (S.myth) fromTable('myth', 'lit', S.myth, (r) => r[0] + ' — кто это?', 1);
    if (S.dates) S.dates.forEach((r, i) => bank.push({ id: 'date:' + i, topic: 'dates', q: 'В каком году ' + r[0] + '?', a: String(r[1]), wrong: () => yearsNear(r[1]) }));
  }
  BT.quizBankSize = () => {
    if (!bank) buildBank();
    return bank.length;
  };

  // Сначала вопросы, которых этот игрок ещё не видел; темы — вперемешку и поровну.
  function pickQuestions(pid, topic, n) {
    if (!bank) buildBank();
    const seen = BT.store.seen(pid, 'quiz');
    const topics = topic === 'all' ? TOPICS.slice(1).map((t) => t.id) : [topic];
    const byTopic = {};
    topics.forEach((t) => {
      const all = bank.filter((x) => x.topic === t);
      let fresh = all.filter((x) => !seen.has(x.id));
      if (fresh.length < n) fresh = all;
      byTopic[t] = shuffle(fresh);
    });
    const out = [];
    for (let guard = 0; out.length < n && guard < 500; guard++) {
      const q = byTopic[topic === 'all' ? weightedTopic(topics) : topics[0]].pop();
      if (q) out.push(q);
    }
    return out;
  }

  // Выбор ещё не показанных элементов для словесных игр.
  function freshPicker(pid, key, items, idOf) {
    const seen = BT.store.seen(pid, key);
    let pool = items.filter((x) => !seen.has(idOf(x)));
    if (pool.length < 30) {
      BT.store.resetSeen(pid, key);
      pool = items.slice();
    }
    pool = shuffle(pool);
    const used = [];
    return {
      next() {
        const x = pool.pop();
        if (x !== undefined) used.push(idOf(x));
        return x;
      },
      save: () => BT.store.markSeen(pid, key, used),
    };
  }

  // ---------- Общий «блиц»: вопрос + варианты, таймер, штраф за ошибку ----------
  function runBlitz(ctx, o) {
    const h = ctx.h;
    let score = 0, streak = 0, best = 0, right = 0, wrong = 0, locked = false, cur = null;
    const review = [];
    const top = h('div', { class: 'stage-msg strong', text: o.title || '' });
    const qBox = h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } });
    const list = h('div', { class: o.listClass });
    if (o.title) ctx.stage.append(top);
    ctx.stage.append(qBox, list);
    ctx.hud({ score: 0 });
    const timer = ctx.timer(o.seconds, finish);

    function next() {
      const item = (cur = o.next());
      if (!item) return finish();
      qBox.innerHTML = '';
      if (item.q) qBox.append(item.q);
      list.innerHTML = '';
      item.options.forEach((op) => {
        const b = h('button', { type: 'button', class: o.btnClass, html: op.html });
        b._ok = op.ok;
        ctx.tap(b, () => choose(b));
        list.append(b);
      });
      locked = false;
    }
    function choose(b) {
      if (locked) return;
      locked = true;
      review.push({ q: cur.qText || '', your: b.textContent, right: cur.rightText || '', ok: !!b._ok });
      if (b._ok) {
        right++;
        streak++;
        best = Math.max(best, streak);
        const pts = 10 + Math.min(streak, 10) * 2;
        score += pts;
        ctx.hud({ score });
        b.classList.add('right');
        ctx.good(b, '+' + pts);
        ctx.clock.after(450, next);
      } else {
        wrong++;
        streak = 0;
        timer.add(-3000);
        b.classList.add('wrong');
        Array.from(list.children).forEach((x) => { if (x._ok) x.classList.add('right'); });
        ctx.bad(b, '−3 с');
        ctx.clock.after(1300, next);
      }
    }
    function finish() {
      if (!ctx.alive) return;
      if (o.onEnd) o.onEnd();
      ctx.end({
        score, accuracy: right / Math.max(1, right + wrong),
        stats: [['Верно', right], ['Ошибки', wrong], ['Лучшая серия', best]],
        review: review.slice(-40),
        details: { right, wrong, best },
      });
    }
    next();
  }

  // ------------------------------------------------------------------ Викторина
  BT.registerGame({
    id: 'quiz', cat: 'words', icon: 'quiz',
    name: 'Викторина', short: 'Более тысячи вопросов на эрудицию',
    howto: [
      '10 вопросов, на каждый — 15 секунд и 4 варианта ответа.',
      'Быстрый верный ответ приносит больше очков.',
      'Сначала выпадают вопросы, которых вы ещё не видели. Можно выбрать тему.',
    ],
    ref: 800, levels: false,
    options: [{ key: 'topic', label: 'Тема', def: 'all', values: TOPICS }],
    run(ctx) {
      const h = ctx.h;
      const topic = ctx.opts.topic || 'all';
      const qs = pickQuestions(ctx.me.id, topic, 10);
      const N = qs.length, PER = 15;
      let i = -1, score = 0, right = 0, locked = false, timer = null, spent = 0;
      const review = [];
      const chip = h('div', { class: 'quiz-topic' });
      const qEl = h('div', { class: 'quiz-q' });
      const list = h('div', { class: 'opts' });
      ctx.stage.append(chip, qEl, list);
      ctx.hud({ score: 0 });

      function next() {
        i++;
        if (i >= N) return finish();
        const x = qs[i];
        chip.textContent = topicName(x.topic) + ' · ' + (i + 1) + ' из ' + N;
        qEl.textContent = x.q;
        list.innerHTML = '';
        shuffle([x.a].concat(x.wrong().slice(0, 3))).forEach((v) => {
          const b = h('button', { type: 'button', class: 'opt', text: v });
          b._ok = v === x.a;
          ctx.tap(b, () => choose(b));
          list.append(b);
        });
        locked = false;
        timer = ctx.timer(PER, timeout);
      }
      function reveal(picked) {
        Array.from(list.children).forEach((b) => {
          if (b._ok) b.classList.add('right');
          else if (b !== picked) b.classList.add('dim');
        });
      }
      function choose(b) {
        if (locked) return;
        locked = true;
        const left = timer.left();
        timer.stop();
        spent += PER * 1000 - left;
        review.push({ q: qs[i].q, your: b.textContent, right: qs[i].a, ok: !!b._ok });
        if (b._ok) {
          right++;
          const pts = 60 + Math.round((40 * left) / (PER * 1000));
          score += pts;
          ctx.hud({ score });
          ctx.good(b, '+' + pts);
          reveal(b);
          ctx.clock.after(850, next);
        } else {
          b.classList.add('wrong');
          ctx.bad(b);
          reveal(b);
          ctx.clock.after(1800, next);
        }
      }
      function timeout() {
        if (locked) return;
        locked = true;
        spent += PER * 1000;
        review.push({ q: qs[i].q, your: 'время вышло', right: qs[i].a, ok: false });
        ctx.bad();
        reveal(null);
        ctx.clock.after(1800, next);
      }
      function finish() {
        BT.store.markSeen(ctx.me.id, 'quiz', qs.map((x) => x.id));
        ctx.end({
          score, accuracy: N ? right / N : 0,
          stats: [['Верно', right + ' из ' + N], ['Тема', topicName(topic)], ['Ср. время', (spent / Math.max(1, N) / 1000).toFixed(1).replace('.', ',') + ' с']],
          review, details: { right, topic },
        });
      }
      next();
    },
  });

  // ------------------------------------------------------------------ Флаги и столицы
  BT.registerGame({
    id: 'flags', cat: 'words', icon: 'flag',
    name: 'Флаги и столицы', short: 'Страны мира на скорость',
    howto: [
      'Угадайте страну по флагу, столицу по стране или страну по столице.',
      'Варианты — соседи по континенту, так что будьте внимательны.',
      '60 секунд. Ошибка отнимает 3 секунды, серия верных даёт бонус.',
    ],
    ref: 750, levels: false,
    options: [{
      key: 'mode', label: 'Режим', def: 'mix',
      values: [{ id: 'mix', name: 'Всё вперемешку' }, { id: 'flag', name: 'Только флаги' }, { id: 'cap', name: 'Только столицы' }],
    }],
    run(ctx) {
      const h = ctx.h;
      const C = (D.sets && D.sets.countries) || [];
      const mode = ctx.opts.mode || 'mix';
      const recent = [];
      runBlitz(ctx, {
        seconds: 60, listClass: 'opts', btnClass: 'opt',
        next() {
          let i;
          do { i = BT.rand.int(0, C.length - 1); } while (recent.includes(i));
          recent.push(i);
          if (recent.length > 25) recent.shift();
          const row = C[i];
          const type = mode === 'flag' ? 'flag' : mode === 'cap' ? pick(['cap', 'capr']) : pick(['flag', 'flag', 'cap', 'capr']);
          let q, ai;
          if (type === 'flag') {
            q = h('div', { style: { textAlign: 'center' } }, h('div', { class: 'flag-big', text: row[2] }), h('div', { class: 'quiz-q', text: 'Чей это флаг?' }));
            ai = 0;
          } else if (type === 'cap') {
            q = h('div', { class: 'quiz-q', text: 'Столица страны ' + row[0] + '?' });
            ai = 1;
          } else {
            q = h('div', { class: 'quiz-q', text: row[1] + ' — столица какой страны?' });
            ai = 0;
          }
          const wrong = distinct(C, i, ai, 3, (x) => x[3] === row[3]);
          const qText = type === 'flag' ? 'Чей это флаг? ' + row[2] : type === 'cap' ? 'Столица страны ' + row[0] + '?' : row[1] + ' — столица какой страны?';
          return { q, qText, rightText: row[ai], options: shuffle([{ html: BT.esc(row[ai]), ok: true }].concat(wrong.map((w) => ({ html: BT.esc(w), ok: false })))) };
        },
      });
    },
  });

  // ------------------------------------------------------------------ Анаграммы
  const ANA_LEN = [null, [4, 5], [5, 6], [6, 7], [7, 8], [8, 11]];
  BT.registerGame({
    id: 'anagram', cat: 'words', icon: 'anagram',
    name: 'Анаграммы', short: 'Собери слово из букв',
    howto: [
      'Буквы слова перемешаны — соберите слово.',
      'Нажимайте буквы по порядку. Нажмите на поставленную букву, чтобы вернуть её.',
      '90 секунд. Засчитывается любое настоящее слово из этих букв. Чем длиннее слово, тем больше очков.',
    ],
    ref: 600, startLevel: 1, maxLevel: 5,
    run(ctx) {
      const h = ctx.h;
      const lvl = BT.clamp(ctx.level, 1, 5);
      const all = (D.words && D.words.nouns) || [];
      const dict = new Set(all);
      const [lo, hi] = ANA_LEN[lvl];
      const fp = freshPicker(ctx.me.id, 'anagram', all.filter((w) => w.length >= lo && w.length <= hi), (w) => w);
      let score = 0, right = 0, skipped = 0, word = '', tiles = [], placed = [], locked = true;
      const msg = h('div', { class: 'stage-msg', text: 'Соберите слово' });
      const slots = h('div', { class: 'slots' });
      const letters = h('div', { class: 'letters' });
      const clearBtn = h('button', { type: 'button', class: 'btn secondary', text: 'Стереть' });
      const skipBtn = h('button', { type: 'button', class: 'btn secondary', text: 'Пропустить' });
      ctx.stage.append(msg, slots, letters, h('div', { class: 'row-btns' }, clearBtn, skipBtn));
      ctx.hud({ score: 0 });
      ctx.tap(clearBtn, () => { if (!locked) { placed = []; draw(); } });
      ctx.tap(skipBtn, skip);
      ctx.timer(90, finish);

      function next() {
        word = fp.next();
        if (!word) return finish();
        let sh, guard = 0;
        do { sh = shuffle(Array.from(word)); } while (guard++ < 30 && dict.has(sh.join('')));
        tiles = sh;
        placed = [];
        letters.innerHTML = '';
        tiles.forEach((ch, i) => {
          const b = h('button', { type: 'button', class: 'letter', text: ch });
          ctx.tap(b, () => put(i));
          letters.append(b);
        });
        msg.textContent = 'Соберите слово · ' + word.length + ' ' + BT.fmt.plural(word.length, 'буква', 'буквы', 'букв');
        locked = false;
        draw();
      }
      function draw() {
        slots.className = 'slots';
        slots.innerHTML = '';
        const small = word.length > 8;
        for (let k = 0; k < word.length; k++) {
          const s = h('div', { class: 'slot' + (placed[k] != null ? ' full' : ''), text: placed[k] != null ? tiles[placed[k]] : '', style: small ? { width: '31px', fontSize: '23px' } : null });
          ctx.tap(s, () => unput(k));
          slots.append(s);
        }
        Array.from(letters.children).forEach((b, i) => b.classList.toggle('used', placed.includes(i)));
      }
      function put(i) {
        if (locked || placed.includes(i)) return;
        placed.push(i);
        BT.sound.tap();
        BT.haptic();
        draw();
        if (placed.length === word.length) check();
      }
      function unput(k) {
        if (locked || placed[k] == null) return;
        placed.splice(k, 1);
        BT.haptic();
        draw();
      }
      function check() {
        const w = placed.map((i) => tiles[i]).join('');
        locked = true;
        if (w === word || dict.has(w)) {
          right++;
          const pts = word.length * 10;
          score += pts;
          ctx.hud({ score });
          slots.classList.add('ok');
          ctx.good(slots, '+' + pts);
          if (w !== word) msg.textContent = 'Верно! Загадано было «' + word + '»';
          ctx.clock.after(w === word ? 650 : 1300, next);
        } else {
          slots.classList.add('err');
          ctx.bad();
          ctx.clock.after(550, () => { placed = []; locked = false; draw(); });
        }
      }
      function skip() {
        if (locked) return;
        locked = true;
        skipped++;
        slots.innerHTML = '';
        Array.from(word).forEach((ch) => slots.append(h('div', { class: 'slot full', text: ch, style: word.length > 8 ? { width: '31px', fontSize: '23px' } : null })));
        msg.textContent = 'Это было слово «' + word + '»';
        ctx.clock.after(1400, next);
      }
      function finish() {
        if (!ctx.alive) return;
        fp.save();
        const nl = right >= 8 && right > skipped * 2 ? lvl + 1 : right <= 3 ? lvl - 1 : lvl;
        ctx.end({
          score, accuracy: right / Math.max(1, right + skipped), nextLevel: BT.clamp(nl, 1, 5),
          stats: [['Слов', right], ['Пропущено', skipped], ['Длина', lo + '–' + hi]],
          details: { right, skipped },
        });
      }
      next();
    },
  });

  // ------------------------------------------------------------------ Правописание
  BT.registerGame({
    id: 'spell', cat: 'words', icon: 'spell',
    name: 'Правописание', short: 'Как пишется правильно?',
    howto: [
      'Показаны два варианта написания слова — выберите правильный.',
      'Слова — из тех, где ошибаются чаще всего.',
      '60 секунд. Ошибка отнимает 3 секунды, серия верных даёт бонус.',
    ],
    ref: 750, levels: false,
    run(ctx) {
      const list = (D.words && D.words.spelling) || [];
      const fp = freshPicker(ctx.me.id, 'spell', list, (x) => x[0]);
      runBlitz(ctx, {
        title: 'Как пишется правильно?', seconds: 60, listClass: 'word-opts', btnClass: 'word-opt',
        next() {
          const x = fp.next();
          if (!x) return null;
          return { qText: x[0] + ' / ' + x[1], rightText: x[0], options: shuffle([{ html: BT.esc(x[0]), ok: true }, { html: BT.esc(x[1]), ok: false }]) };
        },
        onEnd: () => fp.save(),
      });
    },
  });

  // ------------------------------------------------------------------ Ударения
  const VOW = 'аеёиоуыэюя';
  const stressHtml = (w) => Array.from(w).map((ch) => (ch !== ch.toLowerCase() ? '<b>' + ch + '</b>' : ch)).join('');
  function stressVariant(w) {
    const letters = Array.from(w);
    const si = letters.findIndex((ch) => ch !== ch.toLowerCase());
    const base = letters.map((ch) => ch.toLowerCase().replace('ё', 'е'));
    const idx = base.map((ch, i) => (VOW.includes(ch) && i !== si ? i : -1)).filter((i) => i >= 0);
    if (!idx.length) return null;
    const j = pick(idx);
    return base.map((ch, i) => (i === j ? ch.toUpperCase() : ch)).join('');
  }
  BT.registerGame({
    id: 'stress', cat: 'words', icon: 'stress',
    name: 'Ударения', short: 'Где ставится ударение?',
    howto: [
      'Показаны два варианта ударения — ударная гласная выделена.',
      'Выберите правильный. Слова — из орфоэпического словаря ЕГЭ и частых ошибок.',
      '60 секунд. Ошибка отнимает 3 секунды, серия верных даёт бонус.',
    ],
    ref: 750, levels: false,
    run(ctx) {
      const list = (D.words && D.words.stress) || [];
      const fp = freshPicker(ctx.me.id, 'stress', list, (x) => x);
      runBlitz(ctx, {
        title: 'Где ударение?', seconds: 60, listClass: 'word-opts', btnClass: 'word-opt',
        next() {
          for (let guard = 0; guard < 20; guard++) {
            const x = fp.next();
            if (!x) return null;
            const v = stressVariant(x);
            if (v) return { qText: 'Ударение: ' + x.toLowerCase(), rightText: x, options: shuffle([{ html: stressHtml(x), ok: true }, { html: stressHtml(v), ok: false }]) };
          }
          return null;
        },
        onEnd: () => fp.save(),
      });
    },
  });
})();
