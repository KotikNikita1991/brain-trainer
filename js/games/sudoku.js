// Головоломки: «Судоку» — заметки, кандидаты, подсказки, подсветка линий и сохранение партии.
(function () {
  'use strict';
  const BT = window.BT;
  const DIFF = {
    easy: { name: 'Лёгкий', givens: 40, base: 400, target: 6 },
    medium: { name: 'Средний', givens: 33, base: 600, target: 10 },
    hard: { name: 'Сложный', givens: 28, base: 850, target: 15 },
    expert: { name: 'Эксперт', givens: 24, base: 1100, target: 22 },
  };
  const ROW = (i) => Math.floor(i / 9), COL = (i) => i % 9;
  const BOX = (i) => Math.floor(ROW(i) / 3) * 3 + Math.floor(COL(i) / 3);
  const PEERS = Array.from({ length: 81 }, (_, i) => {
    const s = [];
    for (let j = 0; j < 81; j++) if (j !== i && (ROW(j) === ROW(i) || COL(j) === COL(i) || BOX(j) === BOX(i))) s.push(j);
    return s;
  });
  const saveKey = (pid) => 'bt_sudoku_' + pid;
  const mmss = (ms) => {
    const s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };

  // Решатель на битовых масках: считает решения до limit (для проверки единственности),
  // random — перебирать цифры в случайном порядке (для генерации полного поля).
  function solve(grid, limit, out, random) {
    const a = grid.slice();
    const rows = new Array(9).fill(0), cols = new Array(9).fill(0), boxes = new Array(9).fill(0);
    for (let i = 0; i < 81; i++) {
      if (!a[i]) continue;
      const b = 1 << a[i];
      rows[ROW(i)] |= b;
      cols[COL(i)] |= b;
      boxes[BOX(i)] |= b;
    }
    let count = 0;
    (function rec() {
      let best = -1, bestMask = 0, bestN = 10;
      for (let i = 0; i < 81; i++) {
        if (a[i]) continue;
        const m = ~(rows[ROW(i)] | cols[COL(i)] | boxes[BOX(i)]) & 0x3fe;
        let n = 0;
        for (let x = m; x; x &= x - 1) n++;
        if (n < bestN) {
          best = i;
          bestMask = m;
          bestN = n;
          if (n <= 1) break;
        }
      }
      if (best === -1) {
        count++;
        if (out) for (let i = 0; i < 81; i++) out[i] = a[i];
        return;
      }
      if (!bestN) return;
      const r = ROW(best), c = COL(best), bx = BOX(best);
      const digits = random ? BT.rand.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]) : [1, 2, 3, 4, 5, 6, 7, 8, 9];
      for (const d of digits) {
        const b = 1 << d;
        if (!(bestMask & b)) continue;
        a[best] = d;
        rows[r] |= b;
        cols[c] |= b;
        boxes[bx] |= b;
        rec();
        a[best] = 0;
        rows[r] &= ~b;
        cols[c] &= ~b;
        boxes[bx] &= ~b;
        if (count >= limit) return;
      }
    })();
    return count;
  }

  function generate(diff) {
    const solution = new Array(81).fill(0);
    solve(new Array(81).fill(0), 1, solution, true);
    const puzzle = solution.slice();
    let givens = 81;
    for (const i of BT.rand.shuffle(Array.from({ length: 81 }, (_, k) => k))) {
      if (givens <= DIFF[diff].givens) break;
      const j = 80 - i; // центральная симметрия, как в классических судоку
      if (!puzzle[i]) continue;
      const a = puzzle[i], b = puzzle[j];
      puzzle[i] = 0;
      puzzle[j] = 0;
      if (solve(puzzle, 2) !== 1) {
        puzzle[i] = a;
        puzzle[j] = b;
      } else {
        givens -= i === j ? 1 : 2;
      }
    }
    return { puzzle, solution };
  }

  BT.registerGame({
    id: 'sudoku', cat: 'puzzles', icon: 'sudoku',
    name: 'Судоку', short: 'Классика с заметками и подсказками',
    howto: [
      'Заполните поле так, чтобы в каждой строке, столбце и квадрате 3×3 были цифры от 1 до 9.',
      'Нажмите на клетку или цифру — подсветятся её линии и все такие же цифры. «Заметки» — карандашные пометки, «Кандидаты» — расставить все возможные.',
      'Есть 3 подсказки и отмена хода. Партия сохраняется — можно выйти и продолжить позже.',
    ],
    ref: 1000, levels: false, noCountdown: true, saves: true, stageClass: 'stage-top',
    options: [{ key: 'diff', label: 'Сложность', def: 'medium', values: Object.keys(DIFF).map((k) => ({ id: k, name: DIFF[k].name })) }],
    resume(pid) {
      const s = BT.ls.get(saveKey(pid), null);
      return s && DIFF[s.diff] ? DIFF[s.diff].name + ', ' + mmss(s.elapsed || 0) : null;
    },
    run(ctx) {
      const h = ctx.h;
      const pid = ctx.me.id;
      const HINTS = 3;
      let st = ctx.opts.resume ? BT.ls.get(saveKey(pid), null) : null;
      if (!st || !DIFF[st.diff]) {
        const diff = DIFF[ctx.opts.diff] ? ctx.opts.diff : 'medium';
        const g = generate(diff);
        st = { diff, puzzle: g.puzzle, solution: g.solution, cur: g.puzzle.slice(), notes: new Array(81).fill(0), mistakes: 0, hints: 0, elapsed: 0 };
      }
      const base = st.elapsed || 0;
      const elapsed = () => base + ctx.clock.now;
      let sel = -1, digitHL = 0, notesMode = false, done = false, lastSec = -1;
      const undo = [];

      const board = h('div', { class: 'sdk' });
      const cells = [];
      for (let i = 0; i < 81; i++) {
        const c = h('div', { class: 'sc' });
        ctx.tap(c, () => select(i));
        cells.push(c);
        board.append(c);
      }
      const tool = (icon, label, fn) => {
        const b = h('button', { type: 'button', class: 'sdk-tool', html: BT.icon(icon) + '<span>' + label + '</span>' });
        ctx.tap(b, fn);
        return b;
      };
      const undoBtn = tool('undo', 'Отменить', doUndo);
      const eraseBtn = tool('eraser', 'Стереть', erase);
      const notesBtn = tool('pencil', 'Заметки', () => { notesMode = !notesMode; BT.haptic(); render(); });
      const candBtn = tool('sudoku', 'Кандидаты', autoCandidates);
      const hintBtn = tool('hint', 'Подсказка', hint);
      hintBtn.append(h('i', { class: 'cnt' }));
      const pad = h('div', { class: 'sdk-pad' });
      const padBtns = [null];
      for (let d = 1; d <= 9; d++) {
        const b = h('button', { type: 'button', class: 'sdk-num' }, h('span', { text: d }), h('small'));
        ctx.tap(b, () => place(d));
        padBtns.push(b);
        pad.append(b);
      }
      ctx.stage.append(h('div', { class: 'sdk-info', text: DIFF[st.diff].name }), board, h('div', { class: 'sdk-tools' }, undoBtn, eraseBtn, notesBtn, candBtn, hintBtn), pad);

      const save = () => {
        if (!done) BT.ls.set(saveKey(pid), Object.assign({}, st, { elapsed: Math.round(elapsed()) }));
      };
      const pushUndo = () => {
        undo.push({ cur: st.cur.slice(), notes: st.notes.slice() });
        if (undo.length > 200) undo.shift();
      };
      const clearPeers = (i, d) => PEERS[i].forEach((j) => { st.notes[j] &= ~(1 << d); });

      function render() {
        const selVal = sel >= 0 ? st.cur[sel] : 0;
        const hl = selVal || digitHL;
        const lineR = new Set(), lineC = new Set(), lineB = new Set();
        const counts = new Array(10).fill(0);
        for (let i = 0; i < 81; i++) {
          const v = st.cur[i];
          if (v && v === st.solution[i]) counts[v]++;
          if (hl && v === hl) { lineR.add(ROW(i)); lineC.add(COL(i)); lineB.add(BOX(i)); }
        }
        cells.forEach((c, i) => {
          const v = st.cur[i];
          let cls = 'sc r' + ROW(i) + ' c' + COL(i);
          if (st.puzzle[i]) cls += ' given';
          else if (v) cls += ' user';
          if (v && v !== st.solution[i]) cls += ' err';
          if (sel >= 0 && i !== sel && (ROW(i) === ROW(sel) || COL(i) === COL(sel) || BOX(i) === BOX(sel))) cls += ' rel';
          if (hl && !v && (lineR.has(ROW(i)) || lineC.has(COL(i)) || lineB.has(BOX(i)))) cls += ' line';
          if (hl && v === hl) cls += ' same';
          if (i === sel) cls += ' sel';
          c.className = cls;
          if (v) {
            c.textContent = v;
          } else if (st.notes[i]) {
            c.innerHTML = '';
            const nt = h('div', { class: 'nt' });
            for (let d = 1; d <= 9; d++) {
              const on = st.notes[i] & (1 << d);
              nt.append(h('span', { class: on && d === hl ? 'hl' : '', text: on ? d : '' }));
            }
            c.append(nt);
          } else {
            c.textContent = '';
          }
        });
        for (let d = 1; d <= 9; d++) {
          const left = 9 - counts[d];
          padBtns[d].classList.toggle('done', left <= 0);
          padBtns[d].classList.toggle('hl', d === hl);
          padBtns[d].lastChild.textContent = left > 0 ? left : '';
        }
        notesBtn.classList.toggle('on', notesMode);
        hintBtn.querySelector('.cnt').textContent = HINTS - st.hints;
        const filled = st.cur.filter((v, i) => v && v === st.solution[i]).length;
        ctx.hud({ score: filled, label: '/ 81', progress: filled / 81 });
      }

      function select(i) {
        sel = sel === i ? -1 : i;
        digitHL = 0;
        BT.haptic();
        render();
      }
      function place(d) {
        if (done) return;
        if (sel < 0 || st.puzzle[sel]) {
          digitHL = digitHL === d ? 0 : d;
          sel = -1;
          BT.haptic();
          return render();
        }
        if (notesMode) {
          if (st.cur[sel]) return;
          pushUndo();
          st.notes[sel] ^= 1 << d;
          BT.haptic();
        } else {
          if (st.cur[sel] === d) return;
          pushUndo();
          st.cur[sel] = d;
          st.notes[sel] = 0;
          if (d !== st.solution[sel]) {
            st.mistakes++;
            ctx.bad(cells[sel]);
          } else {
            clearPeers(sel, d);
            BT.sound.tap();
            BT.haptic();
          }
        }
        save();
        render();
        checkWin();
      }
      function erase() {
        if (done || sel < 0 || st.puzzle[sel] || (!st.cur[sel] && !st.notes[sel])) return;
        pushUndo();
        st.cur[sel] = 0;
        st.notes[sel] = 0;
        BT.haptic();
        save();
        render();
      }
      function doUndo() {
        if (done || !undo.length) return;
        const u = undo.pop();
        st.cur = u.cur;
        st.notes = u.notes;
        BT.haptic();
        save();
        render();
      }
      function autoCandidates() {
        if (done) return;
        pushUndo();
        for (let i = 0; i < 81; i++) {
          if (st.cur[i]) continue;
          let m = 0x3fe;
          PEERS[i].forEach((j) => { if (st.cur[j]) m &= ~(1 << st.cur[j]); });
          st.notes[i] = m;
        }
        BT.toast('Все кандидаты расставлены');
        save();
        render();
      }
      function hint() {
        if (done) return;
        if (st.hints >= HINTS) return BT.toast('Подсказки закончились');
        let t = sel >= 0 && st.cur[sel] !== st.solution[sel] ? sel : -1;
        if (t < 0) {
          const empty = [];
          for (let i = 0; i < 81; i++) if (st.cur[i] !== st.solution[i]) empty.push(i);
          if (!empty.length) return;
          t = BT.rand.pick(empty);
        }
        pushUndo();
        st.cur[t] = st.solution[t];
        st.notes[t] = 0;
        clearPeers(t, st.cur[t]);
        st.hints++;
        sel = t;
        ctx.good(cells[t]);
        save();
        render();
        checkWin();
      }
      function checkWin() {
        for (let i = 0; i < 81; i++) if (st.cur[i] !== st.solution[i]) return;
        done = true;
        BT.ls.del(saveKey(pid));
        const D0 = DIFF[st.diff], ms = elapsed();
        const tf = BT.clamp((D0.target * 60000) / Math.max(1, ms), 0.5, 1.3);
        const penalty = Math.max(0.3, 1 - 0.05 * st.mistakes - 0.1 * st.hints);
        const empties = st.puzzle.filter((v) => !v).length;
        ctx.clock.after(500, () => ctx.end({
          score: Math.round(D0.base * tf * penalty),
          accuracy: empties / (empties + st.mistakes),
          time: Math.round(ms), emoji: '🧩', title: 'Судоку решено!',
          stats: [['Время', mmss(ms)], ['Ошибки', st.mistakes], ['Подсказки', st.hints]],
          details: { diff: st.diff, mistakes: st.mistakes, hints: st.hints },
        }));
      }

      const onKey = (e) => {
        if (!ctx.alive || ctx.paused) return;
        if (/^[1-9]$/.test(e.key)) place(Number(e.key));
        else if (e.key === 'Backspace' || e.key === 'Delete') erase();
        else if (e.key.startsWith('Arrow')) {
          if (sel < 0) sel = 40;
          else {
            const r = ROW(sel), c = COL(sel);
            if (e.key === 'ArrowUp') sel = ((r + 8) % 9) * 9 + c;
            if (e.key === 'ArrowDown') sel = ((r + 1) % 9) * 9 + c;
            if (e.key === 'ArrowLeft') sel = r * 9 + ((c + 8) % 9);
            if (e.key === 'ArrowRight') sel = r * 9 + ((c + 1) % 9);
          }
          e.preventDefault();
          render();
        }
      };
      document.addEventListener('keydown', onKey);
      ctx.clock.onTick(() => {
        const s = Math.floor(elapsed() / 1000);
        if (s !== lastSec) {
          lastSec = s;
          ctx.hud({ text: mmss(elapsed()) });
          if (s % 15 === 0) save();
        }
      });
      render();
      save();
      return () => {
        document.removeEventListener('keydown', onKey);
        save();
      };
    },
  });
})();
