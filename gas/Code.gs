/**
 * キャンペーン確認サイト用 API（Google Apps Script）
 *
 * データを保存するスプレッドシートの「拡張機能 → Apps Script」に貼り付けて、
 * ウェブアプリとしてデプロイしてください（手順は ADMIN_SETUP.md）。
 *
 * ・閲覧サイト（index.html）… action:get でデータを取得
 * ・管理画面（admin.html）  … action:save で保存（シートを丸ごと書き換え）
 * ・スプレッドシートを直接編集しても、サイトに反映されます
 *
 * パスワード：スクリプトプロパティ PASSWORD（未設定なら 2121）
 *            管理画面だけ別にしたい場合は ADMIN_PASSWORD を設定
 */

var SH = {
  campaigns: 'キャンペーン',
  details:   '条件・注意事項',
  combos:    '重畳適用',
  others:    '重畳の相手（その他）',
  themes:    'デザイン',
  settings:  'サイト設定',
  history:   '保存履歴'
};

var CAT    = {limited:'期間限定', closed:'クローズド', always:'常設', trial:'試験施策'};
var DTYPE  = {ok:'対象', ng:'対象外', note:'注意事項'};
var COMBO  = {ok:'可', ng:'不可'};
var MATRIX = {both:'行と列', row:'行のみ', col:'列のみ', none:'出さない'};
var SHOW   = {show:'表示', hide:'非表示'};

// [データのキー, シートの列見出し]
var CAMPAIGN_COLS = [
  ['id','ID'], ['visible','表示'], ['name','キャンペーン名'], ['label','短い名前'],
  ['category','分類'], ['status','ラベル'], ['icon','アイコン'],
  ['subtitle','サブタイトル'], ['period','期間（表示文）'], ['start','開始日'], ['end','終了日'],
  ['highlight','目玉'], ['price_old','通常価格'], ['price_new','特典価格'], ['aipo','AipoURL'],
  ['kj_title','工事費_タイトル'], ['kj_total','工事費_総額'], ['kj_monthly','工事費_月額'],
  ['matrix','重畳表']
];

// shared.js の THEME_KEYS と同じ並び・同じキー
var THEME_KEYS = [
  ['bg','ページの背景'], ['surface','カードの背景'], ['surface2','カード内の帯・ボックス'],
  ['border','枠線'], ['text','文字色'], ['textMuted','補足の文字色（薄め）'],
  ['main','メインカラー（タブ・見出し・期間）'], ['mainDeep','メインカラー（濃いめ）'],
  ['headerFrom','ヘッダー背景（左）'], ['headerTo','ヘッダー背景（右）'], ['headerText','ヘッダーの文字色'],
  ['link','リンク・「期間限定」ラベル'], ['ok','「可」・特典価格の色'], ['ng','「不可」・対象外の色'],
  ['trial','「試験施策」ラベル']
];

var SETTING_ROWS = [
  ['title','サイト名'], ['subtitle','サブタイトル'], ['icon','ヘッダーアイコン'], ['matrixNotes','重畳表の注記']
];

var HISTORY_MAX = 50;
var CACHE_KEY = 'data';
var CACHE_SEC = 300;

// ---------------------------------------------------------------- 入口

function doGet() {
  return json_({ok: true, message: 'キャンペーン確認サイト API は動いています'});
}

function doPost(e) {
  var req;
  try { req = JSON.parse(e.postData.contents); }
  catch (err) { return json_({ok: false, error: 'bad_request'}); }

  var props = PropertiesService.getScriptProperties();
  var pass = props.getProperty('PASSWORD') || '2121';
  var adminPass = props.getProperty('ADMIN_PASSWORD') || pass;

  try {
    if (req.action === 'get') {
      if (req.pass !== pass && req.pass !== adminPass) return authFail_();
      return json_({ok: true, data: getData_(), updatedAt: updatedAt_()});
    }
    if (req.pass !== adminPass) return authFail_();
    if (req.action === 'adminGet') {
      var d = readAll_();  // 管理画面は常にシートから直接読む（キャッシュを使わない）
      d.updatedAt = updatedAt_();
      return json_({ok: true, data: d, updatedAt: d.updatedAt});
    }
    if (req.action === 'save')       return json_(save_(req));
    if (req.action === 'history')    return json_({ok: true, items: historyList_()});
    if (req.action === 'historyGet') return json_({ok: true, data: historyGet_(req.row)});
    return json_({ok: false, error: 'unknown_action'});
  } catch (err) {
    return json_({ok: false, error: 'server', message: String(err && err.message || err)});
  }
}

