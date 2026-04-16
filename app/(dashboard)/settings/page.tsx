'use client';

import { useState, useCallback } from 'react';
import { ArrowLeft, Trash2, Plus, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Project, AdAccount, KpiTarget, Platform } from '@/types';
import { MOCK_PROJECTS, MOCK_AD_ACCOUNTS, MOCK_KPI_TARGETS } from '@/lib/mock-data';
import { generateId, generateSlug } from '@/lib/utils';

export default function SettingsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<readonly Project[]>(MOCK_PROJECTS);
  const [accounts, setAccounts] = useState<readonly AdAccount[]>(MOCK_AD_ACCOUNTS);
  const [kpiTargets, setKpiTargets] = useState<readonly KpiTarget[]>(MOCK_KPI_TARGETS);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    MOCK_PROJECTS[0]?.id ?? null
  );
  const [newProjectName, setNewProjectName] = useState('');
  const [newAccountId, setNewAccountId] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountPlatform, setNewAccountPlatform] = useState<Platform>('meta');

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const projectAccounts = accounts.filter(
    (a) => a.projectId === selectedProjectId
  );
  const projectKpi = kpiTargets.find(
    (k) => k.projectId === selectedProjectId
  );

  const handleAddProject = useCallback(() => {
    if (!newProjectName.trim()) return;
    const p: Project = {
      id: generateId(),
      name: newProjectName.trim(),
      slug: generateSlug(newProjectName.trim()),
      sortOrder: projects.length,
      createdAt: new Date().toISOString(),
    };
    setProjects([...projects, p]);
    setSelectedProjectId(p.id);
    setNewProjectName('');
  }, [newProjectName, projects]);

  const handleDeleteProject = useCallback(
    (id: string) => {
      if (!confirm('この案件を削除しますか？')) return;
      setProjects(projects.filter((p) => p.id !== id));
      setAccounts(accounts.filter((a) => a.projectId !== id));
      setKpiTargets(kpiTargets.filter((k) => k.projectId !== id));
      if (selectedProjectId === id) {
        setSelectedProjectId(projects.find((p) => p.id !== id)?.id ?? null);
      }
    },
    [projects, accounts, kpiTargets, selectedProjectId]
  );

  const handleAddAccount = useCallback(() => {
    if (!selectedProjectId || !newAccountId.trim()) return;
    const acc: AdAccount = {
      id: generateId(),
      projectId: selectedProjectId,
      platform: newAccountPlatform,
      accountId: newAccountId.trim(),
      accountName: newAccountName.trim() || newAccountId.trim(),
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    setAccounts([...accounts, acc]);
    setNewAccountId('');
    setNewAccountName('');
  }, [selectedProjectId, newAccountId, newAccountName, newAccountPlatform, accounts]);

  const handleDeleteAccount = useCallback(
    (id: string) => {
      setAccounts(accounts.filter((a) => a.id !== id));
    },
    [accounts]
  );

  const handleUpdateKpi = useCallback(
    (field: keyof KpiTarget, value: string) => {
      if (!selectedProjectId) return;
      const numVal = value === '' ? null : Number(value);
      const existing = kpiTargets.find((k) => k.projectId === selectedProjectId);
      if (existing) {
        setKpiTargets(
          kpiTargets.map((k) =>
            k.id === existing.id ? { ...k, [field]: numVal, updatedAt: new Date().toISOString() } : k
          )
        );
      } else {
        const newKpi: KpiTarget = {
          id: generateId(),
          projectId: selectedProjectId,
          platform: 'meta',
          targetCpa: null,
          targetMcpa: null,
          targetCpm: null,
          targetCtr: null,
          targetCpc: null,
          targetMcvr: null,
          dailyBudget: null,
          [field]: numVal,
          updatedAt: new Date().toISOString(),
        };
        setKpiTargets([...kpiTargets, newKpi]);
      }
    },
    [selectedProjectId, kpiTargets]
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">設定</h1>
      </div>

      {/* 案件一覧 */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">案件管理</h2>

        <div className="flex gap-2">
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="新規案件名"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleAddProject()}
          />
          <button
            onClick={handleAddProject}
            className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white
              rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            追加
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {projects.map((p) => (
            <div
              key={p.id}
              className={`
                flex items-center justify-between px-4 py-3 rounded-lg border cursor-pointer
                transition-colors
                ${selectedProjectId === p.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
                }
              `}
              onClick={() => setSelectedProjectId(p.id)}
            >
              <span className="font-medium text-gray-900">{p.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteProject(p.id);
                }}
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50
                  rounded transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {selectedProject && (
        <>
          {/* アカウント管理 */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {selectedProject.name} のアカウント
            </h2>

            <div className="flex gap-2">
              <select
                value={newAccountPlatform}
                onChange={(e) => setNewAccountPlatform(e.target.value as Platform)}
                className="px-3 py-2 border border-gray-300 rounded-lg
                  focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="meta">Meta</option>
                <option value="google">Google</option>
                <option value="tiktok">TikTok</option>
              </select>
              <input
                type="text"
                value={newAccountId}
                onChange={(e) => setNewAccountId(e.target.value)}
                placeholder="アカウントID"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg
                  focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="text"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="表示名（任意）"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg
                  focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                onClick={handleAddAccount}
                className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white
                  rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-2 text-left font-medium text-gray-600">媒体</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">アカウントID</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">表示名</th>
                    <th className="px-4 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {projectAccounts.map((acc) => (
                    <tr key={acc.id} className="border-b border-gray-100">
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full
                          text-xs font-medium bg-blue-100 text-blue-700">
                          {acc.platform === 'meta' ? 'Meta' : acc.platform === 'google' ? 'Google' : 'TikTok'}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-gray-700">{acc.accountId}</td>
                      <td className="px-4 py-2 text-gray-700">{acc.accountName}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleDeleteAccount(acc.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {projectAccounts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center text-gray-400">
                        アカウントがありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* KPI目標値 */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {selectedProject.name} のKPI目標値
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                { key: 'targetCpa' as const, label: '目標CPA', unit: '¥' },
                { key: 'targetMcpa' as const, label: '目標MCPA', unit: '¥' },
                { key: 'targetCpm' as const, label: '目標CPM', unit: '¥' },
                { key: 'targetCtr' as const, label: '目標CTR', unit: '%' },
                { key: 'targetCpc' as const, label: '目標CPC', unit: '¥' },
                { key: 'targetMcvr' as const, label: '目標MCVR', unit: '%' },
                { key: 'dailyBudget' as const, label: '日予算', unit: '¥' },
              ].map(({ key, label, unit }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label} ({unit})
                  </label>
                  <input
                    type="number"
                    value={projectKpi?.[key] ?? ''}
                    onChange={(e) => handleUpdateKpi(key, e.target.value)}
                    placeholder="未設定"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg
                      focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
