import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, extractSpreadsheetId } from '@/lib/sheets';

// ══════════════════════════════════════
// 広告パフォーマンスAPI（GAS置き換え）
// ══════════════════════════════════════

// カラムインデックス（0-based）— 広告データシート
const P = {
  DATE: 0, PROJECT_ID: 1, PLATFORM: 2, ACCOUNT_ID: 3,
  AD_NAME: 4, RAW_AD_ID: 5, SPEND: 6, IMP: 7, CLICKS: 8,
  CPM: 9, CTR: 10, CPC: 11, MCV: 12, MCVR: 13, MCPA: 14,
  CV: 15, CVR: 16, CPA: 17, REVENUE: 18, GROSS_PROFIT: 19, IS_STOPPED: 20,
};

// Google Ads カラム
const G = { ACCOUNT_ID: 1, AD_ID: 6, AD_NAME: 7, COST: 8, IMP: 9, CLICKS: 10, DATE: 11 };

// TikTok カラム（1行目=日付、2行目=ヘッダー、3行目からデータ）
const TT = { ACCOUNT_ID: 0, AD_ID: 5, AD_NAME: 6, SPEND: 7, IMP: 8, CLICKS: 9, DATE: 10 };

// CV_API カラム
const CV_API = { AD_NAME: 5, DATE: 8 };

// れいわCV カラム
const REIWA_CV = { DATE: 0, MENDAN: 12, CR: 16 };

// 設定
const MAIN_SHEET_ID = process.env.MAIN_SPREADSHEET_ID ?? '';
const CONFIG_CACHE = new Map<string, string>();

async function getConfig(key: string): Promise<string> {
  if (CONFIG_CACHE.size === 0 && MAIN_SHEET_ID) {
    const data = await getSheetData(MAIN_SHEET_ID, '設定');
    for (const row of data) {
      if (row[0]) CONFIG_CACHE.set(String(row[0]).trim(), String(row[1] ?? '').trim());
    }
  }
  return CONFIG_CACHE.get(key) ?? '';
}

function formatDate(d: unknown): string {
  if (!d) return '';
  const date = new Date(String(d));
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }); // yyyy-MM-dd
}

function mapRow(row: unknown[]) {
  return {
    id: `${row[P.DATE]}_${row[P.RAW_AD_ID]}`,
    projectId: row[P.PROJECT_ID],
    platform: row[P.PLATFORM],
    accountId: String(row[P.ACCOUNT_ID] ?? ''),
    adName: row[P.AD_NAME],
    date: formatDate(row[P.DATE]),
    spend: Number(row[P.SPEND]) || 0,
    impressions: Number(row[P.IMP]) || 0,
    clicks: Number(row[P.CLICKS]) || 0,
    cpm: Number(row[P.CPM]) || 0,
    ctr: Number(row[P.CTR]) || 0,
    cpc: Number(row[P.CPC]) || 0,
    mcv: Number(row[P.MCV]) || 0,
    mcvr: Number(row[P.MCVR]) || 0,
    mcpa: Number(row[P.MCPA]) || 0,
    cv: Number(row[P.CV]) || 0,
    cvr: Number(row[P.CVR]) || 0,
    cpa: Number(row[P.CPA]) || 0,
    revenue: Number(row[P.REVENUE]) || 0,
    grossProfit: Number(row[P.GROSS_PROFIT]) || 0,
    isStopped: row[P.IS_STOPPED] === true || row[P.IS_STOPPED] === 'TRUE',
    rawAdId: String(row[P.RAW_AD_ID] ?? ''),
  };
}

function filterLatestDate<T extends { date: string }>(items: T[]): T[] {
  if (items.length === 0) return [];
  const maxDate = items.reduce((max, item) => item.date > max ? item.date : max, '');
  return items.filter((item) => item.date === maxDate);
}

