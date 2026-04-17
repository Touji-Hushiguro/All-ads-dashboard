/**
 * Ad Dashboard — Google Apps Script Backend
 *
 * スプレッドシート構成:
 *   シート1「案件マスタ」— 案件・アカウント・KPI目標
 *   シート2「広告データ」— Meta APIから取得した日次データ
 *   シート3「設定」      — トークン等
 */

// ════════════════════════════════════════
// 定数
// ════════════════════════════════════════
var SHEET_MASTER = '案件マスタ';
var SHEET_PERFORMANCE = '広告データ';
var SHEET_CONFIG = '設定';

// 案件マスタのカラム（1-indexed）
var M = {
  PROJECT_ID: 1,
  PROJECT_NAME: 2,
  SLUG: 3,
  SORT_ORDER: 4,
  PLATFORM: 5,
  ACCOUNT_ID: 6,
  ACCOUNT_NAME: 7,
  TARGET_CPA: 8,
  TARGET_MCPA: 9,
  TARGET_CPM: 10,
  TARGET_CTR: 11,
  TARGET_CPC: 12,
  TARGET_MCVR: 13,
  DAILY_BUDGET: 14,
};

// 広告データのカラム（1-indexed）
var P = {
  DATE: 1,
  PROJECT_ID: 2,
  PLATFORM: 3,
  ACCOUNT_ID: 4,
  AD_NAME: 5,
  RAW_AD_ID: 6,
  SPEND: 7,
  IMP: 8,
  CLICKS: 9,
  CPM: 10,
  CTR: 11,
  CPC: 12,
  MCV: 13,
  MCVR: 14,
  MCPA: 15,
  CV: 16,
  CVR: 17,
  CPA: 18,
  REVENUE: 19,
  GROSS_PROFIT: 20,
  IS_STOPPED: 21,
};

// ════════════════════════════════════════
// Web API エンドポイント
// ════════════════════════════════════════

/**
 * GETリクエストハンドラ
 * ?action=projects       — 案件一覧
 * ?action=performance&project=xxx&platform=meta — 広告データ
 * ?action=targets&project=xxx                   — KPI目標
 */
function doGet(e) {
  var action = e.parameter.action || '';

  try {
    var result;
    switch (action) {
      case 'projects':
        result = getProjects_();
        break;
      case 'performance':
        result = getPerformance_(e.parameter.project, e.parameter.platform);
        break;
      case 'targets':
        result = getTargets_(e.parameter.project);
        break;
      case 'memos':
        result = getMemos_();
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }
    return jsonResponse_(result);
  } catch (err) {
    return jsonResponse_({ error: err.message });
  }
}

/**
 * POSTリクエストハンドラ
 * action=updateTarget  — KPI目標更新
 * action=syncMeta      — Meta API同期（手動トリガー）
 */
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action || '';

    var result;
    switch (action) {
      case 'updateTarget':
        result = updateTarget_(body);
        break;
      case 'syncMeta':
        result = syncAllMetaAccounts_(body.date);
        break;
      case 'updateMemo':
        result = updateMemo_(body);
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }
    return jsonResponse_(result);
  } catch (err) {
    return jsonResponse_({ error: err.message });
  }
}

// ════════════════════════════════════════
// メモ
// ════════════════════════════════════════

var SHEET_MEMO = 'メモ';

/**
 * メモ一覧取得
 */
function getMemos_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_MEMO);
  if (!sheet) {
    // 自動作成
    sheet = ss.insertSheet(SHEET_MEMO);
    sheet.getRange(1, 1, 1, 2).setValues([['ad_name', 'memo']]);
    sheet.setFrozenRows(1);
  }
  var data = sheet.getDataRange().getValues();
  var memos = {};
  for (var i = 1; i < data.length; i++) {
    var adName = String(data[i][0] || '').trim();
    if (adName) memos[adName] = String(data[i][1] || '');
  }
  return { memos: memos };
}

/**
 * メモ更新（upsert）
 */
