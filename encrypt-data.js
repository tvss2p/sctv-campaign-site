const crypto = require('crypto');

// 各キャンペーンの start / end（YYYY-MM-DD・両端含む）でブラウザ側が表示を自動出し分けする。
// start 省略 = 過去から有効 / end 省略 = 終了日未定（常に有効）。
// 2026/7/1 改定：期限切れ（c1・c2・c3）と佐野短大学割（c6）は end=2026-06-30 で7/1に自動非表示。
//                新規3施策（c10 選べる特典 / c11 新規TV工事費割引 / c12 本気応援）は start=2026-07-01 で7/1に自動表示。
const DATA = {
  campaigns:[
    {id:'c1',name:'新規テレビ加入工事費無料キャンペーン',category:'limited',status:'期間限定',period:'2026/3/1 ～ 6/30',subtitle:'～ 2026年6月30日',highlight:'新規加入工事費',price_old:'29,700円',price_new:'無料',aipo:'https://app.aipo.com/apps/bbs/topics/45475',icon:'📺',end:'2026-06-30'},
    {id:'c2',name:'インターネット1G 最大3ヶ月無料キャンペーン',category:'limited',status:'期間限定',period:'～ 2026年6月30日（7月末までに工事完了要）',subtitle:'～ 2026年6月30日',highlight:'工事月＋2ヶ月 = 最大3ヶ月間 1G利用料',price_old:'',price_new:'無料',aipo:'https://app.aipo.com/apps/bbs/topics/45487',icon:'🌐',end:'2026-06-30'},
    {id:'c3',name:'半年半額デジ録T（P）おためしキャンペーン',category:'closed',status:'クローズド',period:'2026/3/1 ～ 6/30（在庫により休止あり）',subtitle:'～ 2026年6月30日予定',highlight:'変更月翌月から6ヶ月間 デジ録T（P）半額',price_old:'5,390円',price_new:'2,695円',aipo:'https://app.aipo.com/apps/bbs/topics/45424',icon:'📹',end:'2026-06-30'},
    {id:'c10',name:'インターネット選べる特典',category:'limited',status:'期間限定',period:'2026/7/1 ～ 10/31',subtitle:'～ 2026年10月31日',highlight:'10G・1G 新規/追加申込で3特典から1つ選択（併用不可）',price_old:'',price_new:'①3ヶ月無料 ②紹介双方5,000円 ③サムディー券10,000円',aipo:'https://app.aipo.com/apps/bbs/topics/46103',icon:'🎁',start:'2026-07-01',end:'2026-10-31'},
    {id:'c11',name:'新規テレビ加入工事費割引キャンペーン',category:'limited',status:'期間限定',period:'2026/7/1 ～ 10/31',subtitle:'～ 2026年10月31日',highlight:'期間中にTVサービス新規申込で加入工事費を割引',price_old:'29,700円',price_new:'11,000円',aipo:'https://app.aipo.com/apps/bbs/topics/46103',icon:'📺',start:'2026-07-01',end:'2026-10-31'},
    {id:'c12',name:'本気応援キャンペーン（SNS限定）',category:'limited',status:'SNS限定',period:'最終受付 2026/8/31（予定）／9月末までに開通',subtitle:'SNS広告限定',highlight:'2万円キャッシュバック ＋ 他社違約金 最大2万円還元',price_old:'',price_new:'現金20,000円＋違約金最大20,000円還元（各郵便為替）',aipo:'',icon:'🔥',start:'2026-07-01',end:'2026-09-30'},
    {id:'c8',name:'ネット工事費実質無料（新規特約）',category:'always',status:'常設',period:'',subtitle:'',highlight:'工事費24,000円 ÷ 24ヶ月 = 月々-1,000円',price_old:'',price_new:'実質無料',aipo:'',icon:'⚙️',kojihi:{title:'新規特約',total:'24,000',monthly:'-1,000'}},
    {id:'c9',name:'ネット工事費実質無料（追加特約）',category:'always',status:'常設',period:'',subtitle:'',highlight:'工事費12,000円 ÷ 24ヶ月 = 月々-500円',price_old:'',price_new:'実質無料',aipo:'',icon:'⚙️',kojihi:{title:'追加特約',total:'12,000',monthly:'-500'}},
    {id:'c4',name:'お友だち紹介特典',category:'always',status:'常設',period:'',subtitle:'新規・追加 対象',highlight:'紹介者＋新規加入者',price_old:'',price_new:'双方5,000円',aipo:'https://app.aipo.com/apps/bbs/topics/40920',icon:'👥'},
    {id:'c5',name:'新築リフォーム特典',category:'always',status:'常設',period:'',subtitle:'新規 対象',highlight:'全キャンペーンと併用可',price_old:'',price_new:'',aipo:'https://app.aipo.com/apps/bbs/topics/36205',icon:'🏠'},
    {id:'c6',name:'佐野日本大学短期大学生限定 学割',category:'trial',status:'試験施策',period:'2025/6/20 ～ 2026/6/30（トライアル中）',subtitle:'～ 2026年6月末（トライアル）',highlight:'工事翌月より月々1,100円×最大24ヶ月',price_old:'',price_new:'最大26,400円割引',aipo:'https://app.aipo.com/apps/bbs/topics/44439',icon:'🎓',end:'2026-06-30'},
    {id:'c7',name:'テレビとくとくプラン（対象施設限定）',category:'trial',status:'試験施策',period:'終了日未定',subtitle:'終了日未定',highlight:'STB・デジ録T・BDT全コースを2台目以降と同じ料金で利用可能',price_old:'',price_new:'',aipo:'https://app.aipo.com/apps/bbs/topics/45680',icon:'🏥'},
  ],
  details:{
    c1:[
      {type:'ok',text:'テレビサービスを新規申込のお客様'},
      {type:'ok',text:'再送信・BSダイレクト・STB・デジ録T/BDT 全プラン対象'},
      {type:'ng',text:'対応集合住宅は対象外（未対応集合は可）'},
      {type:'note',text:'各月先着10名・期間中計40名（※申込件数に上限なし。営業トーク用）'},
      {type:'note',text:'最低利用期間：再送信2年 / 機器設置あり1年（違約金29,700円）'},
      {type:'note',text:'申し込みと同時のコース変更予約は不可（アップはいつでも可）'},
      {type:'note',text:'一契約一回限り'},
    ],
    c2:[
      {type:'ok',text:'佐野市内・工事可能物件でネット1Gを新規または追加申込のお客様'},
      {type:'ok',text:'集合住宅でFTTH個人引込の場合も対象（HFCはFTTH切替後対象）'},
      {type:'ng',text:'1G以外のコース・既存コースアップは対象外'},
      {type:'note',text:'無料期間中のコースダウン不可'},
      {type:'note',text:'最終月に連絡なければ4ヶ月目から通常料金で自動課金'},
      {type:'note',text:'支払方法：口座振替・クレジット払いのみ'},
      {type:'note',text:'過去1年以内の滞納歴がある場合は対象外'},
      {type:'note',text:'一契約一回限り'},
    ],
    c3:[
      {type:'ok',text:'FTTH工事済み・既加入者（再送信・STB・デジ録T(M)(E)）'},
      {type:'ok',text:'新規・追加（BDT希望者以外全員）'},
      {type:'ng',text:'対応集合住宅、既存BDT/デジ録(P)利用者は対象外'},
      {type:'ng',text:'前回利用後コースダウンしたお客様は対象外'},
      {type:'note',text:'半額期間中のコースダウン不可'},
      {type:'note',text:'6ヶ月目に連絡なければ7ヶ月目から通常料金（5,390円）で自動課金'},
      {type:'note',text:'チラシなし。スタッフから対象顧客に直接案内'},
      {type:'note',text:'申込月含む3ヶ月以内に設置・コースUPできない場合は適用外'},
      {type:'note',text:'支払方法：口座振替・クレジット払いのみ'},
      {type:'note',text:'一契約一回限り'},
    ],
    c10:[
      {type:'ok',text:'期間中に10G・1Gコースを新規・追加で申込みのお客様'},
      {type:'ok',text:'下記①②③から1つ選択（今回は併用不可・どれか一つ）'},
      {type:'note',text:'特典①：10G・1G利用料3ヶ月無料（10G 6,380円×3＝19,140円／1G 5,489円×3＝16,467円）'},
      {type:'note',text:'特典②：お友だち紹介特典 紹介者5,000円＋紹介された方5,000円（計10,000円）'},
      {type:'note',text:'特典③：サムディー券 通常5,000円→10,000円（計10,000円）'},
      {type:'ng',text:'30M・10M・3M申込みは特典①対象外（②③のどちらかを選択）'},
      {type:'note',text:'3Mは売り止め。受付は9/30まで。10/1～の最小コースは6M'},
      {type:'note',text:'追加の場合は申込時に滞納金が無いお客様'},
      {type:'note',text:'クレジットカード又は口座登録が必須（または登録済み）'},
      {type:'note',text:'工事費特約・違約金は通常通り適用（6M契約時は違約金2,970円）'},
      {type:'note',text:'①②を選んだお客様には通常のサムディー券（5,000円券）は出さない'},
      {type:'note',text:'通信登録時：サムディー券は5,000円×2枚で渡す。テプラは名前の後ろに①②を記載'},
      {type:'note',text:'取次店紹介・デジ録半々CPは併用可。その他キャンペーン（3ヶ月無料・紹介・5,000円券等）は併用不可'},
      {type:'note',text:'A3申込書 備考欄に【①3ヶ月無料】【②お友達紹介】【③サムディー券】を記載。専用申込書（複写）に記入'},
      {type:'note',text:'受付はキャンペーン専用申込書が必須（頂けない場合は適用不可）。電話受けは内容案内のうえ営業でアポ'},
    ],
    c11:[
      {type:'ok',text:'期間中にTVのみ／TV+CPに加入、または通信のみ加入中の方のテレビ各コース申込み（全コース対象）'},
      {type:'ok',text:'再送信・BSダイレクト・STB・デジ録T/BDT どのプランでも可'},
      {type:'note',text:'通信既加入者はキャンペーン価格 8,800円→0円（オープンキャンペーン）'},
      {type:'ng',text:'対応集合住宅は対象外。未対応集合は可（加入工事費29,700円のお客様が対象）'},
      {type:'note',text:'対応集合で4K視聴のため個人引込するお客様は対象'},
      {type:'note',text:'継続利用「課金開始月（工事翌月）から2年or1年」が条件で29,700円→11,000円に割引'},
      {type:'note',text:'再送信は最低利用2年／STB等機器設置ありは最低利用1年'},
      {type:'note',text:'(M)コースは「BSダイレクト」で対応。tvk・チバテレビ・TOKYO MX視聴希望は機器設置'},
      {type:'note',text:'継続利用期間中の途中解約は工事費差額18,700円を解約翌月に一括請求（通信既加入者は8,800円を一括請求）'},
      {type:'note',text:'継続利用期間終了後はキャンペーン満了。違約金等は不要'},
      {type:'note',text:'申込みと同時の解約・コース変更予約は不可（アップはいつでも可・最低利用期間は変わらず）。再送信への変更は1年間不可'},
      {type:'note',text:'各プラン月額利用料は通常通り課金。一契約一回限り。クレジットカード又は口座登録が必須'},
      {type:'note',text:'お友だち紹介特典・取次店紹介と併用可（お友達紹介は客から言われた場合のみ適用）'},
      {type:'note',text:'A3申込書：新規工事費29,700円／余白に新規加入工事費割引CP▲18,700／合計\\11,000。備考欄にキャンペーン適用を記載'},
      {type:'note',text:'通信既加入者：新規工事費8,800円／余白に加入工事費割引CP▲8,800／合計\\0。専用申込書（複写）に記入'},
    ],
    c12:[
      {type:'ok',text:'新規のお客様'},
      {type:'ok',text:'ネット1Gまたは10Gコースを申込み'},
      {type:'ok',text:'2026年9月末までに開通'},
      {type:'ok',text:'料金の支払いに遅延がないこと'},
      {type:'note',text:'告知媒体はSNS広告のみ。受付期間は広告出稿に合わせ変動（最終受付期日 2026年8月31日・予定）'},
      {type:'note',text:'特典：2万円キャッシュバック（郵便為替）＋他社違約金 最大2万円還元（郵便為替）'},
      {type:'note',text:'キャッシュバックは初回料金引落しの翌月中に契約住所へ郵便為替を郵送'},
      {type:'note',text:'違約金還元は開通から6ヶ月以内に支払証明を提出、確認翌月中に郵送。1〜10,000円→10,000円／10,001円以上→20,000円。2万CBと還元は別発送'},
      {type:'note',text:'違約金証明はLINE公式へ写真提出 or 来社提出。必要情報3点：他社事業者名・サービス名称・金額'},
      {type:'note',text:'重畳適用：新規工事費特約のみ可。その他全施策（お友だち紹介含む）は不可'},
      {type:'note',text:'申込：SNS広告から専用サイト経由 or 電話で「広告を見た」。コンタクトに「SNS広告からのお申し込み」入力。新規カウントは別枠'},
      {type:'note',text:'A3申込書 備考欄に「本気応援キャンペーン」記入。完了コンタクトにも同様に記載'},
      {type:'note',text:'DCBEE班：申込み対象者一覧へ顧客コードと工事予定日を入力。A3申込書をA4縮小コピーし乗り換えキャッシュバックファイル（緑）へファイリング'},
    ],
    c8:[{type:'note',text:'ネット継続利用が前提。途中解約の場合は残額請求あり'}],
    c9:[{type:'note',text:'ネット継続利用が前提。途中解約の場合は残額請求あり'}],
    c4:[
      {type:'note',text:'取次店へ7,000円（新規・引込あり）'},
      {type:'note',text:'取次店へ4,000円（アップセル・引込あり）'},
      {type:'note',text:'取次店へ3,000円（アップセル・引込なし）'},
      {type:'note',text:'クオカード3,000円＋番組グッズ（新規・引込なし）'},
    ],
    c5:[
      {type:'ok',text:'全てのキャンペーンと併用可'},
    ],
    c6:[
      {type:'ok',text:'開通日時点で佐野日本大学短期大学に在学中または入学決定していること'},
      {type:'ok',text:'ネット30M・1G・10Gコースを新規または追加契約'},
      {type:'ok',text:'追加申込の場合、支払い遅延・未納がないこと'},
      {type:'ng',text:'現在佐野ケーブルテレビのネット契約中のお客様は対象外'},
      {type:'note',text:'支払優先順位：①親御様クレカ ②親御様口座 ③学生クレカ ④学生口座'},
      {type:'note',text:'賃貸物件の場合はクレカのみ受付'},
    ],
    c7:[
      {type:'ok',text:'対象施設で新規設置のお客様：工事翌月の初回請求分から'},
      {type:'note',text:'既設置のお客様：同施設で新規契約発生翌月より料金変更'},
      {type:'note',text:'年齢に関係なく、まずクレジット払いを案内'},
      {type:'note',text:'クレカ不所持・作成不可の場合のみ口座振替可'},
      {type:'note',text:'口座振替の場合：①〜③を満たせば受付可'},
      {type:'note',text:'①同意者にその場で電話（優先順位：家族・親族→友人→施設担当者）'},
      {type:'note',text:'②その場で連絡不可の場合は営業担当から後日連絡'},
      {type:'note',text:'③同意者に「滞納3ヶ月で連絡・機器撤去の立ち合い依頼」の旨を案内'},
      {type:'note',text:'A3申込書：同意者欄に名前・続柄・連絡先、備考欄に住所'},
    ],
  },
  combos:{
    c1:[{to:'c3',r:'ok'},{to:'c4',r:'ok'},{to:'c5',r:'ok'}],
    c2:[{to:'c6',r:'ng'},{to:'c4',r:'ok'},{to:'c5',r:'ok'},{to:'c7',r:'ok'},{to:'c8',r:'ok'},{to:'c9',r:'ok'}],
    c3:[{to:'c1',r:'ok'},{to:'c6',r:'ok'},{to:'c4',r:'ok'},{to:'c5',r:'ok'},{to:'c7',r:'ng'}],
    c6:[{to:'c2',r:'ng'},{to:'c3',r:'ok'},{to:'c4',r:'ok'},{to:'c5',r:'ok'},{to:'c8',r:'ok'},{to:'c9',r:'ok'}],
    c7:[{to:'c2',r:'ok'},{to:'c3',r:'ng'},{to:'c4',r:'ng'}],
    c10:[{to:'c4',r:'ng'},{to:'c5',r:'ok'},{to:'c8',r:'ok'},{to:'c9',r:'ok'},{to:'c11',r:'ok'},{to:'c12',r:'ng'}],
    c11:[{to:'c4',r:'ok'},{to:'c5',r:'ok'},{to:'c10',r:'ok'},{to:'c12',r:'ng'}],
    c12:[{to:'c4',r:'ng'},{to:'c5',r:'ng'},{to:'c8',r:'ok'},{to:'c9',r:'ng'},{to:'c10',r:'ng'},{to:'c11',r:'ng'}],
    c8:[{to:'c2',r:'ok'},{to:'c4',r:'ok'},{to:'c5',r:'ok'},{to:'c6',r:'ok'},{to:'c10',r:'ok'},{to:'c12',r:'ok'}],
    c9:[{to:'c2',r:'ok'},{to:'c4',r:'ok'},{to:'c5',r:'ok'},{to:'c6',r:'ok'},{to:'c10',r:'ok'}],
  },
  targetLabels:{c1:'新規TV工事費無料',c2:'1G 3ヶ月無料',c3:'半々デジ録T（P）',c4:'お友だち紹介',c5:'新築リフォーム',c6:'佐野短大学割',c7:'テレビとくとくプラン（対象施設限定）',c8:'ネット工事費実質無料（新規）',c9:'ネット工事費実質無料（追加）',c10:'ネット選べる特典',c11:'新規TV工事費割引',c12:'本気応援CP（SNS）'},
};

const PASS = '2121';
const plaintext = JSON.stringify(DATA);
const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const key = crypto.pbkdf2Sync(PASS, salt, 100000, 32, 'sha256');
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
const authTag = cipher.getAuthTag();

// blob = salt(16) | iv(12) | ciphertext | authTag(16)
const blob = Buffer.concat([salt, iv, ciphertext, authTag]);
process.stdout.write(blob.toString('base64'));