// スプレッドシートを手で編集したら、キャッシュを捨ててすぐ反映させる（シンプルトリガー）
function onEdit(e) {
  try {
    var name = e && e.range && e.range.getSheet().getName();
    if (name === SH.history) return;
    touch_();
  } catch (err) {}
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('🛠 キャンペーンサイト')
    .addItem('サイトにすぐ反映（キャッシュ削除）', 'clearCache')
    .addToUi();
}

function clearCache() {
  touch_();
  SpreadsheetApp.getActive().toast('サイトに反映しました（次に開いたときから最新になります）');
}

// ---------------------------------------------------------------- 読み込み

function getData_() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get(CACHE_KEY);
  if (hit) return JSON.parse(hit);
  var d = readAll_();
  d.updatedAt = updatedAt_();
  var s = JSON.stringify(d);
  if (s.length < 90000) cache.put(CACHE_KEY, s, CACHE_SEC);
  return d;
}

function readAll_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var d = {version: 2, settings: {}, themes: [], campaigns: [], details: {}, combos: {}, others: []};

  rows_(ss, SH.campaigns).forEach(function (r) {
    var id = str_(r['ID']);
    if (!id) return;
    var c = {
      id: id,
      hidden: str_(r['表示']) === SHOW.hide,
      name: str_(r['キャンペーン名']),
      label: str_(r['短い名前']),
      category: rev_(CAT, r['分類']) || 'limited',
      status: str_(r['ラベル']),
      icon: str_(r['アイコン']),
      subtitle: str_(r['サブタイトル']),
      period: str_(r['期間（表示文）']),
      start: date_(r['開始日']),
      end: date_(r['終了日']),
      highlight: str_(r['目玉']),
      price_old: str_(r['通常価格']),
      price_new: str_(r['特典価格']),
      aipo: str_(r['AipoURL']),
      matrix: rev_(MATRIX, r['重畳表']) || 'both',
      kojihi: null
    };
    var kt = str_(r['工事費_タイトル']), ktot = str_(r['工事費_総額']), km = str_(r['工事費_月額']);
    if (kt || ktot || km) c.kojihi = {title: kt, total: ktot, monthly: km};
    d.campaigns.push(c);
    d.details[id] = [];
  });

  rows_(ss, SH.details).forEach(function (r) {
    var id = str_(r['キャンペーンID']), text = str_(r['内容']);
    if (!id || !text) return;
    (d.details[id] = d.details[id] || []).push({type: rev_(DTYPE, r['種類']) || 'note', text: text});
  });

  rows_(ss, SH.combos).forEach(function (r) {
    var id = str_(r['キャンペーンID']), to = str_(r['相手ID']), v = rev_(COMBO, r['可否']);
    if (!id || !to || !v) return;
    (d.combos[id] = d.combos[id] || []).push({to: to, r: v});
  });

  rows_(ss, SH.others).forEach(function (r) {
    var id = str_(r['ID']);
    if (id) d.others.push({id: id, name: str_(r['名前'])});
  });

  rows_(ss, SH.themes).forEach(function (r) {
    var name = str_(r['テーマ名']);
    if (!name) return;
    var colors = {};
    THEME_KEYS.forEach(function (k) {
      var v = str_(r[k[1]]);
      if (/^#[0-9a-fA-F]{6}$/.test(v)) colors[k[0]] = v;
    });
    d.themes.push({name: name, start: date_(r['適用開始日']), colors: colors});
  });

  var labelToKey = {};
  SETTING_ROWS.forEach(function (s) { labelToKey[s[1]] = s[0]; });
  rows_(ss, SH.settings).forEach(function (r) {
    var key = labelToKey[str_(r['項目'])];
    if (key) d.settings[key] = str_(r['値']);
  });

  return d;
}

