import type { AdPerformance, KpiTarget, Alert } from '@/types';

/**
 * アラートを生成
 * - CPA > 目標CPA → critical (赤)
 * - MCPA > 目標MCPA → warning (橙)
 * - CTR < 目標CTR × 0.8 → info (黄)
 */
export function generateAlerts(
  data: readonly AdPerformance[],
  target: KpiTarget | null
): readonly Alert[] {
  if (!target) return [];

  const alerts: Alert[] = [];

  for (const ad of data) {
    if (ad.isStopped) continue;

    if (target.targetCpa && ad.cpa > target.targetCpa) {
      alerts.push({
        id: `alert-cpa-${ad.id}`,
        type: 'critical',
        message: `CPA ¥${Math.round(ad.cpa).toLocaleString()} が目標 ¥${Math.round(target.targetCpa).toLocaleString()} を超過`,
        adName: ad.adName,
      });
    }

    if (target.targetMcpa && ad.mcpa > target.targetMcpa) {
      alerts.push({
        id: `alert-mcpa-${ad.id}`,
        type: 'warning',
        message: `MCPA ¥${Math.round(ad.mcpa).toLocaleString()} が目標 ¥${Math.round(target.targetMcpa).toLocaleString()} を超過`,
        adName: ad.adName,
      });
    }

    if (target.targetCtr && ad.ctr < target.targetCtr * 0.8) {
      alerts.push({
        id: `alert-ctr-${ad.id}`,
        type: 'info',
        message: `CTR ${(ad.ctr * 100).toFixed(2)}% が目標 ${(target.targetCtr * 100).toFixed(2)}% の80%を下回っています`,
        adName: ad.adName,
      });
    }
  }

  return alerts;
}
