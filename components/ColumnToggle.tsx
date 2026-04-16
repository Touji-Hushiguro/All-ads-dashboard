'use client';

import { useState, useRef, useEffect } from 'react';
import { Columns3 } from 'lucide-react';
import type { ColumnDef } from '@/types';

interface ColumnToggleProps {
  readonly columns: readonly ColumnDef[];
  readonly visibleKeys: ReadonlySet<string>;
  readonly onToggle: (key: string) => void;
}

export default function ColumnToggle({ columns, visibleKeys, onToggle }: ColumnToggleProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600
          border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <Columns3 size={16} />
        カラム表示
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200
          rounded-lg shadow-lg z-50 p-3 w-64 max-h-80 overflow-y-auto">
          <div className="text-xs font-medium text-gray-500 mb-2">表示するカラム</div>
          {columns.map((col) => (
            <label
              key={col.key}
              className="flex items-center gap-2 py-1 px-1 rounded hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={visibleKeys.has(col.key)}
                onChange={() => onToggle(col.key)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{col.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