async function getAccountToProject(platform: string) {
  const data = await getSheetData(MAIN_SHEET_ID, '案件マスタ');
  const map: Record<string, string> = {};
  for (const row of data.slice(2)) {
    if (String(row[4] ?? '').trim() === platform && row[5]) {
      map[String(row[5]).trim()] = String(row[0]).trim();
    }
  }
  return map;
}

// ── ローカル広告データ読み取り ──
async function readLocalPerformance(projectId: string) {
  const data = await getSheetData(MAIN_SHEET_ID, '広告データ');
  const rows = data.slice(2).filter((r) => r[P.DATE]);
  const mapped = rows
    .filter((r) => String(r[P.PROJECT_ID]).trim() === projectId)
    .map(mapRow);
  return filterLatestDate(mapped);
}

// ── Google外部シート読み取り ──
async function readGoogleExternal(projectId: string) {
  const url = await getConfig('EXTERNAL_GOOGLE_SHEET_URL');
  const name = await getConfig('EXTERNAL_GOOGLE_SHEET_NAME');
  if (!url || !name) return [];

  const sheetId = extractSpreadsheetId(url);
  const data = await getSheetData(sheetId, name);
  const accountMap = await getAccountToProject('google');
  const rows = data.slice(1).filter((r) => r[G.DATE]);

  const mapped = rows
    .filter((r) => {
      const pid = accountMap[String(r[G.ACCOUNT_ID]).trim()];
      return pid === projectId;
    })
    .map((r) => {
      const spend = Number(r[G.COST]) || 0;
      const imp = Number(r[G.IMP]) || 0;
      const clicks = Number(r[G.CLICKS]) || 0;
      return {
        id: `${formatDate(r[G.DATE])}_${r[G.AD_ID]}`,
        projectId,
        platform: 'google',
        accountId: String(r[G.ACCOUNT_ID]).trim(),
        adName: String(r[G.AD_NAME] ?? ''),
        date: formatDate(r[G.DATE]),
        spend, impressions: imp, clicks,
        cpm: imp > 0 ? (spend / imp) * 1000 : 0,
        ctr: imp > 0 ? clicks / imp : 0,
        cpc: clicks > 0 ? spend / clicks : 0,
        mcv: 0, mcvr: 0, mcpa: 0, cv: 0, cvr: 0, cpa: 0,
        revenue: Math.round(spend * 1.2),
        grossProfit: Math.round(spend * 0.2),
        isStopped: false,
        rawAdId: String(r[G.AD_ID] ?? ''),
      };
    });
  return filterLatestDate(mapped);
}

// ── TikTok外部シート読み取り ──
async function readTikTokExternal(projectId: string) {
  const url = await getConfig('EXTERNAL_TIKTOK_SHEET_URL');
  const name = await getConfig('EXTERNAL_TIKTOK_SHEET_NAME');
  if (!url || !name) return [];

  const sheetId = extractSpreadsheetId(url);
  const data = await getSheetData(sheetId, name);
  const accountMap = await getAccountToProject('tiktok');
  // 1行目=日付、2行目=ヘッダー、3行目からデータ
  const rows = data.slice(2).filter((r) => r[TT.DATE]);

  const mapped = rows
    .filter((r) => {
      const pid = accountMap[String(r[TT.ACCOUNT_ID]).trim()];
      return pid === projectId;
    })
    .map((r) => {
      const spend = Number(r[TT.SPEND]) || 0;
      const imp = Number(r[TT.IMP]) || 0;
      const clicks = Number(r[TT.CLICKS]) || 0;
      return {
        id: `${formatDate(r[TT.DATE])}_${r[TT.AD_ID]}`,
        projectId,
        platform: 'tiktok',
        accountId: String(r[TT.ACCOUNT_ID]).trim(),
        adName: String(r[TT.AD_NAME] ?? ''),
        date: formatDate(r[TT.DATE]),
        spend, impressions: imp, clicks,
        cpm: imp > 0 ? (spend / imp) * 1000 : 0,
        ctr: imp > 0 ? clicks / imp : 0,
        cpc: clicks > 0 ? spend / clicks : 0,
        mcv: 0, mcvr: 0, mcpa: 0, cv: 0, cvr: 0, cpa: 0,
        revenue: Math.round(spend * 1.2),
        grossProfit: Math.round(spend * 0.2),
        isStopped: false,
        rawAdId: String(r[TT.AD_ID] ?? ''),
      };
    });
  return filterLatestDate(mapped);
}