// 1行目を見出しとして、行ごとに {見出し: 値} を返す（列の並び替えに強い）
function rows_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  var v = sh.getDataRange().getDisplayValues();
  var head = v[0].map(function (h) { return String(h).trim(); });
  return v.slice(1).map(function (row) {
    var o = {};
    head.forEach(function (h, i) { o[h] = row[i]; });
    return o;
  });
}

// ---------------------------------------------------------------- 保存

function save_(req) {
  var d = req.data;
  if (!d || !d.campaigns || !d.campaigns.length) return {ok: false, error: 'empty'};

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return {ok: false, error: 'busy'};
  try {
    var cur = updatedAt_();
    if (!req.force && cur && req.baseUpdatedAt !== cur) {
      return {ok: false, error: 'conflict', updatedAt: cur};
    }
    writeAll_(d);
    var now = touch_();
    pushHistory_(d, now);
    return {ok: true, updatedAt: now};
  } finally {
    lock.releaseLock();
  }
}

function writeAll_(d) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var names = {};
  d.campaigns.forEach(function (c) { names[c.id] = c.label || c.name; });
  (d.others || []).forEach(function (o) { names[o.id] = o.name; });

  writeSheet_(ss, SH.campaigns, CAMPAIGN_COLS.map(function (c) { return c[1]; }),
    d.campaigns.map(function (c) {
      var k = c.kojihi || {};
      var v = {
        id: c.id, visible: c.hidden ? SHOW.hide : SHOW.show, name: c.name, label: c.label,
        category: CAT[c.category] || CAT.limited, status: c.status, icon: c.icon,
        subtitle: c.subtitle, period: c.period, start: c.start, end: c.end,
        highlight: c.highlight, price_old: c.price_old, price_new: c.price_new, aipo: c.aipo,
        kj_title: k.title, kj_total: k.total, kj_monthly: k.monthly,
        matrix: MATRIX[c.matrix] || MATRIX.both
      };
      return CAMPAIGN_COLS.map(function (col) { return v[col[0]] == null ? '' : String(v[col[0]]); });
    }),
    {'表示': vals_(SHOW), '分類': vals_(CAT), '重畳表': vals_(MATRIX)},
    [70, 70, 260, 160, 90, 90, 60, 160, 200, 100, 100, 260, 90, 200, 260, 90, 90, 90, 80]);

  var det = [];
  d.campaigns.forEach(function (c) {
    ((d.details || {})[c.id] || []).forEach(function (x) {
      det.push([c.id, c.name, DTYPE[x.type] || DTYPE.note, x.text]);
    });
  });
  writeSheet_(ss, SH.details, ['キャンペーンID', 'キャンペーン名（参考）', '種類', '内容'], det,
    {'種類': vals_(DTYPE)}, [100, 240, 80, 600]);

  var cmb = [];
  d.campaigns.forEach(function (c) {
    ((d.combos || {})[c.id] || []).forEach(function (x) {
      cmb.push([c.id, c.name, x.to, names[x.to] || x.to, COMBO[x.r] || COMBO.ok]);
    });
  });
  writeSheet_(ss, SH.combos, ['キャンペーンID', 'キャンペーン名（参考）', '相手ID', '相手の名前（参考）', '可否'], cmb,
    {'可否': vals_(COMBO)}, [100, 260, 80, 220, 60]);

  writeSheet_(ss, SH.others, ['ID', '名前'],
    (d.others || []).map(function (o) { return [o.id, o.name]; }), {}, [100, 220]);

  writeSheet_(ss, SH.themes, ['テーマ名', '適用開始日'].concat(THEME_KEYS.map(function (k) { return k[1]; })),
    (d.themes || []).map(function (t) {
      return [t.name, t.start || ''].concat(THEME_KEYS.map(function (k) { return (t.colors || {})[k[0]] || ''; }));
    }), {}, null);

  var s = d.settings || {};
  writeSheet_(ss, SH.settings, ['項目', '値'],
    SETTING_ROWS.map(function (r) { return [r[1], s[r[0]] == null ? '' : String(s[r[0]])]; }), {}, [160, 600]);

  // 余分な既定シート（シート1）が空なら片付ける
  var first = ss.getSheetByName('シート1') || ss.getSheetByName('Sheet1');
  if (first && first.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(first);
}

