import type {
  Project,
  AdAccount,
  KpiTarget,
  AdPerformance,
} from '@/types';

// ── Projects ──
export const MOCK_PROJECTS: readonly Project[] = [
  {
    id: 'proj-1',
    name: 'DENNOVATE',
    slug: 'dennovate',
    sortOrder: 0,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'proj-2',
    name: 'れいわキャリア',
    slug: 'reiwa-career',
    sortOrder: 1,
    createdAt: '2024-01-01T00:00:00Z',
  },
];

// ── Ad Accounts ──
export const MOCK_AD_ACCOUNTS: readonly AdAccount[] = [
  {
    id: 'acc-1',
    projectId: 'proj-1',
    platform: 'meta',
    accountId: '1679205389760560',
    accountName: 'DENNOVATE',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'acc-2',
    projectId: 'proj-1',
    platform: 'meta',
    accountId: '639345955662224',
    accountName: 'ad_dennovate4_3wl',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'acc-3',
    projectId: 'proj-1',
    platform: 'meta',
    accountId: '784422371211561',
    accountName: 'ad_dennovate5_3wl',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'acc-4',
    projectId: 'proj-1',
    platform: 'meta',
    accountId: '1750935158925201',
    accountName: 'ad_dennovate6_3wl',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'acc-5',
    projectId: 'proj-2',
    platform: 'meta',
    accountId: '2332835990496053',
    accountName: 'ad_reiwacareer2_3wl',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
];

// ── KPI Targets ──
export const MOCK_KPI_TARGETS: readonly KpiTarget[] = [
  {
    id: 'kpi-1',
    projectId: 'proj-1',
    platform: 'meta',
    targetCpa: 15000,
    targetMcpa: 5000,
    targetCpm: 3000,
    targetCtr: 0.015,
    targetCpc: 200,
    targetMcvr: 0.03,
    dailyBudget: 100000,
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'kpi-2',
    projectId: 'proj-2',
    platform: 'meta',
    targetCpa: 12000,
    targetMcpa: 4000,
    targetCpm: 2500,
    targetCtr: 0.02,
    targetCpc: 150,
    targetMcvr: 0.04,
    dailyBudget: 80000,
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

// ── Ad Performance (サンプルデータ) ──
// Seeded pseudo-random to avoid hydration mismatch
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function makeAd(
  projectId: string,
  accountId: string,
  adName: string,
  index: number
): AdPerformance {
  const rand = seededRandom(index * 1000 + 42);
  const spend = 5000 + rand() * 50000;
  const impressions = Math.floor(spend / 3 * 1000);
  const clicks = Math.floor(impressions * (0.01 + rand() * 0.03));
  const mcv = Math.floor(clicks * (0.02 + rand() * 0.05));
  const cv = Math.floor(mcv * (0.1 + rand() * 0.3));
  const lpv = Math.floor(clicks * (0.3 + rand() * 0.4));

  return {
    id: `perf-${projectId}-${index}`,
    projectId,
    platform: 'meta',
    accountId,
    adName,
    date: '2026-04-10',
    spend: Math.round(spend),
    impressions,
    cpm: impressions > 0 ? Math.round((spend / impressions) * 1000) : 0,
    clicks,
    ctr: impressions > 0 ? clicks / impressions : 0,
    cpc: clicks > 0 ? Math.round(spend / clicks) : 0,
    mcv,
    mcvr: clicks > 0 ? mcv / clicks : 0,
    mcpa: mcv > 0 ? Math.round(spend / mcv) : 0,
    cv,
    cvr: clicks > 0 ? cv / clicks : 0,
    cpa: cv > 0 ? Math.round(spend / cv) : 0,
    lpv,
    lpvr: clicks > 0 ? lpv / clicks : 0,
    lpvc: lpv > 0 ? Math.round(spend / lpv) : 0,
    revenue: Math.round(spend * 1.2),
    grossProfit: Math.round(spend * 0.2),
    isStopped: rand() > 0.85,
    rawAdId: `meta_ad_${index}`,
    createdAt: '2026-04-10T00:00:00Z',
  };
}

export const MOCK_AD_PERFORMANCE: readonly AdPerformance[] = [
  // DENNOVATE ads
  makeAd('proj-1', '1679205389760560', '【DENNOVATE】LP_A_動画_男性30代', 1),
  makeAd('proj-1', '1679205389760560', '【DENNOVATE】LP_A_静止画_女性25-34', 2),
  makeAd('proj-1', '639345955662224', '【DENNOVATE】LP_B_カルーセル_全年齢', 3),
  makeAd('proj-1', '784422371211561', '【DENNOVATE】LP_C_動画_リターゲティング', 4),
  makeAd('proj-1', '1750935158925201', '【DENNOVATE】LP_D_静止画_CBO', 5),
  makeAd('proj-1', '1679205389760560', '【DENNOVATE】LP_A_動画_LAL1%', 6),
  makeAd('proj-1', '639345955662224', '【DENNOVATE】LP_B_動画_興味関心', 7),
  makeAd('proj-1', '784422371211561', '【DENNOVATE】LP_C_静止画_ブロード', 8),
  // れいわキャリア ads
  makeAd('proj-2', '2332835990496053', '【れいキャリ】転職LP_動画_20代', 9),
  makeAd('proj-2', '2332835990496053', '【れいキャリ】転職LP_静止画_30代', 10),
  makeAd('proj-2', '2332835990496053', '【れいキャリ】転職LP_カルーセル_IT', 11),
  makeAd('proj-2', '2332835990496053', '【れいキャリ】相談LP_動画_全年齢', 12),
  makeAd('proj-2', '2332835990496053', '【れいキャリ】相談LP_静止画_リタゲ', 13),
];