function updateMemo_(body) {
  var adName = body.adName;
  var memo = body.memo;
  if (!adName) return { error: 'adName is required' };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_MEMO);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_MEMO);
    sheet.getRange(1, 1, 1, 2).setValues([['ad_name', 'memo']]);
    sheet.setFrozenRows(1);
  }

  var data = sheet.getDataRange().getValues();
  // 既存行を探す
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === adName) {
      sheet.getRange(i + 1, 2).setValue(memo);
      return { success: true, updated: true };
    }
  }
  // 新規追加
  sheet.appendRow([adName, memo]);
  return { success: true, created: true };
}

// ════════════════════════════════════════
// データ読み取り
// ════════════════════════════════════════

function getProjects_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_MASTER);
  var data = sheet.getDataRange().getValues();
  // 1行目=ヘッダー、2行目=説明行 なのでスキップしてindex 2（3行目）からデータ
  var rows = data.slice(2).filter(function (r) {
    var pid = String(r[0] || '').trim();
    return pid !== '';
  });

  // 案件をユニークに集約
  var projectMap = {};
  var accounts = [];

  rows.forEach(function (row) {
    var pid = row[M.PROJECT_ID - 1];
    if (!projectMap[pid]) {
      projectMap[pid] = {
        id: pid,
        name: row[M.PROJECT_NAME - 1],
        slug: row[M.SLUG - 1],
        sortOrder: row[M.SORT_ORDER - 1] || 0,
      };
    }
    accounts.push({
      projectId: pid,
      platform: row[M.PLATFORM - 1],
      accountId: String(row[M.ACCOUNT_ID - 1]),
      accountName: row[M.ACCOUNT_NAME - 1],
    });
  });

  var projects = Object.keys(projectMap).map(function (k) { return projectMap[k]; });
  projects.sort(function (a, b) { return a.sortOrder - b.sortOrder; });

  return { projects: projects, accounts: accounts };
}

/**
 * 広告データシート（Meta自動同期）から行を読む。最新日のみ返す。
 */
function readLocalPerformance_(projectId, platform) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PERFORMANCE);
  var data = sheet.getDataRange().getValues();
  var rows = data.slice(2).filter(function (r) { return !!r[P.DATE - 1]; });

  // 最新日を検索
  var maxDate = '';
  rows.forEach(function (row) {
    if (row[P.PROJECT_ID - 1] !== projectId) return;
    if (platform && platform !== 'all' && row[P.PLATFORM - 1] !== platform) return;
    var rd = Utilities.formatDate(new Date(row[P.DATE - 1]), 'Asia/Tokyo', 'yyyy-MM-dd');
    if (rd > maxDate) maxDate = rd;
  });

  var filtered = rows.filter(function (row) {
    if (row[P.PROJECT_ID - 1] !== projectId) return false;
    if (platform && platform !== 'all' && row[P.PLATFORM - 1] !== platform) return false;
    var rowDate = Utilities.formatDate(new Date(row[P.DATE - 1]), 'Asia/Tokyo', 'yyyy-MM-dd');
    return rowDate === maxDate;
  });

  return filtered.map(mapPerformanceRow_);
}

/**
 * Google Ads エクスポート形式の外部シートを読む
 * 前提列構成:
 *   1:Organization, 2:Account ID, 3:Campaign ID, 4:Campaign Name,
 *   5:adGroup ID, 6:adGroup Name, 7:Ad ID, 8:Ad Name,
 *   9:cost, 10:Impressions, 11:Clicks, 12:Date, 13:Updated_at
 */
var G_COL = {
  ACCOUNT_ID: 2,
  AD_ID: 7,
  AD_NAME: 8,
  COST: 9,
  IMP: 10,
  CLICKS: 11,
  DATE: 12,
};

