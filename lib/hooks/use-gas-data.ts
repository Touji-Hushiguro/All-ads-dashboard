'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Project, AdPerformance, KpiTarget, Platform, PlatformTab } from '@/types';
import {
  isGasConnected,
  fetchProjects,
  fetchPerformance,
  fetchTargets,
  fetchBatch,
  fetchMemos,
  updateTarget as gasUpdateTarget,
} from '@/lib/api/gas-client';
import {
  getProjects,
  getProjectBySlug,
  getAdPerformance,
  getKpiTarget,
} from '@/lib/data-provider';

// ══════════════════════════════════════
// グローバルキャッシュ（コンポーネント間で共有）
// ══════════════════════════════════════

interface CachedProjectData {
  readonly allData: readonly AdPerformance[];
  readonly kpiTarget: KpiTarget | null;
  readonly fetchedAt: number;
}

/** プロジェクト別データキャッシュ（全コンポーネントで共有） */
const projectCache = new Map<string, CachedProjectData>();

/** キャッシュの有効期限: 5分（ポーリングで随時更新されるので長めでOK） */
const CACHE_TTL = 5 * 60 * 1000;

/** ポーリング間隔 */
const AUTO_REFRESH_INTERVAL = 10_000; // 10秒

/** 実行中のフェッチを重複排除するための Map */
const inflightFetches = new Map<string, Promise<void>>();

// ══════════════════════════════════════
// 共通フェッチ関数（キャッシュ書き込み付き）
// ══════════════════════════════════════

function fetchProjectData(projectId: string): Promise<void> {
  // 既に同じprojectIdのフェッチが飛んでいたらそれを待つ（重複排除）
  const existing = inflightFetches.get(projectId);
  if (existing) return existing;

  // バッチAPI（1リクエスト）にフォールバック → 2リクエスト
  const promise = fetchBatch(projectId)
    .catch(() =>
      // バッチAPI未デプロイ時のフォールバック
      Promise.all([fetchPerformance(projectId), fetchTargets(projectId)])
        .then(([p, t]) => ({ performance: p.performance, targets: t.targets }))
    )
    .then((res) => {
      const mapped: readonly AdPerformance[] = res.performance.map((p) => ({
        ...p,
        platform: p.platform as Platform,
        lpv: 0,
        lpvr: 0,
        lpvc: 0,
        createdAt: '',
      }));

      const kpiTarget: KpiTarget | null = res.targets
        ? {
            ...res.targets,
            id: 'gas-target-' + projectId,
            projectId: res.targets.projectId,
            platform: 'meta' as Platform,
            updatedAt: '',
          }
        : null;

      projectCache.set(projectId, {
        allData: mapped,
        kpiTarget,
        fetchedAt: Date.now(),
      });
    })
    .finally(() => {
      inflightFetches.delete(projectId);
    });

  inflightFetches.set(projectId, promise);
  return promise;
}

// ══════════════════════════════════════
// useGasProjects — 案件一覧（プリフェッチ付き）
// ══════════════════════════════════════

interface UseGasProjectsResult {
  readonly projects: readonly Project[];
  readonly loading: boolean;
}

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

        // ★ 全プロジェクトのデータをバックグラウンドでプリフェッチ
        mapped.forEach((p) => {
          if (!projectCache.has(p.id)) {
            fetchProjectData(p.id).catch(() => {});
          }
        });
      })
      .catch((err) => console.error('Failed to fetch projects:', err))
      .finally(() => setLoading(false));
  }, []);

  return { projects, loading };
}

// ══════════════════════════════════════
// useGasPerformance — キャッシュ優先 + バックグラウンド更新
// ══════════════════════════════════════

interface UseGasPerformanceResult {
  readonly data: readonly AdPerformance[];
  readonly kpiTarget: KpiTarget | null;
  readonly loading: boolean;
  readonly updateKpiTarget: (field: string, value: number) => void;
}

export function useGasPerformance(
  projectId: string | undefined,
  platformTab: PlatformTab
): UseGasPerformanceResult {
  const [allData, setAllData] = useState<readonly AdPerformance[]>([]);
  const [kpiTarget, setKpiTarget] = useState<KpiTarget | null>(null);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!projectId) return;

    if (!isGasConnected()) {
      setAllData(getAdPerformance(projectId));
      setKpiTarget(getKpiTarget(projectId, 'meta') ?? null);
      return;
    }

    // ★ キャッシュがあれば即表示（ローディングなし）
    const cached = projectCache.get(projectId);
    if (cached) {
      setAllData(cached.allData);
      setKpiTarget(cached.kpiTarget);
      // キャッシュが古ければバックグラウンドで更新
      if (Date.now() - cached.fetchedAt > CACHE_TTL) {
        fetchProjectData(projectId).then(() => {
          if (!mountedRef.current) return;
          const fresh = projectCache.get(projectId);
          if (fresh) {
            setAllData(fresh.allData);
            setKpiTarget(fresh.kpiTarget);
          }
        }).catch(() => {});
      }
    } else {
      // キャッシュなし → ローディング表示してフェッチ
      setLoading(true);
    }

    // フェッチ（キャッシュ有無に関わらず最新取得）
    const refresh = (showLoading: boolean) => {
      const p = fetchProjectData(projectId);
      if (showLoading) {
        p.then(() => {
          if (!mountedRef.current) return;
          const data = projectCache.get(projectId);
          if (data) {
            setAllData(data.allData);
            setKpiTarget(data.kpiTarget);
          }
        })
        .catch((err) => console.error('Failed to fetch:', err))
        .finally(() => {
          if (mountedRef.current) setLoading(false);
        });
      } else {
        p.then(() => {
          if (!mountedRef.current) return;
          const data = projectCache.get(projectId);
          if (data) {
            setAllData(data.allData);
            setKpiTarget(data.kpiTarget);
          }
        }).catch(() => {});
      }
    };

    // 初回フェッチ（キャッシュなければローディング付き）
    refresh(!cached);

    // ポーリング
    const intervalId = setInterval(() => refresh(false), AUTO_REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [projectId]);

  // クライアント側プラットフォームフィルタ
  const data = useMemo<readonly AdPerformance[]>(() => {
    if (platformTab === 'all') return allData;
    return allData.filter((d) => d.platform === platformTab);
  }, [allData, platformTab]);

  const updateKpiTarget = useCallback(
    (field: string, value: number) => {
      if (!projectId) return;
      setKpiTarget((prev) => (prev ? { ...prev, [field]: value } : null));
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
