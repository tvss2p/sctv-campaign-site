// index.html（閲覧サイト）と admin.html（管理画面）の共通処理
// ・テーマ（配色）の定義と適用
// ・旧形式データ（暗号化内蔵データ）→ 新形式への変換
// ・API（Google Apps Script）呼び出し

// ---------- テーマ（配色） ----------
// key は gas/Code.gs の THEME_KEYS と一致させること（スプレッドシートの列見出しになる）
var THEME_KEYS = [
  {key:'bg',         css:'--bg',          label:'ページの背景'},
  {key:'surface',    css:'--surface',     label:'カードの背景'},
  {key:'surface2',   css:'--surface2',    label:'カード内の帯・ボックス'},
  {key:'border',     css:'--border',      label:'枠線'},
  {key:'text',       css:'--text',        label:'文字色'},
  {key:'textMuted',  css:'--text-muted',  label:'補足の文字色（薄め）'},
  {key:'main',       css:'--main',        label:'メインカラー（タブ・見出し・期間）'},
  {key:'mainDeep',   css:'--main-deep',   label:'メインカラー（濃いめ）'},
  {key:'headerFrom', css:'--header-from', label:'ヘッダー背景（左）'},
  {key:'headerTo',   css:'--header-to',   label:'ヘッダー背景（右）'},
  {key:'headerText', css:'--header-text', label:'ヘッダーの文字色'},
  {key:'link',       css:'--link',        label:'リンク・「期間限定」ラベル'},
  {key:'ok',         css:'--ok',          label:'「可」・特典価格の色'},
  {key:'ng',         css:'--ng',          label:'「不可」・対象外の色'},
  {key:'trial',      css:'--trial',       label:'「試験施策」ラベル'}
];

var THEME_PRESETS = [
  {id:'dark', name:'ダーク（オレンジ）', colors:{bg:'#0f1117',surface:'#1a1d27',surface2:'#22263a',border:'#2e3350',text:'#e8eaf6',textMuted:'#8b90b0',main:'#f7934f',mainDeep:'#e8752a',headerFrom:'#1e1a12',headerTo:'#12152b',headerText:'#e8eaf6',link:'#4f8ef7',ok:'#3ecf8e',ng:'#f75f5f',trial:'#f7934f'}},
  {id:'summer', name:'夏（サーモン）', colors:{bg:'#fff6f1',surface:'#ffffff',surface2:'#fff0e8',border:'#f4d6c8',text:'#3c2a24',textMuted:'#a08576',main:'#fb7e5d',mainDeep:'#ef6244',headerFrom:'#ff9e74',headerTo:'#f76d72',headerText:'#ffffff',link:'#0f8f8f',ok:'#15a06a',ng:'#e0533c',trial:'#ef6244'}},
  {id:'autumn', name:'秋（紅葉）', colors:{bg:'#fbf6ef',surface:'#ffffff',surface2:'#f6ece0',border:'#e8d6c0',text:'#3b2b1f',textMuted:'#9a8371',main:'#c8642a',mainDeep:'#a84a1c',headerFrom:'#d0743a',headerTo:'#8e3b2a',headerText:'#ffffff',link:'#2f7a6d',ok:'#3d8b4f',ng:'#c23b2a',trial:'#b8572a'}},
  {id:'winter', name:'冬（ネイビー）', colors:{bg:'#f2f5fa',surface:'#ffffff',surface2:'#e8eef7',border:'#d3dcea',text:'#1f2a3c',textMuted:'#7b8799',main:'#3a6fd8',mainDeep:'#2453b3',headerFrom:'#2c4f8f',headerTo:'#1b2f5a',headerText:'#ffffff',link:'#2b78c2',ok:'#1f9d6b',ng:'#d64545',trial:'#c26a2b'}},
  {id:'spring', name:'春（さくら）', colors:{bg:'#fff7fa',surface:'#ffffff',surface2:'#fdeef3',border:'#f3d3df',text:'#3d2a33',textMuted:'#a3828f',main:'#e86a92',mainDeep:'#cf4d77',headerFrom:'#f592b0',headerTo:'#e0759b',headerText:'#ffffff',link:'#3a8f6a',ok:'#2f9d64',ng:'#d9474f',trial:'#cf4d77'}},
  {id:'simple', name:'シンプル（白）', colors:{bg:'#f5f6f8',surface:'#ffffff',surface2:'#f0f2f5',border:'#dde1e7',text:'#222831',textMuted:'#80868f',main:'#2f6fed',mainDeep:'#1f55c4',headerFrom:'#ffffff',headerTo:'#f0f2f5',headerText:'#222831',link:'#2f6fed',ok:'#1e9e62',ng:'#d64040',trial:'#e07b24'}}
];