function readGoogleExternalSheet_(sheetUrl, sheetName, projectId) {
  try {
    var ss = SpreadsheetApp.openByUrl(sheetUrl);
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      Logger.log('External sheet not found: ' + sheetName);
      return [];
    }
    var data = sheet.getDataRange().getValues();
    // 1行目=ヘッダー
    var rows = data.slice(1).filter(function (r) { return !!r[G_COL.DATE - 1]; });

    // 案件マスタから account_id → project_id のマップを構築
    var masterSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_MASTER);
    var masterData = masterSheet.getDataRange().getValues();
    var accountToProject = {};
    masterData.slice(2).forEach(function (mr) {
      if (mr[M.PLATFORM - 1] === 'google' && mr[M.ACCOUNT_ID - 1]) {
        accountToProject[String(mr[M.ACCOUNT_ID - 1]).trim()] = mr[M.PROJECT_ID - 1];
      }
    });

    // 最新日を検索（指定projectIdに該当する行の中で）
    var maxDate = '';
    rows.forEach(function (row) {
      var accId = String(row[G_COL.ACCOUNT_ID - 1]).trim();
      var pid = accountToProject[accId];
      if (!pid) return;
      if (projectId && pid !== projectId) return;
      var rd = Utilities.formatDate(new Date(row[G_COL.DATE - 1]), 'Asia/Tokyo', 'yyyy-MM-dd');
      if (rd > maxDate) maxDate = rd;
    });

    if (!maxDate) return [];

    // 最新日で絞り込み + 広告データ形式に変換
    var result = [];
    rows.forEach(function (row) {
      var accId = String(row[G_COL.ACCOUNT_ID - 1]).trim();
      var pid = accountToProject[accId];
      if (!pid) return;
      if (projectId && pid !== projectId) return;
      var rd = Utilities.formatDate(new Date(row[G_COL.DATE - 1]), 'Asia/Tokyo', 'yyyy-MM-dd');
      if (rd !== maxDate) return;

      var spend = Number(row[G_COL.COST - 1]) || 0;
      var imp = Number(row[G_COL.IMP - 1]) || 0;
      var clicks = Number(row[G_COL.CLICKS - 1]) || 0;

      result.push({
        id: rd + '_' + row[G_COL.AD_ID - 1],
        projectId: pid,
        platform: 'google',
        accountId: accId,
        adName: row[G_COL.AD_NAME - 1],
        date: rd,
        spend: spend,
        impressions: imp,
        clicks: clicks,
        cpm: imp > 0 ? (spend / imp) * 1000 : 0,
        ctr: imp > 0 ? clicks / imp : 0,
        cpc: clicks > 0 ? spend / clicks : 0,
        mcv: 0,
        mcvr: 0,
        mcpa: 0,
        cv: 0,
        cvr: 0,
        cpa: 0,
        revenue: Math.round(spend * 1.2),
        grossProfit: Math.round(spend * 0.2),
        isStopped: false,
        rawAdId: String(row[G_COL.AD_ID - 1]),
      });
    });

    return result;
  } catch (err) {
    Logger.log('readGoogleExternalSheet_ error: ' + err.message);
    return [];
  }
}

/**
 * 行データをAPIレスポンス形式にマッピング
 */
function mapPerformanceRow_(row) {
  return {
    id: row[P.DATE - 1] + '_' + row[P.RAW_AD_ID - 1],
    projectId: row[P.PROJECT_ID - 1],
    platform: row[P.PLATFORM - 1],
    accountId: String(row[P.ACCOUNT_ID - 1]),
    adName: row[P.AD_NAME - 1],
    date: Utilities.formatDate(new Date(row[P.DATE - 1]), 'Asia/Tokyo', 'yyyy-MM-dd'),
    spend: row[P.SPEND - 1] || 0,
    impressions: row[P.IMP - 1] || 0,
    clicks: row[P.CLICKS - 1] || 0,
    cpm: row[P.CPM - 1] || 0,
    ctr: row[P.CTR - 1] || 0,
    cpc: row[P.CPC - 1] || 0,
    mcv: row[P.MCV - 1] || 0,
    mcvr: row[P.MCVR - 1] || 0,
    mcpa: row[P.MCPA - 1] || 0,
    cv: row[P.CV - 1] || 0,
    cvr: row[P.CVR - 1] || 0,
    cpa: row[P.CPA - 1] || 0,
    revenue: row[P.REVENUE - 1] || 0,
    grossProfit: row[P.GROSS_PROFIT - 1] || 0,
    isStopped: row[P.IS_STOPPED - 1] === true || row[P.IS_STOPPED - 1] === 'TRUE',
    rawAdId: String(row[P.RAW_AD_ID - 1]),
  };
}

