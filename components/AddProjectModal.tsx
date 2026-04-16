'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { Platform } from '@/types';

interface AddProjectModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onAdd: (data: {
    name: string;
    platform: Platform;
    accountIds: string[];
  }) => void;
}

export default function AddProjectModal({ open, onClose, onAdd }: AddProjectModalProps) {
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<Platform>('meta');
  const [accountIds, setAccountIds] = useState('');

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      name: name.trim(),
      platform,
      accountIds: accountIds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });

    setName('');
    setPlatform('meta');
    setAccountIds('');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">新規案件を追加</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              案件名
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: DENNOVATE"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              媒体
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="meta">Meta</option>
              <option value="google">Google</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              アカウントID（カンマ区切りで複数可）
            </label>
            <input
              type="text"
              value={accountIds}
              onChange={(e) => setAccountIds(e.target.value)}
              placeholder="例: 1679205389760560, 639345955662224"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300
                rounded-lg hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm text-white bg-blue-600
                rounded-lg hover:bg-blue-700 transition-colors"
            >
              追加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
