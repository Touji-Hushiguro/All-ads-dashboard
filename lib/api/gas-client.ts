/**
 * GAS Web App クライアント
 * スプレッドシートのデータをGAS経由で読み書き
 */

const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL ?? '';

export function isGasConnected(): boolean {
  return GAS_URL.length > 0;
}

async function gasGet<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(GAS_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`GAS GET error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function gasPost<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`GAS POST error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Read ──

export interface GasProjectsResponse {
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

export async function fetchProjects(): Promise<GasProjectsResponse> {
  return gasGet<GasProjectsResponse>({ action: 'projects' });
}

export interface GasPerformanceResponse {
  readonly performance: readonly {
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
  }[];
}

export async function fetchPerformance(
  projectId: string,
  platform?: string
): Promise<GasPerformanceResponse> {
  const params: Record<string, string> = {
    action: 'performance',
    project: projectId,
  };
  if (platform && platform !== 'all') {
    params.platform = platform;
  }
  return gasGet<GasPerformanceResponse>(params);
}

export interface GasTargetsResponse {
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
}

export async function fetchTargets(projectId: string): Promise<GasTargetsResponse> {
  return gasGet<GasTargetsResponse>({ action: 'targets', project: projectId });
}

// ── Write ──

export async function updateTarget(
  projectId: string,
  field: string,
  value: number
): Promise<{ success: boolean }> {
  return gasPost({ action: 'updateTarget', projectId, field, value });
}

export async function syncMeta(
  date?: string
): Promise<{ success: boolean; synced: number }> {
  return gasPost({ action: 'syncMeta', date });
}

// ── Memos ──

export async function fetchMemos(): Promise<{ memos: Record<string, string> }> {
  return gasGet<{ memos: Record<string, string> }>({ action: 'memos' });
}

export async function updateMemo(
  adName: string,
  memo: string
): Promise<{ success: boolean }> {
  return gasPost({ action: 'updateMemo', adName, memo });
}