function getPerformance_(projectId, platform) {
  if (!projectId) return { error: 'project is required' };

  // 1. 広告データシート（Meta自動同期）から読む
  var all = readLocalPerformance_(projectId, platform);

  // 2. Google 外部シートから読む（設定シートに EXTERNAL_GOOGLE_SHEET_URL + _NAME があれば）
  if (!platform || platform === 'all' || platform === 'google') {
    var gUrl = getConfig_('EXTERNAL_GOOGLE_SHEET_URL');
    var gName = getConfig_('EXTERNAL_GOOGLE_SHEET_NAME');
    if (gUrl && gName) {
      all = all.concat(readGoogleExternalSheet_(gUrl, gName, projectId));
    }
  }

  // 3. ASP管理画面のCVデータで上書き（CV_API等のタブがあれば）
  var aspCv = getAspCvData_();
  if (aspCv.cvByAd) {
    all = all.map(function (item) {
      var cv = aspCv.cvByAd[item.adName];
      if (cv !== undefined) {
        return {
          id: item.id,
          projectId: item.projectId,
          platform: item.platform,
          accountId: item.accountId,
          adName: item.adName,
          date: item.date,
          spend: item.spend,
          impressions: item.impressions,
          clicks: item.clicks,
          cpm: item.cpm,
          ctr: item.ctr,
          cpc: item.cpc,
          mcv: item.mcv,
          mcvr: item.mcvr,
          mcpa: item.mcpa,
          cv: cv,
          cvr: item.clicks > 0 ? cv / item.clicks : 0,
          cpa: cv > 0 ? item.spend / cv : 0,
          revenue: item.revenue,
          grossProfit: item.grossProfit,
          isStopped: item.isStopped,
          rawAdId: item.rawAdId,
        };
      }
      return item;
    });
  }

  return { performance: all };
}

/**
 * ASP管理画面のCVデータを読む
 * CV_API タブから「広告」名ごとにCV件数をカウント（最新日のみ）
 *
 * CV_APIカラム: 成果ID(0), アフィリエイター(1), アフィリエイターID(2),
 *              メディア(3), メディアID(4), 広告(5), 広告ID(6), pbid(7), 確定日時(8)
 */
function getAspCvData_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CV_API');
  if (!sheet) return {};

  var data = sheet.getDataRange().getValues();
  var rows = data.slice(1); // ヘッダー除外

  var CV_AD_NAME = 5; // 「広告」列 (0-indexed)
  var CV_DATE = 8;     // 「確定日時」列

  // 最新日を探す
  var maxDate = '';
  rows.forEach(function (row) {
    if (!row[CV_DATE]) return;
    var d = Utilities.formatDate(new Date(row[CV_DATE]), 'Asia/Tokyo', 'yyyy-MM-dd');
    if (d > maxDate) maxDate = d;
  });

  if (!maxDate) return {};

  // 最新日のCV件数を広告名でカウント
  var cvByAd = {};
  rows.forEach(function (row) {
    if (!row[CV_DATE]) return;
    var d = Utilities.formatDate(new Date(row[CV_DATE]), 'Asia/Tokyo', 'yyyy-MM-dd');
    if (d !== maxDate) return;
    var adName = String(row[CV_AD_NAME] || '').trim();
    if (!adName) return;
    cvByAd[adName] = (cvByAd[adName] || 0) + 1;
  });

  return { date: maxDate, cvByAd: cvByAd };
}

