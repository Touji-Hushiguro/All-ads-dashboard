import { google } from 'googleapis';

// ══════════════════════════════════════
// Google Sheets API クライアント（サービスアカウント認証）
// ══════════════════════════════════════

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY ?? '{}');
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

/**
 * スプレッドシートからデータを取得
 */
export async function getSheetData(
  spreadsheetId: string,
  sheetName: string,
  range?: string
): Promise<unknown[][]> {
  const sheets = getSheetsClient();
  const fullRange = range ? `${sheetName}!${range}` : sheetName;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: fullRange,
  });
  return (res.data.values ?? []) as unknown[][];
}

/**
 * スプレッドシートにデータを書き込み
 */
export async function updateSheetCell(
  spreadsheetId: string,
  sheetName: string,
  range: string,
  value: unknown
): Promise<void> {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!${range}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[value]] },
  });
}

/**
 * スプレッドシートに行を追加
 */
export async function appendSheetRow(
  spreadsheetId: string,
  sheetName: string,
  values: unknown[]
): Promise<void> {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: sheetName,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
}

// ══════════════════════════════════════
// スプレッドシートID抽出ヘルパー
// ══════════════════════════════════════

export function extractSpreadsheetId(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? '';
}
