// JPC Instagram掲載申込フォーム - Apps Script
// ※このファイルはリポジトリ管理用のコピーです。実体は script.google.com のプロジェクトです。
//   (プロジェクト: https://script.google.com/d/17zVwZOj5noBmoXXZT1rgAEVMPO0isA1Au571zeX0VakMWF-8YBxsnI76/edit)

var FOLDER_ID     = '1aA_kORlOd29R4DTz9BDuUmZNGBU4_tG1';
var SHEET_ID      = '13uDkQzm7um3wiemjhnyLUVtVlK8Y5o3wKM5gdizGEZM';
var NOTIFY_EMAIL  = 'JPC_concert_info@komakimusic.co.jp';

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();

    // ヘッダーが未設定の場合は自動作成
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        '受付日時', '団体名', '担当者名', 'メールアドレス', '電話番号', 'Instagramアカウント',
        '公演タイトル', '開催日', '開場時間', '開演時間', '会場名', '出演者',
        'チケット情報', 'キャッチコピー', '見どころ・紹介文', 'プログラム内容',
        'お問い合わせ団体名', 'お問い合わせメール', 'お問い合わせURL',
        'チラシ画像URL', '動画URL', '掲載許可'
      ]);
    }

    var data = JSON.parse(e.postData.contents);
    var orgName = data.orgName || '不明';
    var dateStr = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd_HHmmss');
    var folder = null;

    // 画像をGoogleドライブに保存
    var imageUrls = [];
    if (data.images && data.images.length > 0) {
      folder = folder || DriveApp.getFolderById(FOLDER_ID);
      data.images.forEach(function(img, i) {
        var base64 = img.data.split(',')[1];
        var bytes = Utilities.base64Decode(base64);
        var blob = Utilities.newBlob(bytes, img.type, orgName + '_' + dateStr + '_' + (i + 1) + '.' + img.ext);
        var file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        imageUrls.push(file.getUrl());
      });
    }

    // 動画をGoogleドライブに保存
    var videoUrl = '';
    if (data.video && data.video.data) {
      folder = folder || DriveApp.getFolderById(FOLDER_ID);
      var vBase64 = data.video.data.split(',')[1];
      var vBytes = Utilities.base64Decode(vBase64);
      var vBlob = Utilities.newBlob(vBytes, data.video.type, orgName + '_' + dateStr + '_video.' + data.video.ext);
      var vFile = folder.createFile(vBlob);
      vFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      videoUrl = vFile.getUrl();
    }

    // スプレッドシートに保存
    sheet.appendRow([
      new Date(),
      data.orgName      || '', data.contactName  || '', data.email       || '', data.phone || '',
      data.instagram    || '', data.concertTitle || '', data.concertDate || '',
      data.openTime     || '', data.startTime    || '', data.venue       || '', data.performers || '',
      data.ticket       || '', data.catchcopy    || '', data.description || '', data.program     || '',
      data.inquiryOrg   || '', data.inquiryEmail || '', data.inquiryUrl  || '',
      imageUrls.join('\n'), videoUrl, '同意済み'
    ]);

    // Instagram投稿文を生成
    var caption = buildCaption(data);

    // 申込者+担当者へメール送信
    sendNotification(data, caption, imageUrls, videoUrl);

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Instagram投稿文を生成 ─────────────────────────────
function buildCaption(d) {
  var date = d.concertDate ? formatDate(d.concertDate) : '';
  var timeParts = [];
  if (d.openTime) timeParts.push('開場 ' + d.openTime);
  if (d.startTime) timeParts.push('開演 ' + d.startTime);

  var lines = [];

  lines.push('[ ' + (d.catchcopy || '') + ' ]');
  lines.push('');
  lines.push((d.concertTitle || ''));
  lines.push('');
  lines.push(d.description || '');
  lines.push('');
  lines.push('【日時】' + date + (timeParts.length ? ' ' + timeParts.join(' / ') : ''));
  lines.push('【会場】' + (d.venue || ''));

  if (d.performers) {
    lines.push('【出演】' + d.performers);
  }

  lines.push('');
  lines.push('【チケット】');
  lines.push(d.ticket || '');

  if (d.program) {
    lines.push('');
    lines.push('【プログラム】');
    lines.push(d.program);
  }

  if (d.inquiryOrg || d.inquiryEmail || d.inquiryUrl) {
    lines.push('');
    lines.push('【お問い合わせ】');
    if (d.inquiryOrg)   lines.push(d.inquiryOrg);
    if (d.inquiryEmail) lines.push(d.inquiryEmail);
    if (d.inquiryUrl)   lines.push(d.inquiryUrl);
  }

  lines.push('');
  lines.push('———————————————');
  lines.push(d.instagram ? d.instagram : '');
  lines.push('#JPC #concert #コンサート情報');

  return lines.join('\n');
}

