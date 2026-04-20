/**
 * Vercel データAPI クライアント
 * GAS→Vercelにプッシュされたキャッシュデータを読む
 */

// ── Projects ──

export interface ProjectData {
  readonly projects: readonly {
    readonly id: string;
    readonly name: string;
    readonly slug: string;
    readonly sortOrder: number;
  }[];
  readonly accounts: readonly {
    readonly projectId: string;
    readonly platform: string;
    readonly accountId: string;
    readonly accountName: string;
  }[];
}

export async function fetchProjectsFromCache(): Promise<ProjectData> {
  const res = await fetch('/api/data?key=projects', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Data API error: ${res.status}`);
  return res.json();
}

// ── Performance ──

export interface PerformanceItem {
  readonly id: string;
  readonly projectId: string;
  readonly platform: string;
  readonly accountId: string;
  readonly adName: string;
  readonly date: string;
  readonly spend: number;
  readonly impressions: number;
  readonly clicks: number;
  readonly cpm: number;
  readonly ctr: number;
  readonly cpc: number;
  readonly mcv: number;
  readonly mcvr: number;
  readonly mcpa: number;
  readonly cv: number;
  readonly cvr: number;
  readonly cpa: number;
  readonly revenue: number;
  readonly grossProfit: number;
  readonly isStopped: boolean;
  readonly rawAdId: string;
}

export interface ProjectCacheData {
  readonly performance: readonly PerformanceItem[];
  readonly targets: {
    readonly projectId: string;
    readonly targetCpa: number | null;
    readonly targetMcpa: number | null;
    readonly targetCpm: number | null;
    readonly targetCtr: number | null;
    readonly targetCpc: number | null;
    readonly targetMcvr: number | null;
    readonly dailyBudget: number | null;
  } | null;
  readonly memos: Record<string, string>;
}

export async function fetchProjectDataFromCache(
  projectId: string
): Promise<ProjectCacheData> {
  const res = await fetch(`/api/data?key=project_${projectId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Data API error: ${res.status}`);
  return res.json();
}

// ── Memo書き込み（GAS経由は使えないのでVercel API経由）──

export async function saveMemo(adName: string, memo: string): Promise<void> {
  await fetch('/api/data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'memo-client', // メモ書き込みは別の認証
    },
    body: JSON.stringify({
      key: '_memo_update',
      data: { adName, memo },
    }),
  });
}

// ── Status ──

export async function fetchCacheStatus(): Promise<{
  cachedKeys: string[];
  lastPushAt: string | null;
  ageSeconds: number | null;
}> {
  const res = await fetch('/api/data?action=status', { cache: 'no-store' });
  return res.json();
}
