'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProjectTabs from '@/components/ProjectTabs';
import AddProjectModal from '@/components/AddProjectModal';
import type { Project, Platform } from '@/types';
import { MOCK_PROJECTS } from '@/lib/mock-data';
import { useGasProjects } from '@/lib/hooks/use-gas-data';
import { generateSlug, generateId } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const router = useRouter();
  const { projects: gasProjects, loading } = useGasProjects();
  const [projects, setProjects] = useState<readonly Project[]>(MOCK_PROJECTS);
  const [modalOpen, setModalOpen] = useState(false);

  // GASからの取得完了後、ローカル状態を同期
  useEffect(() => {
    if (!loading && gasProjects.length > 0) {
      setProjects(gasProjects);
    }
  }, [gasProjects, loading]);

  const handleProjectsChange = useCallback(
    (updated: readonly Project[]) => {
      setProjects(updated);
    },
    []
  );

  const handleAddProject = useCallback(
    (data: { name: string; platform: Platform; accountIds: string[] }) => {
      const newProject: Project = {
        id: generateId(),
        name: data.name,
        slug: generateSlug(data.name),
        sortOrder: projects.length,
        createdAt: new Date().toISOString(),
      };
      setProjects([...projects, newProject]);
      router.push(`/${newProject.slug}`);
    },
    [projects, router]
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Chrome風ウインドウヘッダー */}
      <div className="bg-gray-300 px-3 py-1.5 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-white/60 rounded-md px-3 py-0.5 text-xs text-gray-500 ml-4">
          app.ad-dashboard.com
        </div>
        <div className="text-xs text-gray-500" suppressHydrationWarning>
          最終更新: {new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
        </div>
      </div>

      {/* 案件タブ */}
      <ProjectTabs
        projects={projects}
        onProjectsChange={handleProjectsChange}
        onAddProject={() => setModalOpen(true)}
      />

      {/* メインコンテンツ */}
      <div className="flex-1 bg-white">
        {children}
      </div>

      {/* 案件追加モーダル */}
      <AddProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleAddProject}
      />
    </div>
  );
}
