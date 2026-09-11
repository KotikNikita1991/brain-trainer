// ============================================================
// «Нейрон» — сервер синхронизации на Google Apps Script.
//
// Установка:
//   1. Создайте Google Таблицу (например, «Нейрон — результаты»).
//   2. Расширения → Apps Script → вставьте этот файл в Code.gs → Сохранить.
//   3. Выберите функцию setup и нажмите «Выполнить» (разрешите доступ к таблице).
//   4. Начать развертывание → Новое развертывание → тип «Веб-приложение»:
//        Выполнять от имени: «Я»
//        У кого есть доступ: «Все»
//   5. Скопируйте ссылку, заканчивающуюся на /exec, в js/config.js → API_URL.
//
// После любых правок кода: Управление развертываниями → Изменить → Новая версия.
// Не сортируйте лист «Results» — приложение читает новые строки по порядку.
// ============================================================

const RESULTS = 'Results';
const PROFILES = 'Profiles';
const R_HEAD = ['id', 'profile', 'game', 'score', 'level', 'nextLevel', 'accuracy', 'durationSec', 'time', 'details', 'received'];
const P_HEAD = ['id', 'name', 'emoji', 'color', 'updated'];

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  sheet_(ss, RESULTS, R_HEAD);
  sheet_(ss, PROFILES, P_HEAD);
  return 'Готово: листы Results и Profiles созданы';
}

function doGet(e) {
  return json_({ ok: true, app: 'neuron', time: new Date().toISOString() });
}

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'Некорректный JSON' });
  }
  if (!data || data.action !== 'sync') return json_({ ok: false, error: 'Неизвестное действие' });

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return json_({ ok: false, error: 'Сервер занят, попробуйте ещё раз' });
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const rs = sheet_(ss, RESULTS, R_HEAD);
    const ps = sheet_(ss, PROFILES, P_HEAD);

    // 1. Новые результаты (без дублей по id)
    const last = rs.getLastRow();
    const ids = new Set(last > 1 ? rs.getRange(2, 1, last - 1, 1).getValues().map((r) => String(r[0])) : []);
    const rows = [];
    (data.results || []).forEach((r) => {
      if (!r || !r.id || ids.has(String(r.id))) return;
      ids.add(String(r.id));
      rows.push([
        String(r.id), String(r.p || ''), String(r.g || ''),
        Number(r.s) || 0, Number(r.l) || 1, Number(r.nl) || 1,
        r.a == null ? '' : Number(r.a),
        Math.round((Number(r.t) || 0) / 1000),
        new Date(Number(r.ts) || Date.now()),
        r.d ? JSON.stringify(r.d) : '',
        new Date(),
      ]);
    });
    if (rows.length) rs.getRange(rs.getLastRow() + 1, 1, rows.length, R_HEAD.length).setValues(rows);

    // 2. Профили: побеждает более свежая правка
    const profiles = readProfiles_(ps);
    (data.profiles || []).forEach((p) => {
      if (!p || !p.id) return;
      const idx = profiles.findIndex((x) => x.id === p.id);
      const row = [String(p.id), String(p.name || ''), String(p.emoji || ''), String(p.color || ''), Number(p.updated) || Date.now()];
      if (idx === -1) {
        ps.appendRow(row);
      } else if (Number(p.updated) > Number(profiles[idx].updated || 0)) {
        ps.getRange(idx + 2, 1, 1, P_HEAD.length).setValues([row]);
      }
    });

    // 3. Отдаём всё, что появилось после курсора клиента
    const total = Math.max(0, rs.getLastRow() - 1);
    const cursor = Math.max(0, Math.min(Number(data.cursor) || 0, total));
    let out = [];
    if (total > cursor) {
      out = rs.getRange(2 + cursor, 1, total - cursor, R_HEAD.length).getValues().map(toResult_);
    }
    return json_({ ok: true, cursor: total, results: out, profiles: readProfiles_(ps) });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  } finally {
    lock.releaseLock();
  }
}

function toResult_(v) {
  const ts = v[8] instanceof Date ? v[8].getTime() : new Date(v[8]).getTime();
  let d = null;
  try { d = v[9] ? JSON.parse(v[9]) : null; } catch (e) {}
  return {
    id: String(v[0]), p: String(v[1]), g: String(v[2]),
    s: Number(v[3]) || 0, l: Number(v[4]) || 1, nl: Number(v[5]) || 1,
    a: v[6] === '' ? null : Number(v[6]),
    t: (Number(v[7]) || 0) * 1000,
    ts: ts || 0, d: d,
  };
}

function readProfiles_(ps) {
  const last = ps.getLastRow();
  if (last < 2) return [];
  return ps.getRange(2, 1, last - 1, P_HEAD.length).getValues()
    .filter((r) => r[0])
    .map((r) => ({ id: String(r[0]), name: String(r[1]), emoji: String(r[2]), color: String(r[3]), updated: Number(r[4]) || 0 }));
}

function sheet_(ss, name, head) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
