// Экраны: онбординг, «Игры», «Прогресс», «Настройки»; запуск игры и экран результата.
(function () {
  'use strict';
  const BT = window.BT;
  const CFG = window.BT_CONFIG;
  const h = BT.h;
  const app = document.getElementById('app');

  const TABS = [
    { id: 'games', name: 'Игры', icon: 'tabGames' },
    { id: 'progress', name: 'Прогресс', icon: 'tabProgress' },
    { id: 'settings', name: 'Настройки', icon: 'tabSettings' },
  ];
  const EMOJIS = ['🦊', '🦋', '🐱', '🐶', '🦉', '🐼', '🐨', '🦁', '🐯', '🐸', '🐙', '🦄', '🐝', '🐬', '🦜', '🐢', '🌸', '🌻', '🍀', '⭐', '🔥', '⚡', '🎯', '🚀'];
  const COLORS = ['#5E5CE6', '#FF375F', '#FF9F0A', '#30D158', '#0A84FF', '#BF5AF2', '#64D2FF', '#FFD60A'];

  let tab = 'games';
  let screenEl = null;
  let viewPid = null;
  let gameOpen = false;

  const isStandalone = () => window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const plural = BT.fmt.plural;

  function levelName(v) {
    if (v == null) return 'Сыграйте в любую игру, чтобы начать';
    if (v < 200) return 'Разминка — всё впереди';
    if (v < 400) return 'Хороший старт';
    if (v < 600) return 'Уверенный уровень';
    if (v < 800) return 'Сильный результат';
    return 'Уровень мастера';
  }

  // =====================================================================
  // Онбординг и профиль
  // =====================================================================
  function onboarding() {
    screenEl = null;
    app.innerHTML = '';
    const inner = h('div', { class: 'onboard' });
    app.append(h('div', { class: 'screen', style: { paddingBottom: '0', paddingTop: '0' } }, inner));

    function step1() {
      inner.innerHTML = '';
      inner.append(
        h('img', { class: 'logo', src: 'icons/icon-192.png', alt: '' }),
        h('h1', { text: 'Нейрон' }),
        h('p', { class: 'lead', text: 'Короткие игры для памяти, внимания, логики и эрудиции. Кто играет на этом телефоне?' }),
        h('div', { class: 'who' }, BT.store.profiles().map((p) =>
          h('button', { type: 'button', onclick: () => step2(p) },
            h('div', { class: 'avatar lg', style: { '--pc': p.color }, text: p.emoji }),
            h('div', { class: 'name', text: p.name })))),
        h('p', { class: 'lead', style: { fontSize: '13px', margin: '0' }, text: 'Второй профиль — для второго игрока на своём телефоне. Прогресс друг друга виден во вкладке «Прогресс».' })
      );
    }
    function step2(p) {
      BT.haptic();
      inner.innerHTML = '';
      inner.append(
        h('h1', { text: 'Ваш профиль' }),
        h('p', { class: 'lead', text: 'Имя и аватар увидит второй игрок' }),
        profileEditor(p, 'Начать', (patch) => {
          BT.store.updateProfile(p.id, patch);
          BT.settings.profile = p.id;
          BT.saveSettings();
          renderShell();
          BT.sync.run();
        }),
        h('button', { class: 'btn plain', text: 'Назад', onclick: step1 })
      );
    }
    step1();
    // Если сервер уже настроен — подтянем имена, которые задал второй игрок.
    if (BT.sync.enabled()) BT.sync.run().then(() => { if (!BT.store.me() && inner.querySelector('.who')) step1(); });
  }

  function profileEditor(p, label, onSave) {
    let emoji = p.emoji, color = p.color;
    const preview = h('div', { class: 'avatar lg', style: { '--pc': color, margin: '0 auto 18px' }, text: emoji });
    const input = h('input', {
      class: 'input', type: 'text', maxlength: '20', autocomplete: 'off', enterkeyhint: 'done',
      placeholder: 'Как вас зовут?', value: /^Игрок \d$/.test(p.name) ? '' : p.name,
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });

    const eg = h('div', { class: 'emoji-grid' });
    EMOJIS.forEach((e) => {
      const b = h('button', {
        type: 'button', class: e === emoji ? 'on' : '', text: e,
        onclick: () => {
          emoji = e;
          preview.textContent = e;
          BT.$$('button', eg).forEach((x) => x.classList.toggle('on', x === b));
          BT.haptic();
        },
      });
      eg.append(b);
    });
    const sw = h('div', { class: 'swatches' });
    COLORS.forEach((c) => {
      const b = h('button', {
        type: 'button', class: c === color ? 'on' : '', style: { '--sw': c }, 'aria-label': 'Цвет ' + c,
        onclick: () => {
          color = c;
          preview.style.setProperty('--pc', c);
          BT.$$('button', sw).forEach((x) => x.classList.toggle('on', x === b));
          BT.haptic();
        },
      });
      sw.append(b);
    });
    const save = h('button', {
      class: 'btn', type: 'button', style: { marginTop: '6px' }, text: label,
      onclick: () => {
        const name = input.value.trim();
        if (!name) {
          input.focus();
          input.classList.remove('shake');
          void input.offsetWidth;
          input.classList.add('shake');
          return;
        }
        onSave({ name, emoji, color });
      },
    });
    return h('div', null, preview, BT.field('Имя', input), BT.field('Аватар', eg), BT.field('Цвет', sw), save);
  }

  // =====================================================================
  // Оболочка с вкладками
  // =====================================================================
  function renderShell() {
    app.innerHTML = '';
    screenEl = h('div', { class: 'screen' });
    const inner = h('div', { class: 'tabbar-inner' });
    TABS.forEach((t) => {
      const b = h('button', {
        type: 'button', class: 'tab' + (t.id === tab ? ' active' : ''), html: BT.icon(t.icon) + '<span>' + t.name + '</span>',
        onclick: () => {
          if (tab === t.id) {
            screenEl.scrollTo({ top: 0, behavior: 'smooth' });
            return;
          }
          tab = t.id;
          BT.$$('.tab', inner).forEach((x) => x.classList.toggle('active', x === b));
          BT.haptic();
          render(true);
        },
      });
      inner.append(b);
    });
    app.append(screenEl, h('nav', { class: 'tabbar' }, inner));
    render(true);
  }

  function render(reset) {
    if (!screenEl || !BT.store.me()) return;
    const y = screenEl.scrollTop;
    screenEl.innerHTML = '';
    screenEl.append({ games: pageGames, progress: pageProgress, settings: pageSettings }[tab]());
    if (reset) {
      screenEl.scrollTop = 0;
      screenEl.style.animation = 'none';
      void screenEl.offsetWidth;
      screenEl.style.animation = '';
    } else {
      screenEl.scrollTop = y;
    }
  }

  // =====================================================================
  // Вкладка «Игры»
  // =====================================================================
  function pageGames() {
    const me = BT.store.me();
    const r = BT.store.ratings(me.id);
    const today = BT.store.today(me.id);
    const streak = BT.store.streak(me.id);
    const page = h('div', { class: 'page' });

    page.append(h('div', { class: 'nav-large' },
      h('div', null, h('div', { class: 'eyebrow', text: BT.fmt.today() }), h('h1', { text: 'Игры' })),
      h('button', { class: 'avatar', type: 'button', style: { '--pc': me.color }, text: me.emoji, 'aria-label': 'Профиль', onclick: () => { tab = 'settings'; renderShell(); } })));

    if (isIOS() && !isStandalone() && !BT.settings.hideInstall) page.append(installCard());

    const mins = Math.round(today.time / 60000);
    page.append(h('div', { class: 'hero' },
      h('div', { class: 'hero-row' },
        h('div', null,
          h('div', { class: 'hero-label', text: 'Привет, ' + me.name + '! Индекс мозга' }),
          h('div', { class: 'hero-value num', text: r.overall == null ? '—' : r.overall }),
          h('div', { class: 'hero-sub', text: levelName(r.overall) })),
        h('div', { class: 'avatar lg', style: { '--pc': '#ffffff' }, text: me.emoji })),
      h('div', { class: 'hero-chips' },
        h('span', { class: 'chip', text: '🎯 ' + today.games + ' ' + plural(today.games, 'игра', 'игры', 'игр') + ' сегодня' }),
        h('span', { class: 'chip', text: '🔥 ' + streak + ' ' + plural(streak, 'день', 'дня', 'дней') + ' подряд' }),
        mins ? h('span', { class: 'chip', text: '⏱ ' + mins + ' мин' }) : null)));

    BT.CATS.forEach((cat) => {
      const games = BT.games.filter((g) => g.cat === cat.id);
      if (!games.length) return;
      page.append(h('div', { class: 'section-title', style: { '--cc': cat.color } },
        h('span', { class: 'cat-dot' }), cat.name,
        h('span', { class: 'count', text: r.cats[cat.id] != null ? 'индекс ' + r.cats[cat.id] : games.length + ' ' + plural(games.length, 'игра', 'игры', 'игр') })));
      page.append(h('div', { class: 'games-grid' }, games.map((g) => gameCard(g, me))));
    });
    return page;
  }

  function gameCard(g, me) {
    const cat = BT.cat(g.cat);
    const best = BT.store.best(me.id, g.id);
    const lvl = BT.store.level(me.id, g.id);
    return h('button', { type: 'button', class: 'game-card', style: { '--cc': cat.color }, onclick: () => openGameSheet(g) },
      h('div', { class: 'game-icon', html: BT.icon(g.icon) }),
      lvl && g.levels !== false ? h('span', { class: 'lvl', text: 'ур. ' + lvl }) : null,
      h('h3', { text: g.name }),
      h('div', { class: 'meta', text: g.short }),
      h('div', { class: 'best' }, best == null
        ? h('span', { class: 'new', text: 'Ещё не играли' })
        : [h('span', { text: 'Рекорд' }), h('b', { text: BT.fmt.int(best) })]));
  }

  function installCard() {
    const card = h('div', { class: 'card', style: { display: 'flex', gap: '12px', alignItems: 'center' } },
      h('img', { src: 'icons/icon-180.png', alt: '', style: { width: '46px', height: '46px', borderRadius: '12px', flex: 'none' } }),
      h('div', { style: { flex: '1', fontSize: '14px', lineHeight: '1.35' } },
        h('b', { text: 'Установите на экран «Домой»' }),
        h('div', { style: { color: 'var(--text2)' }, text: 'Поделиться → «На экран Домой». Будет открываться как приложение и работать без интернета.' })),
      h('button', { class: 'icon-btn', type: 'button', html: BT.icon('close'), 'aria-label': 'Скрыть', onclick: () => { BT.settings.hideInstall = true; BT.saveSettings(); card.remove(); } }));
    return card;
  }

  // Шторка с описанием игры и кнопкой «Играть»
  function openGameSheet(g) {
    BT.haptic();
    const me = BT.store.me();
    const cat = BT.cat(g.cat);
    const best = BT.store.best(me.id, g.id);
    const count = BT.store.count(me.id, g.id);
    const lvl = BT.store.level(me.id, g.id) || g.startLevel || 1;
    const rating = BT.store.gameRatingFor(me.id, g.id);
    const opts = {};
    let sheet = null;

    const optBlocks = (g.options || []).map((o) => {
      const saved = BT.settings['opt_' + g.id + '_' + o.key];
      opts[o.key] = o.values.some((v) => v.id === saved) ? saved : o.def;
      const chips = h('div', { class: 'chips' });
      o.values.forEach((v) => {
        const b = h('button', {
          type: 'button', class: v.id === opts[o.key] ? 'on' : '', text: v.name,
          onclick: () => {
            opts[o.key] = v.id;
            BT.settings['opt_' + g.id + '_' + o.key] = v.id;
            BT.saveSettings();
            BT.$$('button', chips).forEach((x) => x.classList.toggle('on', x === b));
            BT.haptic();
          },
        });
        chips.append(b);
      });
      return h('div', { class: 'opts-row' }, h('div', { class: 'lbl', text: o.label }), chips);
    });

    const content = h('div', null,
      h('div', { class: 'sheet-head' },
        h('div', { class: 'game-icon', html: BT.icon(g.icon) }),
        h('div', null, h('div', { class: 'cat', text: cat.name }), h('h2', { text: g.name }))),
      h('ul', { class: 'howto' }, g.howto.map((s) => h('li', { text: s }))),
      h('div', { class: 'stat3' },
        BT.stat(best == null ? '—' : BT.fmt.int(best), 'Рекорд'),
        g.levels === false ? BT.stat(rating == null ? '—' : rating, 'Рейтинг') : BT.stat(lvl, 'Уровень'),
        BT.stat(count, plural(count, 'игра', 'игры', 'игр'))),
      optBlocks,
      h('button', {
        class: 'btn', type: 'button', style: { '--g': cat.color }, html: BT.icon('play') + 'Играть',
        onclick: () => {
          sheet.close();
          startGame(g, opts);
        },
      }));
    sheet = BT.sheet(content, { style: { '--cc': cat.color } });
  }

  // =====================================================================
  // Запуск игры
  // =====================================================================
  function startGame(g, opts) {
    const me = BT.store.me();
    const cat = BT.cat(g.cat);
    const level = g.levels === false ? 1 : BT.store.level(me.id, g.id) || g.startLevel || 1;
    gameOpen = true;

    const closeBtn = h('button', { class: 'icon-btn', type: 'button', html: BT.icon('close'), 'aria-label': 'Выйти' });
    const pauseBtn = h('button', { class: 'icon-btn', type: 'button', html: BT.icon('pause'), 'aria-label': 'Пауза' });
    const scoreNum = h('span', { text: '0' });
    const labelEl = h('small');
    const scoreEl = h('div', { class: 'hud-score' }, scoreNum, labelEl);
    const textEl = h('span');
    const livesEl = h('div', { class: 'lives' });
    const hud = h('div', { class: 'hud' }, scoreEl, h('div', { class: 'hud-right' }, textEl, livesEl));
    const bar = h('i');
    const pbar = h('div', { class: 'pbar' }, bar);
    const stage = h('div', { class: 'stage' });
    const scr = h('div', { class: 'game-screen', style: { '--g': cat.color } },
      h('div', { class: 'game-top' }, closeBtn, h('div', { class: 'title', text: g.name }), pauseBtn), hud, pbar, stage);
    document.body.appendChild(scr);

    const clock = BT.createClock();
    let started = false, ended = false, paused = false, cleanup = null, overlay = null, score = 0;

    function flash(cls) {
      stage.classList.remove('fx-good', 'fx-bad');
      void stage.offsetWidth;
      stage.classList.add(cls);
    }
    function floatText(el, text, bad) {
      const sr = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
      const f = h('div', {
        class: 'float-pts' + (bad ? ' bad' : ''), text,
        style: { left: r.left + r.width / 2 - sr.left + 'px', top: r.top - sr.top + 'px' },
      });
      stage.append(f);
      setTimeout(() => f.remove(), 900);
    }

    const ctx = {
      stage, level, clock, h,
      opts: opts || {},
      rand: BT.rand,
      me,
      get alive() { return !ended; },
      wait: (ms) => new Promise((res) => clock.after(ms, res)),
      hud(o) {
        if ('score' in o && o.score !== score) {
          score = o.score;
          scoreNum.textContent = BT.fmt.int(score);
          scoreEl.classList.remove('bump');
          void scoreEl.offsetWidth;
          scoreEl.classList.add('bump');
        }
        if ('text' in o) textEl.textContent = o.text == null ? '' : o.text;
        if ('label' in o) labelEl.textContent = o.label || '';
        if ('lives' in o) {
          const max = o.maxLives || o.lives;
          if (livesEl.children.length !== max) livesEl.innerHTML = '<i></i>'.repeat(max);
          Array.from(livesEl.children).forEach((el, i) => el.classList.toggle('off', i >= o.lives));
        }
        if ('progress' in o) bar.style.width = BT.clamp(o.progress, 0, 1) * 100 + '%';
      },
      // Обратный отсчёт в HUD (м:сс) + полоса времени. Возвращает { add(ms), left(), stop() }.
      timer(sec, onEnd) {
        const total = sec * 1000;
        let endAt = clock.now + total, shown = -1, done = false;
        const off = clock.onTick((now) => {
          if (done) return;
          const left = Math.max(0, endAt - now);
          const s = Math.ceil(left / 1000);
          if (s !== shown) {
            shown = s;
            textEl.textContent = BT.fmt.clock(s);
            if (s <= 3 && s > 0) BT.sound.tick();
          }
          bar.style.width = Math.min(100, (left / total) * 100) + '%';
          if (left <= 0) {
            done = true;
            off();
            onEnd();
          }
        });
        return {
          add(ms) { endAt += ms; },
          left: () => Math.max(0, endAt - clock.now),
          stop() { done = true; off(); },
        };
      },
      tap(el, fn) {
        BT.onTap(el, (e) => { if (started && !ended && !paused) fn(e); });
      },
      good(el, text) {
        BT.sound.good();
        BT.haptic();
        flash('fx-good');
        if (el && text != null) floatText(el, text);
      },
      bad(el, text) {
        BT.sound.bad();
        BT.haptic('error');
        flash('fx-bad');
        if (el && text != null) floatText(el, text, true);
      },
      click() {
        BT.sound.tap();
        BT.haptic();
      },
      end(res) {
        if (ended) return;
        ended = true;
        const t = Math.round(clock.now);
        clock.destroy();
        finish(res || {}, t);
      },
    };

    function countdown(done) {
      let n = 3;
      const num = h('div', { class: 'countdown', text: n });
      const el = h('div', { class: 'overlay', style: { background: 'var(--bg)' } }, num, h('div', { class: 'stage-msg', text: 'Приготовьтесь…' }));
      stage.append(el);
      BT.sound.tick();
      const iv = setInterval(() => {
        if (ended) return clearInterval(iv);
        if (paused) return;
        n--;
        if (n === 0) {
          clearInterval(iv);
          el.remove();
          BT.sound.go();
          done();
          return;
        }
        num.textContent = n;
        num.style.animation = 'none';
        void num.offsetWidth;
        num.style.animation = '';
        BT.sound.tick();
      }, 750);
    }

    function pause(title) {
      if (ended || paused) return;
      paused = true;
      clock.pause();
      overlay = h('div', { class: 'overlay' },
        h('h2', { text: title || 'Пауза' }),
        h('button', { class: 'btn', type: 'button', text: 'Продолжить', onclick: resume }),
        h('button', { class: 'btn secondary', type: 'button', text: 'Начать заново', onclick: restart }),
        h('button', { class: 'btn plain', type: 'button', text: 'Выйти', onclick: exit }));
      stage.append(overlay);
    }
    function resume() {
      if (!paused) return;
      paused = false;
      if (overlay) overlay.remove();
      overlay = null;
      if (started && !ended) clock.start();
    }
    function teardown() {
      ended = true;
      clock.destroy();
      document.removeEventListener('visibilitychange', onVis);
      if (cleanup) {
        try { cleanup(); } catch (e) {}
        cleanup = null;
      }
    }
    function exit() {
      teardown();
      scr.style.transition = 'opacity .25s, transform .25s';
      scr.style.opacity = '0';
      scr.style.transform = 'translateY(30px)';
      setTimeout(() => scr.remove(), 260);
      gameOpen = false;
      render();
    }
    function restart() {
      teardown();
      scr.remove();
      startGame(g, opts);
    }
    function onVis() {
      if (document.visibilityState === 'hidden') pause();
    }
    document.addEventListener('visibilitychange', onVis);
    closeBtn.onclick = () => (started && !ended ? pause('Выйти из игры?') : exit());
    pauseBtn.onclick = () => pause();

    function finish(res, t) {
      teardown();
      const prevBest = BT.store.best(me.id, g.id);
      const r = {
        id: BT.uid(), p: me.id, g: g.id,
        s: Math.max(0, Math.round(res.score || 0)),
        l: level,
        nl: g.levels === false ? 1 : BT.clamp(Math.round(res.nextLevel || level), 1, 99),
        a: res.accuracy == null ? null : Math.round(BT.clamp(res.accuracy, 0, 1) * 100) / 100,
        t, ts: Date.now(),
        d: res.details || null,
      };
      BT.store.addResult(r);
      BT.sync.run();
      showResult(r, res, prevBest);
    }

    function showResult(r, res, prevBest) {
      hud.remove();
      pbar.remove();
      pauseBtn.style.visibility = 'hidden';
      const record = prevBest != null && r.s > prevBest;
      const first = prevBest == null;
      const emoji = record ? '🏆' : first ? '🎉' : r.a != null && r.a >= 0.9 ? '🔥' : r.a != null && r.a < 0.5 ? '💪' : '👏';
      const title = record ? 'Новый рекорд!' : first ? 'Первый результат' : 'Результат';
      const stats = res.stats || [
        ['Точность', r.a == null ? '—' : BT.fmt.pct(r.a)],
        ['Уровень', r.l],
        ['Время', BT.fmt.clock(r.t / 1000)],
      ];
      const badges = [];
      if (record) badges.push(h('div', { class: 'badge record', text: '🏆 Было ' + BT.fmt.int(prevBest) }));
      else if (!first) badges.push(h('div', { class: 'badge lvl-down', text: 'Рекорд: ' + BT.fmt.int(prevBest) }));
      if (g.levels !== false && r.nl > r.l) badges.push(h('div', { class: 'badge lvl-up', text: '↑ Новый уровень: ' + r.nl }));

      const big = h('div', { class: 'score-big', text: '0' });
      stage.innerHTML = '';
      stage.append(h('div', { class: 'result' },
        h('div', { class: 'emoji', text: emoji }),
        h('div', { class: 'label', text: title }),
        big,
        h('div', { class: 'label', text: g.unit || plural(r.s, 'очко', 'очка', 'очков') }),
        h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' } }, badges),
        h('div', { class: 'stat3' }, stats.map(([l, v]) => BT.stat(v, l))),
        h('div', { class: 'btn-col' },
          h('button', { class: 'btn', type: 'button', html: BT.icon('replay') + 'Ещё раз', onclick: restart }),
          h('button', { class: 'btn secondary', type: 'button', text: 'Готово', onclick: exit }))));
      BT.countUp(big, r.s);
      if (record) {
        BT.sound.win();
        BT.confetti();
        BT.haptic('heavy');
      } else {
        BT.sound.go();
      }
    }

    countdown(() => {
      started = true;
      clock.start();
      try {
        cleanup = g.run(ctx) || null;
      } catch (e) {
        console.error(e);
        BT.toast('Ошибка в игре: ' + e.message, 4000);
        exit();
      }
    });
  }

  // =====================================================================
  // Вкладка «Прогресс»
  // =====================================================================
  function pageProgress() {
    const me = BT.store.me();
    if (!viewPid || !BT.store.profile(viewPid)) viewPid = me.id;
    const p = BT.store.profile(viewPid);
    const mine = p.id === me.id;
    const page = h('div', { class: 'page' });

    page.append(h('div', { class: 'nav-large' }, h('div', null, h('div', { class: 'eyebrow', text: 'Статистика' }), h('h1', { text: 'Прогресс' }))));
    page.append(h('div', { style: { marginBottom: '16px' } },
      BT.seg(BT.store.profiles().map((x) => [x.id, x.emoji + ' ' + x.name]), viewPid, (v) => { viewPid = v; render(); })));

    const total = BT.store.totals(p.id);
    if (!total.games) {
      page.append(h('div', { class: 'empty' },
        h('div', { class: 'big', text: p.emoji }),
        h('div', { text: mine ? 'Здесь появится ваш прогресс после первой игры' : p.name + ' пока не играет — или данные ещё не синхронизированы' })));
      return page;
    }

    const r = BT.store.ratings(p.id);
    const bars = h('div', { class: 'cat-bars' }, BT.CATS.map((c) =>
      h('div', { class: 'cat-bar', style: { '--cc': c.color } },
        h('div', { class: 'top' }, h('span', { text: c.name }), h('span', { text: r.cats[c.id] == null ? '—' : r.cats[c.id] })),
        h('div', { class: 'track' }, h('i', { style: { width: (r.cats[c.id] || 0) / 10 + '%' } })))));
    page.append(h('div', { class: 'card' },
      h('div', { class: 'card-title' }, h('span', { text: 'Индекс мозга' }), h('span', { class: 'muted', text: levelName(r.overall) })),
      h('div', { class: 'index-wrap' }, h('div', { style: { flex: 'none' }, html: BT.ring(r.overall, 'из 1000') }), bars)));

    const streak = BT.store.streak(p.id);
    page.append(h('div', { class: 'mini-stats' },
      h('div', null, h('b', { text: total.games }), h('span', { text: plural(total.games, 'игра', 'игры', 'игр') })),
      h('div', null, h('b', { text: total.days }), h('span', { text: plural(total.days, 'день', 'дня', 'дней') + ' занятий' })),
      h('div', null, h('b', { text: streak }), h('span', { text: 'подряд 🔥' }))));

    const chart = BT.lineChart(BT.store.history(p.id, 30), 'var(--accent)');
    page.append(h('div', { class: 'card' },
      h('div', { class: 'card-title' }, h('span', { text: 'Динамика индекса' }), h('span', { class: 'muted', text: 'за 30 дней' })),
      chart ? h('div', { html: chart }) : h('div', { class: 'empty', style: { padding: '22px 10px' }, text: 'График появится, когда будут игры в разные дни' })));

    BT.CATS.forEach((c) => {
      const games = BT.games.filter((g) => g.cat === c.id && BT.store.count(p.id, g.id));
      if (!games.length) return;
      page.append(h('div', { class: 'list-header', text: c.name }));
      page.append(h('div', { class: 'list' }, games.map((g) => {
        const list = BT.store.list(p.id, g.id);
        return h(mine ? 'button' : 'div', { class: 'row has-icon', type: mine ? 'button' : null, onclick: mine ? () => openGameSheet(g) : null },
          BT.rowIcon(g.icon, c.color),
          h('div', { class: 'grow' },
            h('div', { text: g.name }),
            h('div', { class: 'sub', text: 'Рекорд ' + BT.fmt.int(BT.store.best(p.id, g.id)) + ' · ' + list.length + ' ' + plural(list.length, 'игра', 'игры', 'игр') })),
          h('div', { html: BT.spark(list.slice(-12).map((x) => x.s), c.color) }),
          h('div', { class: 'val num', style: { minWidth: '34px', textAlign: 'right' }, text: r.games[g.id] == null ? '—' : r.games[g.id] }));
      })));
    });

    const recent = BT.store.list(p.id).slice(-8).reverse();
    page.append(h('div', { class: 'list-header', text: 'Последние игры' }));
    page.append(h('div', { class: 'list' }, recent.map((x) => {
      const g = BT.game(x.g);
      if (!g) return null;
      const c = BT.cat(g.cat);
      return h('div', { class: 'row has-icon' },
        BT.rowIcon(g.icon, c.color),
        h('div', { class: 'grow' }, h('div', { text: g.name }), h('div', { class: 'sub', text: BT.fmt.ago(x.ts) })),
        h('div', { class: 'val num', text: BT.fmt.int(x.s) }));
    })));
    page.append(h('div', { class: 'list-footer', style: { marginTop: '-18px' }, text: 'Рейтинг игры (0–1000) — среднее трёх лучших из последних 10 результатов. Индекс категории — среднее по её играм.' }));
    return page;
  }

  // =====================================================================
  // Вкладка «Настройки»
  // =====================================================================
  function pageSettings() {
    const me = BT.store.me();
    const other = BT.store.other();
    const page = h('div', { class: 'page' }, h('div', { class: 'nav-large' }, h('h1', { text: 'Настройки' })));

    page.append(h('div', { class: 'list-header', text: 'Профиль' }), h('div', { class: 'list' },
      h('button', { class: 'row', type: 'button', onclick: editProfile },
        h('div', { class: 'avatar', style: { '--pc': me.color }, text: me.emoji }),
        h('div', { class: 'grow' }, h('div', { style: { fontWeight: '600' }, text: me.name }), h('div', { class: 'sub', text: 'Имя, аватар и цвет' })),
        BT.chev()),
      other ? h('button', { class: 'row has-icon', type: 'button', onclick: switchPlayer },
        BT.rowIcon('swap', 'var(--c-logic)'), h('div', { class: 'grow', text: 'Играть как ' + other.name }), BT.chev()) : null));

    page.append(h('div', { class: 'list-header', text: 'Оформление и отклик' }), h('div', { class: 'list' },
      h('div', { class: 'row has-icon' }, BT.rowIcon('theme', '#8e8e93'), h('div', { class: 'grow', text: 'Тема' }),
        h('div', { style: { width: '200px' } }, BT.seg([['auto', 'Авто'], ['light', 'Светлая'], ['dark', 'Тёмная']], BT.settings.theme, (v) => {
          BT.settings.theme = v;
          BT.saveSettings();
          BT.applyTheme();
        }))),
      BT.switchRow('sound', 'var(--c-attention)', 'Звуки', 'sound', (on) => { if (on) BT.sound.good(); }),
      BT.switchRow('haptic', 'var(--c-memory)', 'Вибрация', 'haptics')),
      h('div', { class: 'list-footer', text: 'Звук не слышен, если iPhone в беззвучном режиме. Вибрация на iPhone работает с iOS 18.' }));

    const st = BT.sync.status();
    const stText = !st.enabled ? 'Не настроена — данные только на этом телефоне'
      : st.syncing ? 'Синхронизация…'
      : st.lastError ? st.lastError
      : st.lastSync ? 'Обновлено ' + BT.fmt.ago(st.lastSync) : 'Ещё не выполнялась';
    page.append(h('div', { class: 'list-header', text: 'Синхронизация' }), h('div', { class: 'list' },
      h('div', { class: 'row has-icon' },
        BT.rowIcon('sync', !st.enabled ? '#8e8e93' : st.lastError ? 'var(--bad)' : 'var(--good)'),
        h('div', { class: 'grow' }, h('div', { text: 'Google Таблица' }), h('div', { class: 'sub', text: stText })),
        st.pending ? h('div', { class: 'val', text: 'в очереди: ' + st.pending }) : null),
      st.enabled ? h('button', { class: 'row has-icon', type: 'button', onclick: () => { BT.sync.run(); BT.toast('Синхронизирую…'); } },
        BT.rowIcon('replay', 'var(--c-logic)'), h('div', { class: 'grow', style: { color: 'var(--accent)' }, text: 'Синхронизировать сейчас' })) : null,
      h('button', { class: 'row has-icon', type: 'button', onclick: serverSheet },
        BT.rowIcon('server', '#8e8e93'), h('div', { class: 'grow', text: 'Адрес сервера' }),
        h('div', { class: 'val', text: BT.settings.apiUrl ? 'свой' : CFG.API_URL ? 'из config.js' : 'нет' }), BT.chev())),
      h('div', { class: 'list-footer', text: 'Результаты сначала сохраняются на телефоне — играть можно без интернета. Когда появится сеть, они отправятся в таблицу, и второй игрок увидит ваш прогресс.' }));

    page.append(h('div', { class: 'list-header', text: 'О приложении' }), h('div', { class: 'list' },
      h('button', { class: 'row has-icon', type: 'button', onclick: installSheet },
        BT.rowIcon('download', 'var(--accent)'), h('div', { class: 'grow', text: 'Установка на iPhone' }), BT.chev()),
      h('div', { class: 'row has-icon' }, BT.rowIcon('info', '#8e8e93'), h('div', { class: 'grow', text: 'Версия' }),
        h('div', { class: 'val', text: CFG.VERSION + (isStandalone() ? ' · приложение' : ' · браузер') })),
      h('div', { class: 'row has-icon' }, BT.rowIcon('tabGames', 'var(--c-words)'), h('div', { class: 'grow', text: 'Игр в приложении' }),
        h('div', { class: 'val', text: BT.games.length }))));
    return page;
  }

  function editProfile() {
    const me = BT.store.me();
    const s = BT.sheet(h('div', null,
      h('h2', { style: { margin: '0 0 16px', fontSize: '22px', textAlign: 'center' }, text: 'Профиль' }),
      profileEditor(me, 'Сохранить', (patch) => {
        BT.store.updateProfile(me.id, patch);
        s.close();
        render();
        BT.sync.run();
      })));
  }

  function switchPlayer() {
    const other = BT.store.other();
    const s = BT.sheet(h('div', { style: { textAlign: 'center' } },
      h('div', { class: 'avatar lg', style: { '--pc': other.color, margin: '6px auto 12px' }, text: other.emoji }),
      h('h2', { style: { margin: '0 0 6px', fontSize: '22px' }, text: 'Играть как ' + other.name + '?' }),
      h('p', { style: { margin: '0 0 20px', color: 'var(--text2)', fontSize: '15px' }, text: 'Новые результаты на этом телефоне будут записываться в профиль «' + other.name + '».' }),
      h('button', {
        class: 'btn', type: 'button', text: 'Переключиться',
        onclick: () => {
          BT.settings.profile = other.id;
          BT.saveSettings();
          viewPid = null;
          s.close();
          tab = 'games';
          renderShell();
          BT.toast('Привет, ' + other.name + '!');
        },
      })));
  }

  function serverSheet() {
    const input = h('input', {
      class: 'input', type: 'url', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
      placeholder: 'https://script.google.com/macros/s/…/exec', value: BT.settings.apiUrl || CFG.API_URL || '',
    });
    let s = null;
    const btn = h('button', {
      class: 'btn', type: 'button', text: 'Проверить и сохранить',
      onclick: async () => {
        const url = input.value.trim();
        if (!url || url === CFG.API_URL) {
          BT.settings.apiUrl = '';
          BT.saveSettings();
          s.close();
          render();
          BT.sync.run();
          return;
        }
        btn.disabled = true;
        btn.textContent = 'Проверяю…';
        try {
          await BT.sync.test(url);
          BT.settings.apiUrl = url;
          BT.saveSettings();
          BT.toast('Сервер подключён ✓');
          s.close();
          render();
          BT.sync.run();
        } catch (e) {
          BT.toast(e.message, 3500);
          btn.disabled = false;
          btn.textContent = 'Проверить и сохранить';
        }
      },
    });
    s = BT.sheet(h('div', null,
      h('h2', { style: { margin: '0 0 14px', fontSize: '22px' }, text: 'Адрес сервера' }),
      input,
      h('p', { style: { margin: '10px 4px 16px', fontSize: '13px', color: 'var(--text2)' }, text: 'Ссылка на веб-приложение Google Apps Script (заканчивается на /exec). Обычно она уже прописана в config.js — тогда здесь ничего менять не нужно.' }),
      btn));
  }

  function installSheet() {
    const steps = [
      'Откройте ссылку на приложение в Safari.',
      'Нажмите «Поделиться» — квадрат со стрелкой вверх.',
      'Выберите «На экран „Домой“» и нажмите «Добавить».',
      'Запускайте с иконки «Нейрон»: на весь экран и без интернета.',
    ];
    BT.sheet(h('div', { style: { '--cc': 'var(--accent)' } },
      h('div', { class: 'sheet-head' },
        h('img', { src: 'icons/icon-180.png', alt: '', style: { width: '60px', height: '60px', borderRadius: '15px' } }),
        h('div', null, h('div', { class: 'cat', text: 'Установка' }), h('h2', { text: 'Нейрон на iPhone' }))),
      h('ul', { class: 'howto' }, steps.map((s) => h('li', { text: s }))),
      h('p', { style: { margin: '0', fontSize: '14px', color: 'var(--text2)' }, text: 'Обновления приходят сами: откройте приложение с интернетом — подтянется свежая версия.' })));
  }

  // =====================================================================
  // Старт
  // =====================================================================
  function boot() {
    BT.applyTheme();
    document.addEventListener('pointerdown', () => BT.sound.unlock(), { once: true, capture: true });
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    BT.on('profiles', () => { if (!gameOpen) render(); });
    BT.on('results', () => { if (!gameOpen) render(); });
    BT.on('sync', () => { if (!gameOpen && tab === 'settings') render(); });

    if (!BT.store.me()) onboarding();
    else {
      renderShell();
      BT.sync.run();
    }
  }
  boot();
})();