function getTargets_(projectId) {
  if (!projectId) return { error: 'project is required' };

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_MASTER);
  var data = sheet.getDataRange().getValues();
  // 1行目=ヘッダー、2行目=説明行 なのでindex 2（3行目）からデータ
  var rows = data.slice(2).filter(function (r) {
    var pid = String(r[0] || '').trim();
    return pid !== '';
  });

  // 該当案件の最初の行からKPI目標を取得（trim して比較）
  var row = rows.find(function (r) {
    return String(r[M.PROJECT_ID - 1] || '').trim() === String(projectId || '').trim();
  });
  if (!row) return { targets: null };

  return {
    targets: {
      projectId: projectId,
      targetCpa: row[M.TARGET_CPA - 1] || null,
      targetMcpa: row[M.TARGET_MCPA - 1] || null,
      targetCpm: row[M.TARGET_CPM - 1] || null,
      targetCtr: row[M.TARGET_CTR - 1] || null,
      targetCpc: row[M.TARGET_CPC - 1] || null,
      targetMcvr: row[M.TARGET_MCVR - 1] || null,
      dailyBudget: row[M.DAILY_BUDGET - 1] || null,
    },
  };
}

// ════════════════════════════════════════
// データ書き込み
// ════════════════════════════════════════

function updateTarget_(body) {
  var projectId = body.projectId;
  var field = body.field; // targetCpa, targetMcpa, etc.
  var value = body.value;

  if (!projectId || !field) return { error: 'projectId and field are required' };

  var fieldToCol = {
    targetCpa: M.TARGET_CPA,
    targetMcpa: M.TARGET_MCPA,
    targetCpm: M.TARGET_CPM,
    targetCtr: M.TARGET_CTR,
    targetCpc: M.TARGET_CPC,
    targetMcvr: M.TARGET_MCVR,
    dailyBudget: M.DAILY_BUDGET,
  };

  var col = fieldToCol[field];
  if (!col) return { error: 'Unknown field: ' + field };

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_MASTER);
  var data = sheet.getDataRange().getValues();

  // 該当案件の全行を更新（同じ案件で複数アカウントある場合）
  var updated = 0;
  for (var i = 1; i < data.length; i++) {
    if (data[i][M.PROJECT_ID - 1] === projectId) {
      sheet.getRange(i + 1, col).setValue(value);
      updated++;
    }
  }

  return { success: true, updated: updated };
}

// ════════════════════════════════════════
// Meta Graph API 同期
// ════════════════════════════════════════

function getConfig_(key) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG);
  var data = sheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === key) return data[i][1];
  }
  return null;
}

/**
 * 全アクティブアカウントのMetaデータを同期
 */
/**
 * 設定シートから全てのMetaアクセストークンを取得
 * key が META_ACCESS_TOKEN で始まる全ての行の value を配列で返す
 * 例: META_ACCESS_TOKEN, META_ACCESS_TOKEN_2, META_ACCESS_TOKEN_DEN, etc.
 */
function getAllMetaTokens_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG);
  var data = sheet.getDataRange().getValues();
  var tokens = [];
  for (var i = 0; i < data.length; i++) {
    var key = String(data[i][0] || '').trim();
    var val = String(data[i][1] || '').trim();
    if (key.indexOf('META_ACCESS_TOKEN') === 0 && val) {
      tokens.push({ key: key, token: val });
    }
  }
  return tokens;
}

