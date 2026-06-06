const crypto = require('crypto');

const DATA = {
  campaigns:[
    {id:'c1',name:'新規テレビ加入工事費無料キャンペーン',category:'limited',status:'期間限定',period:'2026/3/1 ～ 6/30',subtitle:'～ 2026年6月30日',highlight:'新規加入工事費',price_old:'29,700円',price_new:'無料',aipo:'https://app.aipo.com/apps/bbs/topics/45475',icon:'📺'},
    {id:'c2',name:'インターネット1G 最大3ヶ月無料キャンペーン',category:'limited',status:'期間限定',period:'～ 2026年6月30日（7月末までに工事完了要）',subtitle:'～ 2026年6月30日',highlight:'工事月＋2ヶ月 = 最大3ヶ月間 1G利用料',price_old:'',price_new:'無料',aipo:'https://app.aipo.com/apps/bbs/topics/45487',icon:'🌐'},
    {id:'c3',name:'半年半額デジ録T（P）おためしキャンペーン',category:'closed',status:'クローズド',period:'2026/3/1 ～ 6/30（在庫により休止あり）',subtitle:'～ 2026年6月30日予定',highlight:'変更月翌月から6ヶ月間 デジ録T（P）半額',price_old:'5,390円',price_new:'2,695円',aipo:'https://app.aipo.com/apps/bbs/topics/45424',icon:'📹'},
    {id:'c8',name:'ネット工事費実質無料（新規特約）',category:'always',status:'常設',period:'',subtitle:'',highlight:'工事費24,000円 ÷ 24ヶ月 = 月々-1,000円',price_old:'',price_new:'実質無料',aipo:'',icon:'⚙️',kojihi:{title:'新規特約',total:'24,000',monthly:'-1,000'}},
    {id:'c9',name:'ネット工事費実質無料（追加特約）',category:'always',status:'常設',period:'',subtitle:'',highlight:'工事費12,000円 ÷ 24ヶ月 = 月々-500円',price_old:'',price_new:'実質無料',aipo:'',icon:'⚙️',kojihi:{title:'追加特約',total:'12,000',monthly:'-500'}},
    {id:'c4',name:'お友だち紹介特典',category:'always',status:'常設',period:'',subtitle:'新規・追加 対象',highlight:'紹介者＋新規加入者',price_old:'',price_new:'双方5,000円',aipo:'https://app.aipo.com/apps/bbs/topics/40920',icon:'👥'},
    {id:'c5',name:'新築リフォーム特典',category:'always',status:'常設',period:'',subtitle:'新規 対象',highlight:'全キャンペーンと併用可',price_old:'',price_new:'',aipo:'https://app.aipo.com/apps/bbs/topics/36205',icon:'🏠'},
    {id:'c6',name:'佐野日本大学短期大学生限定 学割',category:'trial',status:'試験施策',period:'2025/6/20 ～ 2026/6/30（トライアル中）',subtitle:'～ 2026年6月末（トライアル）',highlight:'工事翌月より月々1,100円×最大24ヶ月',price_old:'',price_new:'最大26,400円割引',aipo:'https://app.aipo.com/apps/bbs/topics/44439',icon:'🎓'},
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
    c8:[{to:'c2',r:'ok'},{to:'c4',r:'ok'},{to:'c5',r:'ok'},{to:'c6',r:'ok'}],
    c9:[{to:'c2',r:'ok'},{to:'c4',r:'ok'},{to:'c5',r:'ok'},{to:'c6',r:'ok'}],
  },
  targetLabels:{c1:'新規TV工事費無料',c2:'1G 3ヶ月無料',c3:'半々デジ録T（P）',c4:'お友だち紹介',c5:'新築リフォーム',c6:'佐野短大学割',c7:'テレビとくとくプラン（対象施設限定）',c8:'ネット工事費実質無料（新規）',c9:'ネット工事費実質無料（追加）'},
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
