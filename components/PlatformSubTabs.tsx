'use client';

import type { PlatformTab } from '@/types';

const TABS: readonly { readonly value: PlatformTab; readonly label: string }[] = [
  { value: 'meta', label: 'Meta' },
  { value: 'google', label: 'Google' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'all', label: '全媒体合計' },
];

interface PlatformSubTabsProps {
  readonly active: PlatformTab;
  readonly onChange: (tab: PlatformTab) => void;
}

export default function PlatformSubTabs({ active, onChange }: PlatformSubTabsProps) {
  return (
    <div className="flex gap-1 border-b border-gray-200">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          className={`
            px-4 py-2 text-sm font-medium rounded-t-md transition-colors
            ${active === tab.value
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }
          `}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