function syncAllMetaAccounts_(dateOverride) {
  var tokens = getAllMetaTokens_();
  var apiVersion = getConfig_('META_API_VERSION') || 'v22.0';

  if (tokens.length === 0) {
    return { error: 'META_ACCESS_TOKEN* が設定シートに1つも無い' };
  }

  // 日付範囲: 指定なければ [昨日, 今日] 両方同期
  //   - 昨日: Meta側で数時間遅れて確定するので継続更新が必要
  //   - 今日: リアルタイム近い更新
  var targetDates;
  if (dateOverride) {
    targetDates = [dateOverride];
  } else {
    var today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    var yesterdayStr = Utilities.formatDate(yesterday, 'Asia/Tokyo', 'yyyy-MM-dd');
    targetDates = [yesterdayStr, today];
  }

  // 案件マスタからMetaアカウント取得（1行目=ヘッダー、2行目=説明行をスキップ）
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_MASTER);
  var data = sheet.getDataRange().getValues();
  var accounts = data.slice(2).filter(function (r) {
    var pid = String(r[0] || '').trim();
    if (!pid) return false;
    return r[M.PLATFORM - 1] === 'meta' && r[M.ACCOUNT_ID - 1];
  });

  var totalSynced = 0;
  var errors = [];

  accounts.forEach(function (row) {
    var projectId = row[M.PROJECT_ID - 1];
    var accountId = String(row[M.ACCOUNT_ID - 1]);
    var accountName = row[M.ACCOUNT_NAME - 1];

    // 各日付について同期
    targetDates.forEach(function (date) {
      // トークンプールを順に試す
      var lastError = null;
      var succeeded = false;

      for (var i = 0; i < tokens.length; i++) {
        try {
          var insights = fetchMetaInsights_(tokens[i].token, apiVersion, accountId, date);
          if (insights.length > 0) {
            writePerformanceData_(projectId, accountId, date, insights);
            totalSynced += insights.length;
          }
          succeeded = true;
          break;
        } catch (err) {
          lastError = err;
        }
      }

      if (!succeeded && lastError) {
        errors.push(accountName + ' (' + date + '): 全' + tokens.length + 'トークン失敗: ' + lastError.message);
      }
    });

    // Rate limit対策
    Utilities.sleep(500);
  });

  return {
    success: true,
    dates: targetDates,
    synced: totalSynced,
    accountsProcessed: accounts.length,
    tokensAvailable: tokens.length,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Meta Graph APIから広告インサイト取得
 */
function fetchMetaInsights_(token, apiVersion, accountId, date) {
  var fields = [
    'ad_id', 'ad_name', 'spend', 'impressions', 'cpm',
    'clicks', 'ctr', 'cpc', 'actions',
  ].join(',');

  var url = 'https://graph.facebook.com/' + apiVersion +
    '/act_' + accountId + '/insights' +
    '?level=ad' +
    '&fields=' + fields +
    '&time_range=' + encodeURIComponent(JSON.stringify({ since: date, until: date })) +
    '&limit=500' +
    '&access_token=' + token;

  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var code = response.getResponseCode();

  if (code === 429) {
    // Rate limited — 60秒待ってリトライ
    Utilities.sleep(60000);
    response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    code = response.getResponseCode();
  }

  if (code !== 200) {
    throw new Error('Meta API error ' + code + ': ' + response.getContentText().substring(0, 200));
  }

  var json = JSON.parse(response.getContentText());
  return json.data || [];
}

/**
 * 広告データシートに書き込み（upsert）
 */
function writePerformanceData_(projectId, accountId, date, insights) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PERFORMANCE);
  var existingData = sheet.getDataRange().getValues();

  // 既存行のインデックスマップ (date+raw_ad_id → row number)
  var existingMap = {};
  for (var i = 1; i < existingData.length; i++) {
    var rowDate = existingData[i][P.DATE - 1];
    if (rowDate instanceof Date) {
      rowDate = Utilities.formatDate(rowDate, 'Asia/Tokyo', 'yyyy-MM-dd');
    }
    var key = rowDate + '_' + existingData[i][P.RAW_AD_ID - 1];
    existingMap[key] = i + 1; // 1-indexed row number
  }

  var newRows = [];

  insights.forEach(function (insight) {
    var spend = parseFloat(insight.spend) || 0;
    var impressions = parseInt(insight.impressions) || 0;
    var clicks = parseInt(insight.clicks) || 0;
    var actions = insight.actions || [];

    var findAction = function (type) {
      var found = actions.filter(function (a) { return a.action_type === type; });
      return found.length > 0 ? parseInt(found[0].value) : 0;
    };

    var mcv = findAction('offsite_conversion.fb_pixel_lead') || findAction('lead');
    var cv = findAction('offsite_conversion.fb_pixel_purchase') ||
             findAction('offsite_conversion.fb_pixel_complete_registration');

    var row = [
      date,                                              // date
      projectId,                                          // project_id
      'meta',                                             // platform
      accountId,                                          // account_id
      insight.ad_name,                                    // ad_name
      insight.ad_id,                                      // raw_ad_id
      spend,                                              // spend
      impressions,                                        // imp
      clicks,                                             // clicks
      impressions > 0 ? (spend / impressions) * 1000 : 0, // cpm
      impressions > 0 ? clicks / impressions : 0,         // ctr
      clicks > 0 ? spend / clicks : 0,                    // cpc
      mcv,                                                // mcv
      clicks > 0 ? mcv / clicks : 0,                      // mcvr
      mcv > 0 ? spend / mcv : 0,                          // mcpa
      cv,                                                 // cv
      clicks > 0 ? cv / clicks : 0,                       // cvr
      cv > 0 ? spend / cv : 0,                            // cpa
      Math.round(spend * 1.2),                            // revenue
      Math.round(spend * 0.2),                            // gross_profit
      false,                                              // is_stopped
    ];

    var key = date + '_' + insight.ad_id;
    if (existingMap[key]) {
      // 既存行を更新
      sheet.getRange(existingMap[key], 1, 1, row.length).setValues([row]);
    } else {
      newRows.push(row);
    }
  });

  // 新規行を追加
  if (newRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length)
      .setValues(newRows);
  }
}

