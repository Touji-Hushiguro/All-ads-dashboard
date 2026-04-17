'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { AdPerformance, KpiTarget, SortConfig, SortDirection } from '@/types';
import { AD_COLUMNS } from '@/lib/columns';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils';
import { isGasConnected, fetchMemos, updateMemo as gasUpdateMemo } from '@/lib/api/gas-client';
import ColumnToggle from './ColumnToggle';

const STORAGE_KEY = 'ad-dashboard-visible-columns-v2';
const MEMO_STORAGE_KEY = 'ad-dashboard-memos';

function getInitialVisibleKeys(): Set<string> {
  if (typeof window === 'undefined') {
    return new Set(AD_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key));
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return new Set(JSON.parse(saved) as string[]);
  } catch {
    // ignore
  }
  return new Set(AD_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key));
}

interface AdPerformanceTableProps {
  readonly data: readonly AdPerformance[];
  readonly kpiTarget: KpiTarget | null;
  readonly showPlatformColumn: boolean;
  readonly onToggleStop: (id: string, stopped: boolean) => void;
}

export default function AdPerformanceTable({
  data,
  kpiTarget,
  showPlatformColumn,
  onToggleStop,
}: AdPerformanceTableProps) {
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(getInitialVisibleKeys);
  const [sort, setSort] = useState<SortConfig | null>(null);
  const [memos, setMemos] = useState<Record<string, string>>({});

  // スプレッドシートからメモを取得
  useEffect(() => {
    if (!isGasConnected()) return;
    fetchMemos()
      .then((res) => setMemos(res.memos))
      .catch((err) => console.error('Failed to fetch memos:', err));
  }, []);

  // デバウンス用タイマー
  const debounceRef = useCallback(() => {
    const timers: Record<string, ReturnType<typeof setTimeout>> = {};
    return (adName: string, value: string) => {
      if (timers[adName]) clearTimeout(timers[adName]);
      timers[adName] = setTimeout(() => {
        if (isGasConnected()) {
          gasUpdateMemo(adName, value).catch((err) =>
            console.error('Failed to save memo:', err)
          );
        }
      }, 800);
    };
  }, [])();

  const handleMemoChange = useCallback((adName: string, value: string) => {
    setMemos((prev) => ({ ...prev, [adName]: value }));
    debounceRef(adName, value);
  }, [debounceRef]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...visibleKeys]));
  }, [visibleKeys]);

  const handleToggleColumn = useCallback((key: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleSort = useCallback((key: keyof AdPerformance) => {
    setSort((prev) => {
      if (prev?.key === key) {
        const nextDir: SortDirection = prev.direction === 'asc' ? 'desc' : 'asc';
        return { key, direction: nextDir };
      }
      return { key, direction: 'desc' };
    });
  }, []);

  const visibleColumns = useMemo(
    () =>
      AD_COLUMNS.filter((col) => {
        if (col.key === 'platform' && !showPlatformColumn) return false;
        return visibleKeys.has(col.key);
      }),
    [visibleKeys, showPlatformColumn]
  );

  const sortedData = useMemo(() => {
    if (!sort) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sort.key];
      const bVal = b[sort.key];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sort.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sort.direction === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }, [data, sort]);

  function isOverTarget(row: AdPerformance): boolean {
    if (!kpiTarget?.targetCpa) return false;
    return row.cpa > kpiTarget.targetCpa;
  }

  function formatCell(value: unknown, format: string): string {
    if (typeof value === 'boolean') return '';
    if (typeof value !== 'number') return String(value ?? '');
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percent':
        return formatPercent(value);
      case 'number':
        return formatNumber(value);
      default:
        return String(value);
    }
  }

  const platformLabels: Record<string, string> = {
    meta: 'Meta',
    google: 'Google',
    tiktok: 'TikTok',
  };

  return (
    <div>
      <div className="flex justify-end mb-2">
        <ColumnToggle
          columns={AD_COLUMNS}
          visibleKeys={visibleKeys}
          onToggle={handleToggleColumn}
        />
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2 text-left font-medium text-gray-600 cursor-pointer
                    hover:bg-gray-100 transition-colors whitespace-nowrap select-none"
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sort?.key === col.key ? (
                      sort.direction === 'asc' ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      )
                    ) : (
                      <ArrowUpDown size={12} className="opacity-30" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row) => (
              <tr
                key={row.id}
                className={`
                  border-b border-gray-100 hover:bg-gray-50 transition-colors
                  ${isOverTarget(row) ? 'bg-red-50' : ''}
                  ${row.isStopped ? 'opacity-50' : ''}
                `}
              >
                {visibleColumns.map((col) => (
                  <td
                    key={col.key}
                    className="px-3 py-2 whitespace-nowrap"
                  >
                    {col.key === 'memo' ? (
                      <input
                        type="text"
                        value={memos[row.adName] ?? ''}
                        onChange={(e) => handleMemoChange(row.adName, e.target.value)}
                        placeholder="メモ..."
                        className="w-32 px-2 py-1 text-xs border border-gray-200 rounded
                          focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                      />
                    ) : col.key === 'isStopped' ? (
                      <input
                        type="checkbox"
                        checked={row.isStopped}
                        onChange={() => onToggleStop(row.id, !row.isStopped)}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                    ) : col.key === 'platform' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs
                        font-medium bg-blue-100 text-blue-700">
                        {platformLabels[row.platform] ?? row.platform}
                      </span>
                    ) : col.key === 'adName' ? (
                      <span className="font-medium text-gray-900 max-w-xs truncate block">
                        {row.adName}
                      </span>
                    ) : (
                      <span className={`
                        ${col.format === 'currency' || col.format === 'number'
                          ? 'text-right block'
                          : ''
                        }
                      `}>
                        {formatCell(row[col.key], col.format)}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {sortedData.length === 0 && (
              <tr>
                <td
                  colSpan={visibleColumns.length}
                  className="px-3 py-8 text-center text-gray-400"
                >
                  データがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
