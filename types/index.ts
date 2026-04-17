// ── Platform ──
export type Platform = 'meta' | 'google' | 'tiktok';
export type PlatformTab = Platform | 'all';

// ── Project (案件タブ) ──
export interface Project {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly sortOrder: number;
  readonly createdAt: string;
}

// ── Ad Account ──
export interface AdAccount {
  readonly id: string;
  readonly projectId: string;
  readonly platform: Platform;
  readonly accountId: string;
  readonly accountName: string;
  readonly isActive: boolean;
  readonly createdAt: string;
}

// ── KPI Targets ──
export interface KpiTarget {
  readonly id: string;
  readonly projectId: string;
  readonly platform: Platform;
  readonly targetCpa: number | null;
  readonly targetMcpa: number | null;
  readonly targetCpm: number | null;
  readonly targetCtr: number | null;
  readonly targetCpc: number | null;
  readonly targetMcvr: number | null;
  readonly dailyBudget: number | null;
  readonly updatedAt: string;
}

// ── Ad Performance (日次) ──
export interface AdPerformance {
  readonly id: string;
  readonly projectId: string;
  readonly platform: Platform;
  readonly accountId: string;
  readonly adName: string;
  readonly date: string;
  readonly spend: number;
  readonly impressions: number;
  readonly cpm: number;
  readonly clicks: number;
  readonly ctr: number;
  readonly cpc: number;
  readonly mcv: number;
  readonly mcvr: number;
  readonly mcpa: number;
  readonly cv: number;
  readonly cvr: number;
  readonly cpa: number;
  readonly lpv: number;
  readonly lpvr: number;
  readonly lpvc: number;
  readonly revenue: number;
  readonly grossProfit: number;
  readonly isStopped: boolean;
  readonly rawAdId: string;
  readonly createdAt: string;
  readonly memo?: string;
}

// ── KPI Summary ──
export interface KpiSummary {
  readonly label: string;
  readonly value: number;
  readonly target: number | null;
  readonly format: 'currency' | 'number' | 'percent';
  readonly status: 'good' | 'warning' | 'over' | 'neutral';
}

// ── Alert ──
export interface Alert {
  readonly id: string;
  readonly type: 'critical' | 'warning' | 'info';
  readonly message: string;
  readonly adName: string;
}

// ── Column Definition ──
export interface ColumnDef {
  readonly key: keyof AdPerformance;
  readonly label: string;
  readonly format: 'currency' | 'number' | 'percent' | 'text' | 'boolean';
  readonly defaultVisible: boolean;
}

// ── Sort ──
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  readonly key: keyof AdPerformance;
  readonly direction: SortDirection;
}