// ════════════════════════════════════════
// 日次自動同期トリガー
// ════════════════════════════════════════

/**
 * 【手動実行用】昨日のMetaデータを同期する
 * Apps Scriptエディタの関数ドロップダウンから選択→実行
 */
function runMetaSyncNow() {
  var result = syncAllMetaAccounts_();
  Logger.log('Manual sync result: ' + JSON.stringify(result, null, 2));
  return result;
}

/**
 * 【手動実行用】日付指定でMetaデータを同期する
 * 関数内の DATE 変数を書き換えて実行
 */
function runMetaSyncForDate() {
  var DATE = '2026-04-15'; // ← ここを書き換えて実行
  var result = syncAllMetaAccounts_(DATE);
  Logger.log('Sync result for ' + DATE + ': ' + JSON.stringify(result, null, 2));
  return result;
}

/**
 * 毎朝自動実行される関数
 * GASのトリガーで「dailySyncTrigger」を時間主導型・毎日9-10時に設定
 */
function dailySyncTrigger() {
  var result = syncAllMetaAccounts_();
  Logger.log('Daily sync result: ' + JSON.stringify(result));

  // エラーがあればメール通知
  if (result.errors && result.errors.length > 0) {
    var email = Session.getActiveUser().getEmail();
    if (email) {
      MailApp.sendEmail(
        email,
        '【Ad Dashboard】同期エラー',
        '日次同期でエラーが発生しました:\n\n' + result.errors.join('\n')
      );
    }
  }
}

// ════════════════════════════════════════
// ユーティリティ
// ════════════════════════════════════════

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ════════════════════════════════════════
// 初期セットアップ（1回だけ実行）
// ════════════════════════════════════════

/**
 * スプレッドシートにヘッダー行を作成する
 * メニューから手動実行、または初回だけ実行
 */
/** ステップ1: 案件マスタシート作成 */
function setup1_Master() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var master = ss.getSheetByName(SHEET_MASTER) || ss.insertSheet(SHEET_MASTER);
  master.getRange(1, 1, 1, 14).setValues([[
    'project_id', 'project_name', 'slug', 'sort_order',
    'platform', 'account_id', 'account_name',
    '目標CPA', '目標MCPA', '目標CPM', '目標CTR', '目標CPC', '目標MCVR', '日予算',
  ]]);
  // 2行目: 説明
  master.getRange(2, 1, 1, 14).setValues([[
    '案件ID（proj-1など任意の文字列）',
    '案件名（タブに表示）',
    'URL用スラッグ（英小文字・ハイフン）',
    'タブ順（0,1,2...）',
    '媒体（meta / google / tiktok）',
    'Meta広告アカウントID（数字のみ）',
    'アカウント表示名',
    '目標CPA（円）',
    '目標MCPA（円）',
    '目標CPM（円）',
    '目標CTR（小数: 1.5%なら0.015）',
    '目標CPC（円）',
    '目標MCVR（小数: 3%なら0.03）',
    '日予算（円）',
  ]]);
  master.getRange(2, 1, 1, 14)
    .setFontStyle('italic')
    .setFontColor('#888888')
    .setFontSize(9);
  master.setFrozenRows(2);
  Logger.log('案件マスタ作成完了');
}

