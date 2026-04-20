import { NextRequest, NextResponse } from 'next/server';

// ══════════════════════════════════════
// データキャッシュAPI
// GASが1分毎にPUSH → フロントがGETで読む
// ══════════════════════════════════════

// インプロセスキャッシュ（サーバーレス関数が温かい間保持）
const dataCache = new Map<string, unknown>();
let lastPushAt = 0;

const PUSH_SECRET = process.env.PUSH_SECRET ?? 'changeme';

// ── POST: GASからデータ受信 ──
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key') ?? '';
    if (apiKey !== PUSH_SECRET) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { key, data } = body as { key: string; data: unknown };

    if (!key) {
      return NextResponse.json({ error: 'key is required' }, { status: 400 });
    }

    dataCache.set(key, data);
    lastPushAt = Date.now();

    return NextResponse.json({ success: true, key, cachedKeys: [...dataCache.keys()] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── GET: フロントからデータ取得 ──
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key') ?? '';
    const action = searchParams.get('action') ?? '';

    // action=status: キャッシュ状態確認
    if (action === 'status') {
      return NextResponse.json({
        cachedKeys: [...dataCache.keys()],
        lastPushAt: lastPushAt ? new Date(lastPushAt).toISOString() : null,
        ageSeconds: lastPushAt ? Math.floor((Date.now() - lastPushAt) / 1000) : null,
      });
    }

    if (!key) {
      // キー未指定: 全データ返す
      const all: Record<string, unknown> = {};
      dataCache.forEach((v, k) => { all[k] = v; });
      return NextResponse.json(all);
    }

    const cached = dataCache.get(key);
    if (!cached) {
      return NextResponse.json({ error: 'no data', key }, { status: 404 });
    }

    return NextResponse.json(cached);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
