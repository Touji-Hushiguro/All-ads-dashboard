'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Project, AdPerformance, KpiTarget, Platform, PlatformTab } from '@/types';
import { getProjects, getAdPerformance, getKpiTarget } from '@/lib/data-provider';
import {
  fetchProjectsFromCache,
  fetchProjectDataFromCache,
  type ProjectCacheData,
} from '@/lib/api/data-client';

// ══════════════════════════════════════
// グローバルキャッシュ
// ══════════════════════════════════════

interface CachedProjectData {
  readonly allData: readonly AdPerformance[];
  readonly kpiTarget: KpiTarget | null;
  readonly memos: Record<string, string>;
  readonly fetchedAt: number;
}

const projectCache = new Map<string, CachedProjectData>();
const CACHE_TTL = 5 * 60 * 1000;
const AUTO_REFRESH_INTERVAL = 10_000;
const inflightFetches = new Map<string, Promise<void>>();

function isVercelApiAvailable(): boolean {
  return typeof window !== 'undefined';
}

function mapCacheToLocal(data: ProjectCacheData): CachedProjectData {
  const allData: AdPerformance[] = data.performance.map((p) => ({
    ...p,
    platform: p.platform as Platform,
    lpv: 0,
    lpvr: 0,
    lpvc: 0,
    createdAt: '',
  }));

  const kpiTarget: KpiTarget | null = data.targets
    ? {
        ...data.targets,
        id: 'target-' + data.targets.projectId,
        projectId: data.targets.projectId,
        platform: 'meta' as Platform,
        updatedAt: '',
      }
    : null;

  return {
    allData,
    kpiTarget,
    memos: data.memos ?? {},
    fetchedAt: Date.now(),
  };
}

function fetchProjectData(projectId: string): Promise<void> {
  const existing = inflightFetches.get(projectId);
  if (existing) return existing;

  const promise = fetchProjectDataFromCache(projectId)
    .then((data) => {
      projectCache.set(projectId, mapCacheToLocal(data));
    })
    .catch((err) => {
      console.error(`Failed to fetch project ${projectId}:`, err);
    })
    .finally(() => {
      inflightFetches.delete(projectId);
    });

  inflightFetches.set(projectId, promise);
  return promise;
}

// ══════════════════════════════════════
// useGasProjects
// ══════════════════════════════════════

interface UseGasProjectsResult {
  readonly projects: readonly Project[];
  readonly loading: boolean;
}

export function useGasProjects(): UseGasProjectsResult {
  const [projects, setProjects] = useState<readonly Project[]>(getProjects());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isVercelApiAvailable()) return;

    setLoading(true);
    fetchProjectsFromCache()
      .then((res) => {
        const mapped: readonly Project[] = res.projects.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          sortOrder: p.sortOrder,
          createdAt: '',
        }));
        setProjects(mapped);

        // プリフェッチ
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
// useGasPerformance
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

    if (!isVercelApiAvailable()) {
      setAllData(getAdPerformance(projectId));
      setKpiTarget(getKpiTarget(projectId, 'meta') ?? null);
      return;
    }

    // キャッシュがあれば即表示
    const cached = projectCache.get(projectId);
    if (cached) {
      setAllData(cached.allData);
      setKpiTarget(cached.kpiTarget);
    } else {
      setLoading(true);
    }

    const refresh = (showLoading: boolean) => {
      fetchProjectData(projectId).then(() => {
        if (!mountedRef.current) return;
        const data = projectCache.get(projectId);
        if (data) {
          setAllData(data.allData);
          setKpiTarget(data.kpiTarget);
        }
        if (showLoading) setLoading(false);
      });
    };

    refresh(!cached);
    const intervalId = setInterval(() => refresh(false), AUTO_REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [projectId]);

  const data = useMemo<readonly AdPerformance[]>(() => {
    if (platformTab === 'all') return allData;
    return allData.filter((d) => d.platform === platformTab);
  }, [allData, platformTab]);

  const updateKpiTarget = useCallback(
    (field: string, value: number) => {
      if (!projectId) return;
      setKpiTarget((prev) => (prev ? { ...prev, [field]: value } : null));
    },
    [projectId]
  );

  return { data, kpiTarget, loading, updateKpiTarget };
}

// ══════════════════════════════════════
// useProjectMemos
// ══════════════════════════════════════

export function useProjectMemos(projectId: string | undefined): Record<string, string> {
  const cached = projectId ? projectCache.get(projectId) : undefined;
  return cached?.memos ?? {};
}
