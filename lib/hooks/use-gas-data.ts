'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Project, AdPerformance, KpiTarget, Platform, PlatformTab } from '@/types';
import {
  isGasConnected,
  fetchProjects,
  fetchPerformance,
  fetchTargets,
  updateTarget as gasUpdateTarget,
} from '@/lib/api/gas-client';
import {
  getProjects,
  getProjectBySlug,
  getAdPerformance,
  getKpiTarget,
} from '@/lib/data-provider';
import { MOCK_AD_PERFORMANCE, MOCK_KPI_TARGETS } from '@/lib/mock-data';

interface UseGasProjectsResult {
  readonly projects: readonly Project[];
  readonly loading: boolean;
}

/**
 * 案件一覧を取得
 */
export function useGasProjects(): UseGasProjectsResult {
  const [projects, setProjects] = useState<readonly Project[]>(getProjects());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isGasConnected()) return;

    setLoading(true);
    fetchProjects()
      .then((res) => {
        const mapped: readonly Project[] = res.projects.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          sortOrder: p.sortOrder,
          createdAt: '',
        }));
        setProjects(mapped);
      })
      .catch((err) => console.error('Failed to fetch projects:', err))
      .finally(() => setLoading(false));
  }, []);

  return { projects, loading };
}

interface UseGasPerformanceResult {
  readonly data: readonly AdPerformance[];
  readonly kpiTarget: KpiTarget | null;
  readonly loading: boolean;
  readonly updateKpiTarget: (field: string, value: number) => void;
}

// ポーリング間隔 (ms)
const AUTO_REFRESH_INTERVAL = 30_000; // 30秒

/**
 * 広告パフォーマンス + KPI目標を取得（30秒毎に自動更新）
 */
export function useGasPerformance(
  projectId: string | undefined,
  platformTab: PlatformTab
): UseGasPerformanceResult {
  const [data, setData] = useState<readonly AdPerformance[]>([]);
  const [kpiTarget, setKpiTarget] = useState<KpiTarget | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    if (!isGasConnected()) {
      // モックデータ
      const platform = platformTab === 'all' ? undefined : platformTab;
      setData(getAdPerformance(projectId, platform));
      setKpiTarget(getKpiTarget(projectId, platformTab === 'all' ? 'meta' : platformTab) ?? null);
      return;
    }

    const platform = platformTab === 'all' ? undefined : platformTab;

    // フェッチ関数を定義してinterval内で呼べるように
    const fetchData = (showLoading: boolean) => {
      if (showLoading) setLoading(true);

      Promise.all([
        fetchPerformance(projectId, platform),
        fetchTargets(projectId),
      ])
        .then(([perfRes, targetRes]) => {
          const mapped: readonly AdPerformance[] = perfRes.performance.map((p) => ({
            ...p,
            platform: p.platform as Platform,
            lpv: 0,
            lpvr: 0,
            lpvc: 0,
            createdAt: '',
          }));
          setData(mapped);

          if (targetRes.targets) {
            setKpiTarget({
              ...targetRes.targets,
              id: 'gas-target-' + projectId,
              projectId: targetRes.targets.projectId,
              platform: (platformTab === 'all' ? 'meta' : platformTab) as Platform,
              updatedAt: '',
            });
          } else {
            setKpiTarget(null);
          }
        })
        .catch((err) => console.error('Failed to fetch performance:', err))
        .finally(() => {
          if (showLoading) setLoading(false);
        });
    };

    // 初回フェッチ
    fetchData(true);

    // 30秒毎に自動更新（ローディング表示なし = 静かに差分更新）
    const intervalId = setInterval(() => fetchData(false), AUTO_REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [projectId, platformTab]);

  const updateKpiTarget = useCallback(
    (field: string, value: number) => {
      if (!projectId) return;

      // ローカル状態を即座に更新
      setKpiTarget((prev) =>
        prev ? { ...prev, [field]: value } : null
      );

      // GAS接続時はサーバーにも反映
      if (isGasConnected()) {
        gasUpdateTarget(projectId, field, value).catch((err) =>
          console.error('Failed to update target:', err)
        );
      }
    },
    [projectId]
  );

  return { data, kpiTarget, loading, updateKpiTarget };
}
