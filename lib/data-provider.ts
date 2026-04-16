import type { Project, AdAccount, KpiTarget, AdPerformance, Platform } from '@/types';
import {
  MOCK_PROJECTS,
  MOCK_AD_ACCOUNTS,
  MOCK_KPI_TARGETS,
  MOCK_AD_PERFORMANCE,
} from './mock-data';

/**
 * データプロバイダー
 * GAS接続時はGASから取得、未接続時はモックデータを返す
 *
 * 注: GASからの非同期取得はクライアントコンポーネント側の
 *     useGasData フックで行う。ここは同期のモック用。
 */

// ── Projects (モック) ──
export function getProjects(): readonly Project[] {
  return MOCK_PROJECTS;
}

export function getProjectBySlug(slug: string): Project | undefined {
  return MOCK_PROJECTS.find((p) => p.slug === slug);
}

// ── Ad Accounts (モック) ──
export function getAdAccounts(projectId: string): readonly AdAccount[] {
  return MOCK_AD_ACCOUNTS.filter((a) => a.projectId === projectId);
}

// ── KPI Targets (モック) ──
export function getKpiTarget(
  projectId: string,
  platform: Platform
): KpiTarget | undefined {
  return MOCK_KPI_TARGETS.find(
    (k) => k.projectId === projectId && k.platform === platform
  );
}

// ── Ad Performance (モック) ──
export function getAdPerformance(
  projectId: string,
  platform?: Platform
): readonly AdPerformance[] {
  const filtered = MOCK_AD_PERFORMANCE.filter(
    (a) => a.projectId === projectId
  );
  if (!platform) return filtered;
  return filtered.filter((a) => a.platform === platform);
}

// ── Aggregation ──
export function aggregatePerformance(
  data: readonly AdPerformance[]
): {
  spend: number;
  impressions: number;
  clicks: number;
  mcv: number;
  cv: number;
  cpm: number;
  ctr: number;
  cpc: number;
  mcvr: number;
  mcpa: number;
  cvr: number;
  cpa: number;
  revenue: number;
  grossProfit: number;
} {
  const spend = data.reduce((s, d) => s + d.spend, 0);
  const impressions = data.reduce((s, d) => s + d.impressions, 0);
  const clicks = data.reduce((s, d) => s + d.clicks, 0);
  const mcv = data.reduce((s, d) => s + d.mcv, 0);
  const cv = data.reduce((s, d) => s + d.cv, 0);

  return {
    spend,
    impressions,
    clicks,
    mcv,
    cv,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    ctr: impressions > 0 ? clicks / impressions : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    mcvr: clicks > 0 ? mcv / clicks : 0,
    mcpa: mcv > 0 ? spend / mcv : 0,
    cvr: clicks > 0 ? cv / clicks : 0,
    cpa: cv > 0 ? spend / cv : 0,
    revenue: Math.round(spend * 1.2),
    grossProfit: Math.round(spend * 0.2),
  };
}