function presetColors(id){
  for(var i=0;i<THEME_PRESETS.length;i++) if(THEME_PRESETS[i].id===id) return Object.assign({},THEME_PRESETS[i].colors);
  return Object.assign({},THEME_PRESETS[0].colors);
}

// これまでの動き（〜6/30 ダーク／7/1〜 夏）を再現する既定テーマ
function defaultThemes(){
  return [
    {name:'ダーク（オレンジ）', start:'', colors:presetColors('dark')},
    {name:'夏（サーモン）', start:'2026-07-01', colors:presetColors('summer')}
  ];
}

// 適用開始日が基準日以前のテーマのうち、開始日が最も新しいものを使う（空欄＝常時）
function pickTheme(themes, date){
  var list=(themes&&themes.length)?themes:defaultThemes();
  var today=ymd(date||new Date());
  var best=null, bestIdx=-1;
  list.forEach(function(t,i){
    var s=t.start||'';
    if(s && s>today) return;
    if(!best || s>=(best.start||'')){best=t;bestIdx=i;}
  });
  if(!best){best=list[0];bestIdx=0;}
  return {theme:best, index:bestIdx, colors:Object.assign(presetColors('dark'), best.colors||{})};
}

function applyThemeColors(colors){
  var root=document.documentElement;
  var base=presetColors('dark');
  THEME_KEYS.forEach(function(k){
    var v=(colors&&isHex(colors[k.key]))?colors[k.key]:base[k.key];
    root.style.setProperty(k.css, v);
  });
  var meta=document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content', (colors&&colors.headerFrom)||base.headerFrom);
}

function isHex(s){ return typeof s==='string' && /^#[0-9a-fA-F]{6}$/.test(s); }

// ---------- 日付 ----------
function ymd(d){
  return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
}
// '2026/7/1' や '2026-07-01' を '2026-07-01' に揃える（不正なら ''）
function normDate(s){
  var m=String(s||'').trim().match(/^(\d{4})[\/\-.年](\d{1,2})[\/\-.月](\d{1,2})/);
  if(!m) return '';
  return m[1]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[3]).slice(-2);
}

// ---------- データ形式 ----------
var CATEGORIES = [
  {key:'limited', label:'期間限定', section:'期間限定キャンペーン'},
  {key:'closed',  label:'クローズド', section:'期間限定キャンペーン（クローズド）'},
  {key:'always',  label:'常設', section:'常設キャンペーン'},
  {key:'trial',   label:'試験施策', section:'試験施策'}
];

var DEFAULT_SETTINGS = {
  title:'キャンペーン確認サイト',
  subtitle:'社内スタッフ向け｜2026年度版',
  icon:'📋',
  matrixNotes:'※ お友だち紹介・新築リフォームは原則全キャンペーンと併用可\n※ ネット工事費実質無料はネット関係キャンペーン全て併用可'
};

var CAMPAIGN_FIELDS = ['id','name','label','category','status','icon','subtitle','period','start','end','highlight','price_old','price_new','aipo'];