/** 既存の案件マスタシートに2行目の説明だけ追加 */
function addDescriptions_Master() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var master = ss.getSheetByName(SHEET_MASTER);
  if (!master) {
    Logger.log('案件マスタシートがありません');
    return;
  }
  // 既に2行目にデータがある場合は新しい行を挿入
  master.insertRowAfter(1);
  master.getRange(2, 1, 1, 14).setValues([[
    '案件ID（proj-1など任意の文字列）',
    '案件名（タブに表示）',
    'URL用スラッグ（英小文字・ハイフン）',
    'タブ順（0,1,2...）',
    '媒体（meta / google / tiktok）',
    'Meta広告アカウントID（数字のみ）',
    'アカウント表示名',
    '目標CPA（円）',
    '目標MCPA（円）',
    '目標CPM（円）',
    '目標CTR（小数: 1.5%なら0.015）',
    '目標CPC（円）',
    '目標MCVR（小数: 3%なら0.03）',
    '日予算（円）',
  ]]);
  master.getRange(2, 1, 1, 14)
    .setFontStyle('italic')
    .setFontColor('#888888')
    .setFontSize(9);
  master.setFrozenRows(2);
  Logger.log('案件マスタに説明行を追加');
}

/** 既存の広告データシートに2行目の説明だけ追加 */
function addDescriptions_Performance() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var perf = ss.getSheetByName(SHEET_PERFORMANCE);
  if (!perf) {
    Logger.log('広告データシートがありません');
    return;
  }
  perf.insertRowAfter(1);
  perf.getRange(2, 1, 1, 21).setValues([[
    '日付（yyyy-MM-dd）',
    '案件ID',
    '媒体',
    'Meta広告アカウントID',
    '広告名',
    'Meta広告ID（内部用）',
    '広告費（円）',
    'インプレッション数',
    'クリック数',
    'CPM（円）',
    'CTR（小数）',
    'CPC（円）',
    'MCV（マイクロCV）',
    'MCVR（小数）',
    'MCPA（円）',
    'CV',
    'CVR（小数）',
    'CPA（円）',
    '売上（spend×1.2 自動計算）',
    '粗利（spend×0.2 自動計算）',
    '停止フラグ（TRUE/FALSE）',
  ]]);
  perf.getRange(2, 1, 1, 21)
    .setFontStyle('italic')
    .setFontColor('#888888')
    .setFontSize(9);
  perf.setFrozenRows(2);
  Logger.log('広告データに説明行を追加');
}

/** ステップ2: 広告データシート作成 */
function setup2_Performance() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var perf = ss.getSheetByName(SHEET_PERFORMANCE) || ss.insertSheet(SHEET_PERFORMANCE);
  perf.getRange(1, 1, 1, 21).setValues([[
    'date', 'project_id', 'platform', 'account_id', 'ad_name', 'raw_ad_id',
    'spend', 'imp', 'clicks', 'cpm', 'ctr', 'cpc',
    'mcv', 'mcvr', 'mcpa', 'cv', 'cvr', 'cpa',
    '売上', '粗利', 'is_stopped',
  ]]);
  perf.setFrozenRows(1);
  Logger.log('広告データ作成完了');
}

/** ステップ3: 設定シート作成 */
function setup3_Config() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var config = ss.getSheetByName(SHEET_CONFIG) || ss.insertSheet(SHEET_CONFIG);
  config.getRange(1, 1, 1, 2).setValues([['key', 'value']]);
  config.getRange(2, 1, 3, 2).setValues([
    ['META_ACCESS_TOKEN', ''],
    ['META_API_VERSION', 'v22.0'],
    ['SYNC_HOUR', '9'],
  ]);
  config.setFrozenRows(1);
  Logger.log('設定シート作成完了');
}