function writeSheet_(ss, name, header, rows, validations, widths) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  var maxR = sh.getMaxRows(), maxC = sh.getMaxColumns();
  sh.getRange(1, 1, maxR, maxC).clearDataValidations();
  sh.clear();
  if (maxC < header.length) sh.insertColumnsAfter(maxC, header.length - maxC);
  var need = rows.length + 51;
  if (sh.getMaxRows() < need) sh.insertRowsAfter(sh.getMaxRows(), need - sh.getMaxRows());

  sh.getRange(1, 1, 1, header.length).setValues([header])
    .setFontWeight('bold').setBackground('#fde7dc').setWrap(true);
  sh.setFrozenRows(1);
  // 文字列のまま保存（日付や「24,000」が勝手に変換されないように）
  sh.getRange(2, 1, need - 1, header.length).setNumberFormat('@').setVerticalAlignment('top').setWrap(true);
  if (rows.length) sh.getRange(2, 1, rows.length, header.length).setValues(rows);

  Object.keys(validations || {}).forEach(function (h) {
    var col = header.indexOf(h) + 1;
    if (!col) return;
    var rule = SpreadsheetApp.newDataValidation().requireValueInList(validations[h], true).setAllowInvalid(false).build();
    sh.getRange(2, col, need - 1, 1).setDataValidation(rule);
  });
  if (widths) widths.forEach(function (w, i) { if (w) sh.setColumnWidth(i + 1, w); });
}

// ---------------------------------------------------------------- 履歴

function pushHistory_(d, at) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SH.history);
  if (!sh) {
    sh = ss.insertSheet(SH.history);
    sh.getRange(1, 1, 1, 2).setValues([['保存日時', '内容（JSON・編集しないでください）']]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  var s = JSON.stringify(d);
  var chunks = [];
  for (var i = 0; i < s.length; i += 45000) chunks.push(s.substring(i, i + 45000));
  var stamp = Utilities.formatDate(new Date(at), Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss');
  sh.insertRowBefore(2);
  if (sh.getMaxColumns() < chunks.length + 1) sh.insertColumnsAfter(sh.getMaxColumns(), chunks.length + 1 - sh.getMaxColumns());
  sh.getRange(2, 1, 1, chunks.length + 1).setNumberFormat('@').setValues([[stamp].concat(chunks)]).setWrap(false);
  var last = sh.getLastRow();
  if (last > HISTORY_MAX + 1) sh.deleteRows(HISTORY_MAX + 2, last - HISTORY_MAX - 1);
}

function historyList_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SH.history);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 1).getDisplayValues().map(function (r, i) {
    return {row: i + 2, at: r[0]};
  });
}

function historyGet_(row) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SH.history);
  row = Number(row);
  if (!sh || !(row >= 2) || row > sh.getLastRow()) throw new Error('履歴が見つかりません');
  var v = sh.getRange(row, 2, 1, sh.getLastColumn() - 1).getValues()[0];
  return JSON.parse(v.join(''));
}

// ---------------------------------------------------------------- 小物

function updatedAt_() {
  return PropertiesService.getScriptProperties().getProperty('UPDATED_AT') || '';
}

function touch_() {
  var now = new Date().toISOString();
  PropertiesService.getScriptProperties().setProperty('UPDATED_AT', now);
  CacheService.getScriptCache().remove(CACHE_KEY);
  return now;
}

function authFail_() {
  Utilities.sleep(800);
  return json_({ok: false, error: 'auth'});
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function str_(v) { return v == null ? '' : String(v).trim(); }

function vals_(map) { return Object.keys(map).map(function (k) { return map[k]; }); }

function rev_(map, label) {
  label = str_(label);
  for (var k in map) if (map[k] === label) return k;
  return '';
}

// '2026/7/1'・'2026-07-01'・'2026年7月1日' → '2026-07-01'
function date_(v) {
  var m = str_(v).match(/^(\d{4})[\/\-.年](\d{1,2})[\/\-.月](\d{1,2})/);
  if (!m) return '';
  return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
}