// 旧形式（version なし）も新形式（version 2）に揃えて返す
function upgradeData(d){
  if(!d) return null;
  if(!(d.version>=2)){
    // 旧サイトで固定だった重畳表の行・列
    var ROW=['c1','c2','c3','c6','c7','c10','c11','c12','c8','c9'];
    var COL=['c1','c2','c3','c5','c6','c7','c10','c11','c12'];
    var tl=d.targetLabels||{};
    var ids={};
    var campaigns=(d.campaigns||[]).map(function(c){
      ids[c.id]=true;
      var r=ROW.indexOf(c.id)>=0, k=COL.indexOf(c.id)>=0;
      return Object.assign({},c,{label:tl[c.id]||c.name, hidden:false, matrix:r&&k?'both':r?'row':k?'col':'none'});
    });
    var others=Object.keys(tl).filter(function(id){return !ids[id];}).map(function(id){return {id:id,name:tl[id]};});
    d={version:2, settings:{}, themes:defaultThemes(), campaigns:campaigns, details:d.details||{}, combos:d.combos||{}, others:others};
  }
  var out={
    version:2,
    updatedAt:d.updatedAt||'',
    settings:Object.assign({},DEFAULT_SETTINGS,d.settings||{}),
    themes:(d.themes&&d.themes.length?d.themes:defaultThemes()).map(function(t){
      return {name:t.name||'テーマ', start:normDate(t.start), colors:Object.assign(presetColors('dark'),t.colors||{})};
    }),
    campaigns:(d.campaigns||[]).map(function(c){
      var o={};
      CAMPAIGN_FIELDS.forEach(function(f){o[f]=c[f]==null?'':String(c[f]);});
      o.start=normDate(o.start); o.end=normDate(o.end);
      if(!o.category) o.category='limited';
      if(!o.label) o.label=o.name;
      o.hidden=!!c.hidden;
      o.matrix=c.matrix||'both';
      var k=c.kojihi;
      o.kojihi=(k&&(k.title||k.total||k.monthly))?{title:k.title||'',total:k.total||'',monthly:k.monthly||''}:null;
      return o;
    }),
    details:{},
    combos:{},
    others:(d.others||[]).filter(function(o){return o&&o.id;}).map(function(o){return {id:String(o.id),name:o.name||''};})
  };
  out.campaigns.forEach(function(c){
    out.details[c.id]=((d.details||{})[c.id]||[]).map(function(x){return {type:x.type||'note',text:x.text||''};});
    if((d.combos||{})[c.id]) out.combos[c.id]=d.combos[c.id].map(function(x){return {to:x.to,r:x.r==='ng'?'ng':'ok'};});
  });
  return out;
}

function findCampaign(data,id){
  for(var i=0;i<data.campaigns.length;i++) if(data.campaigns[i].id===id) return data.campaigns[i];
  return null;
}
// 重畳表・重畳リストで使う短い名前
function labelOf(data,id){
  var c=findCampaign(data,id);
  if(c) return c.label||c.name;
  for(var i=0;i<data.others.length;i++) if(data.others[i].id===id) return data.others[i].name;
  return id;
}

// ---------- 文字の表示 ----------
function esc(s){
  return String(s==null?'':s).replace(/[&<>"']/g,function(ch){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
  });
}
// **太字** → 強調、!!文字!! → 赤字、改行 → <br>
function fmt(s){
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g,'<strong class="em">$1</strong>')
    .replace(/!!(.+?)!!/g,'<span class="em-red">$1</span>')
    .replace(/\r?\n/g,'<br>');
}

// ---------- API（Google Apps Script） ----------
function apiReady(){ return typeof API_URL==='string' && /^https:\/\//.test(API_URL); }

function apiCall(action, payload, timeoutMs){
  var ctrl=typeof AbortController!=='undefined'?new AbortController():null;
  var timer=ctrl?setTimeout(function(){ctrl.abort();},timeoutMs||20000):null;
  // Content-Type を text/plain にして CORS のプリフライトを避ける
  return fetch(API_URL,{
    method:'POST',
    headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify(Object.assign({action:action},payload||{})),
    signal:ctrl?ctrl.signal:undefined
  }).then(function(r){
    if(!r.ok) throw new Error('HTTP '+r.status);
    return r.json();
  }).finally(function(){ if(timer) clearTimeout(timer); });
}

// ---------- 内蔵データ（AES-GCM暗号化）の復号 ----------
async function decryptBlob(b64,pw){
  var buf=Uint8Array.from(atob(b64),function(c){return c.charCodeAt(0);});
  var salt=buf.slice(0,16);
  var iv=buf.slice(16,28);
  var data=buf.slice(28);
  var km=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']);
  var key=await crypto.subtle.deriveKey(
    {name:'PBKDF2',salt:salt,iterations:100000,hash:'SHA-256'},
    km,{name:'AES-GCM',length:256},false,['decrypt']
  );
  var dec=await crypto.subtle.decrypt({name:'AES-GCM',iv:iv},key,data);
  return new TextDecoder().decode(dec);
}
