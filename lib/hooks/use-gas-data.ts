'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
 *
 * 重要: 案件単位で全媒体データを一度だけ取得し、媒体タブ切替はクライアント側でフィルタ。
 *      これによりタブ切替が瞬時に完了する（GASリクエスト発生しない）。
 */
export function useGasPerformance(
  projectId: string | undefined,
  platformTab: PlatformTab
): UseGasPerformanceResult {
  // 全媒体のデータを保持（プロジェクト切替時のみリフェッチ）
  const [allData, setAllData] = useState<readonly AdPerformance[]>([]);
  const [kpiTarget, setKpiTarget] = useState<KpiTarget | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    if (!isGasConnected()) {
      // モックデータ（全媒体を一括取得してクライアント側フィルタに備える）
      setAllData(getAdPerformance(projectId));
      setKpiTarget(getKpiTarget(projectId, 'meta') ?? null);
      return;
    }

    // フェッチ関数を定義してinterval内で呼べるように
    const fetchData = (showLoading: boolean) => {
      if (showLoading) setLoading(true);

      // platform=undefined で全媒体取得
      Promise.all([
        fetchPerformance(projectId),
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
          setAllData(mapped);

          if (targetRes.targets) {
            setKpiTarget({
              ...targetRes.targets,
              id: 'gas-target-' + projectId,
              projectId: targetRes.targets.projectId,
              platform: 'meta' as Platform,
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
  }, [projectId]); // platformTabは依存から外す: タブ切替でリフェッチしない

  // クライアント側でプラットフォームフィルタ
  const data = useMemo<readonly AdPerformance[]>(() => {
    if (platformTab === 'all') return allData;
    return allData.filter((d) => d.platform === platformTab);
  }, [allData, platformTab]);

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