// ── CV上書き（DEN: CV_API + れいわ: 外部シート）──
async function getCvOverrides() {
  const cvByAd: Record<string, number> = {};

  // DEN用: CV_APIタブ
  try {
    const data = await getSheetData(MAIN_SHEET_ID, 'CV_API');
    const rows = data.slice(1).filter((r) => r[CV_API.DATE]);
    const dates = rows.map((r) => formatDate(r[CV_API.DATE])).filter(Boolean);
    const maxDate = dates.reduce((m, d) => d > m ? d : m, '');
    for (const row of rows) {
      if (formatDate(row[CV_API.DATE]) !== maxDate) continue;
      const name = String(row[CV_API.AD_NAME] ?? '').trim();
      if (name) cvByAd[name] = (cvByAd[name] ?? 0) + 1;
    }
  } catch { /* CV_API not found */ }

  // れいわ用: 外部スプレッドシート
  try {
    const url = await getConfig('EXTERNAL_REIWA_CV_URL');
    const name = await getConfig('EXTERNAL_REIWA_CV_NAME');
    if (url && name) {
      const sheetId = extractSpreadsheetId(url);
      const data = await getSheetData(sheetId, name);
      const rows = data.slice(1).filter((r) => r[REIWA_CV.DATE]);
      const dates = rows.map((r) => formatDate(r[REIWA_CV.DATE])).filter(Boolean);
      const maxDate = dates.reduce((m, d) => d > m ? d : m, '');
      for (const row of rows) {
        if (formatDate(row[REIWA_CV.DATE]) !== maxDate) continue;
        if (!row[REIWA_CV.MENDAN]) continue; // 面談予定日が空ならスキップ
        const cr = String(row[REIWA_CV.CR] ?? '').trim();
        if (cr) cvByAd[cr] = (cvByAd[cr] ?? 0) + 1;
      }
    }
  } catch { /* external CV not found */ }

  return cvByAd;
}

function applyCvOverrides(
  items: ReturnType<typeof mapRow>[],
  cvByAd: Record<string, number>
) {
  return items.map((item) => {
    const cv = cvByAd[String(item.adName)];
    if (cv !== undefined) {
      return {
        ...item,
        cv,
        cvr: item.clicks > 0 ? cv / item.clicks : 0,
        cpa: cv > 0 ? item.spend / cv : 0,
      };
    }
    return item;
  });
}

// ── API Route ──

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project') ?? '';
    const platform = searchParams.get('platform') ?? '';

    if (!projectId) {
      return NextResponse.json({ error: 'project is required' }, { status: 400 });
    }

    let all: ReturnType<typeof mapRow>[] = [];

    // Meta（ローカル広告データシート）
    if (!platform || platform === 'all' || platform === 'meta') {
      const local = await readLocalPerformance(projectId);
      all = all.concat(local.filter((r) => !platform || platform === 'all' || r.platform === platform));
    }

    // Google（外部シート）
    if (!platform || platform === 'all' || platform === 'google') {
      all = all.concat(await readGoogleExternal(projectId));
    }

    // TikTok（外部シート）
    if (!platform || platform === 'all' || platform === 'tiktok') {
      all = all.concat(await readTikTokExternal(projectId));
    }

    // CV上書き
    const cvByAd = await getCvOverrides();
    all = applyCvOverrides(all, cvByAd);

    return NextResponse.json({ performance: all });
  } catch (err) {
    console.error('Performance API error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