// ── 申込者+担当者へ受付確認メールを送信 ──────────────────────────
function sendNotification(d, caption, imageUrls, videoUrl) {
  var subject = '【受付完了】Instagram掲載のお申し込み｜' + (d.concertTitle || '');

  var body = '';
  body += 'このたびはJPC公式Instagramへの掲載をお申し込みいただき、ありがとうございます。\n';
  body += '以下の内容で受け付けました。\n';
  body += '\n';
  body += '内容を確認のうえ、準備が整い次第、JPC公式Instagramにて投稿いたします。\n';
  body += 'お申し込み内容に誤りがある場合は、このメールへの返信にてお知らせください。\n';
  body += '\n';
  body += '━━━━━━━━━━━━━━━━━━━━━━\n';
  body += '■ 申込者情報\n';
  body += '━━━━━━━━━━━━━━━━━━━━━━\n';
  body += '団体名　　：' + (d.orgName || '') + '\n';
  body += '担当者　　：' + (d.contactName || '') + '\n';
  body += 'メール　　：' + (d.email || '') + '\n';
  body += '電話番号　：' + (d.phone || '') + '\n';
  body += 'Instagram ：' + (d.instagram || '') + '\n';

  body += '\n';
  body += '━━━━━━━━━━━━━━━━━━━━━━\n';
  body += '■ Instagram投稿文（掲載予定の内容）\n';
  body += '━━━━━━━━━━━━━━━━━━━━━━\n';
  body += caption + '\n';
  body += '\n';

  if (imageUrls.length > 0) {
    body += '━━━━━━━━━━━━━━━━━━━━━━\n';
    body += '■ チラシ画像（' + imageUrls.length + '枚）\n';
    body += '━━━━━━━━━━━━━━━━━━━━━━\n';
    imageUrls.forEach(function(url, i) {
      body += '画像' + (i + 1) + '：' + url + '\n';
    });
    body += '\n';
  }

  if (videoUrl) {
    body += '━━━━━━━━━━━━━━━━━━━━━━\n';
    body += '■ 動画\n';
    body += '━━━━━━━━━━━━━━━━━━━━━━\n';
    body += videoUrl + '\n\n';
  }

  body += '━━━━━━━━━━━━━━━━━━━━━━\n';
  body += '※ このメールはフォーム送信時に自動送信されています。\n';

  var recipients = NOTIFY_EMAIL + (d.email ? ',' + d.email : '');

  GmailApp.sendEmail(recipients, subject, body, {
    htmlBody: body.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;'),
    from: 'JPC_concert_info@komakimusic.co.jp',
    name: 'JPC コンサート情報受付'
  });
}

// ── 日付フォーマット（2026-07-01 → 2026年7月1日）──────
function formatDate(str) {
  var parts = str.split('-');
  if (parts.length !== 3) return str;
  return parts[0] + '年' + parseInt(parts[1]) + '月' + parseInt(parts[2]) + '日';
}

// ── 既存シートのヘッダー行(1行目)を新しい列構成に更新する一回限りのヘルパー ──
// スプレッドシートに既にデータが入っているため、doPost内の自動ヘッダー作成は動きません。
// Apps Scriptエディタでこの関数を選択して一度だけ「実行」すると、1行目のラベルだけ新構成に揃います。
// (既存データ行の中身は変更しません)
function fixHeaderRowOnce() {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
  sheet.getRange(1, 1, 1, 22).setValues([[
    '受付日時', '団体名', '担当者名', 'メールアドレス', '電話番号', 'Instagramアカウント',
    '公演タイトル', '開催日', '開場時間', '開演時間', '会場名', '出演者',
    'チケット情報', 'キャッチコピー', '見どころ・紹介文', 'プログラム内容',
    'お問い合わせ団体名', 'お問い合わせメール', 'お問い合わせURL',
    'チラシ画像URL', '動画URL', '掲載許可'
  ]]);
}
