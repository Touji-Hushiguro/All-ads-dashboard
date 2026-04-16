'use client';

import { useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import PlatformSubTabs from '@/components/PlatformSubTabs';
import KpiSummaryCards from '@/components/KpiSummaryCards';
import AdPerformanceTable from '@/components/AdPerformanceTable';
import AlertBanner from '@/components/AlertBanner';
import type { PlatformTab, KpiSummary, AdPerformance, KpiTarget } from '@/types';
import {
  getProjectBySlug,
  aggregatePerformance,
} from '@/lib/data-provider';
import { getKpiStatus } from '@/lib/utils';
import { generateAlerts } from '@/lib/alerts';
import { useGasPerformance, useGasProjects } from '@/lib/hooks/use-gas-data';
import { isGasConnected, updateTarget as gasUpdateTarget } from '@/lib/api/gas-client';

export default function ProjectPage() {
  const params = useParams();
  const slug = params.project as string;
  const [platformTab, setPlatformTab] = useState<PlatformTab>('meta');
  const [stoppedOverrides, setStoppedOverrides] = useState<
    ReadonlyMap<string, boolean>
  >(new Map());

  // GAS接続時はGASのprojects、未接続時はモックで解決
  const { projects: gasProjects } = useGasProjects();
  const project =
    gasProjects.find((p) => p.slug === slug) ?? getProjectBySlug(slug);

  // GAS or モック からデータ取得
  const {
    data: rawData,
    kpiTarget: fetchedKpiTarget,
    loading,
    updateKpiTarget,
  } = useGasPerformance(project?.id, platformTab);

  const data: readonly AdPerformance[] = useMemo(
    () =>
      rawData.map((d) => {
        const override = stoppedOverrides.get(d.id);
        return override !== undefined ? { ...d, isStopped: override } : d;
      }),
    [rawData, stoppedOverrides]
  );

  const kpiTarget = fetchedKpiTarget;

  // ラベル → KpiTarget フィールドのマッピング
  const labelToTargetField: Record<string, string> = {
    '広告費': 'dailyBudget',
    'CPM': 'targetCpm',
    'CTR': 'targetCtr',
    'CPC': 'targetCpc',
    'MCVR': 'targetMcvr',
    'MCPA': 'targetMcpa',
    'CPA': 'targetCpa',
  };

  const handleTargetChange = useCallback((label: string, value: number) => {
    const field = labelToTargetField[label];
    if (field) {
      updateKpiTarget(field, value);
    }
  }, [updateKpiTarget]);

  const agg = useMemo(() => aggregatePerformance(data), [data]);

  const kpiSummaries: readonly KpiSummary[] = useMemo(
    () => [
      {
        label: '広告費',
        value: agg.spend,
        target: kpiTarget?.dailyBudget ?? null,
        format: 'currency' as const,
        status: getKpiStatus(agg.spend, kpiTarget?.dailyBudget ?? null, true),
      },
      {
        label: 'IMP',
        value: agg.impressions,
        target: null,
        format: 'number' as const,
        status: 'neutral' as const,
      },
      {
        label: 'Clicks',
        value: agg.clicks,
        target: null,
        format: 'number' as const,
        status: 'neutral' as const,
      },
      {
        label: 'CPM',
        value: agg.cpm,
        target: kpiTarget?.targetCpm ?? null,
        format: 'currency' as const,
        status: getKpiStatus(agg.cpm, kpiTarget?.targetCpm ?? null, true),
      },
      {
        label: 'CTR',
        value: agg.ctr,
        target: kpiTarget?.targetCtr ?? null,
        format: 'percent' as const,
        status: getKpiStatus(agg.ctr, kpiTarget?.targetCtr ?? null, false),
      },
      {
        label: 'CPC',
        value: agg.cpc,
        target: kpiTarget?.targetCpc ?? null,
        format: 'currency' as const,
        status: getKpiStatus(agg.cpc, kpiTarget?.targetCpc ?? null, true),
      },
      {
        label: 'MCV',
        value: agg.mcv,
        target: null,
        format: 'number' as const,
        status: 'neutral' as const,
      },
      {
        label: 'MCVR',
        value: agg.mcvr,
        target: kpiTarget?.targetMcvr ?? null,
        format: 'percent' as const,
        status: getKpiStatus(agg.mcvr, kpiTarget?.targetMcvr ?? null, false),
      },
      {
        label: 'MCPA',
        value: agg.mcpa,
        target: kpiTarget?.targetMcpa ?? null,
        format: 'currency' as const,
        status: getKpiStatus(agg.mcpa, kpiTarget?.targetMcpa ?? null, true),
      },
      {
        label: 'CV',
        value: agg.cv,
        target: null,
        format: 'number' as const,
        status: 'neutral' as const,
      },
      {
        label: 'CVR',
        value: agg.cvr,
        target: null,
        format: 'percent' as const,
        status: 'neutral' as const,
      },
      {
        label: 'CPA',
        value: agg.cpa,
        target: kpiTarget?.targetCpa ?? null,
        format: 'currency' as const,
        status: getKpiStatus(agg.cpa, kpiTarget?.targetCpa ?? null, true),
      },
      {
        label: '売上',
        value: agg.revenue,
        target: null,
        format: 'currency' as const,
        status: 'neutral' as const,
      },
      {
        label: '粗利',
        value: agg.grossProfit,
        target: null,
        format: 'currency' as const,
        status: 'neutral' as const,
      },
    ],
    [agg, kpiTarget]
  );

  const alerts = useMemo(
    () => generateAlerts(data, kpiTarget),
    [data, kpiTarget]
  );

  const handleToggleStop = useCallback((id: string, stopped: boolean) => {
    setStoppedOverrides((prev) => {
      const next = new Map(prev);
      next.set(id, stopped);
      return next;
    });
  }, []);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400">
        案件が見つかりません。タブから案件を選択してください。
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ローディング */}
      {loading && (
        <div className="text-center text-gray-400 py-4">
          データを読み込み中...
        </div>
      )}

      {/* アラートバナー */}
      <AlertBanner alerts={alerts} />

      {/* 媒体サブタブ */}
      <PlatformSubTabs active={platformTab} onChange={setPlatformTab} />

      {/* KPIサマリーカード */}
      <KpiSummaryCards items={kpiSummaries} onTargetChange={handleTargetChange} />

      {/* 広告テーブル */}
      <AdPerformanceTable
        data={data}
        kpiTarget={kpiTarget}
        showPlatformColumn={platformTab === 'all'}
        onToggleStop={handleToggleStop}
      />
    </div>
  );
}
