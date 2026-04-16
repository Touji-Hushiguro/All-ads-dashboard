'use client';

import { useState, useRef, useEffect } from 'react';
import type { KpiSummary } from '@/types';
import { formatValue } from '@/lib/utils';

const STATUS_COLORS: Record<KpiSummary['status'], string> = {
  good: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  over: 'bg-red-50 border-red-200 text-red-800',
  neutral: 'bg-gray-50 border-gray-200 text-gray-800',
};

interface EditableTargetProps {
  readonly label: string;
  readonly target: number;
  readonly format: 'currency' | 'number' | 'percent';
  readonly onSave: (label: string, value: number) => void;
}

function EditableTarget({ label, target, format, onSave }: EditableTargetProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function handleStartEdit() {
    // percent の場合は表示用に *100 した値を初期値に
    const displayVal = format === 'percent' ? (target * 100).toFixed(2) : String(target);
    setInputValue(displayVal);
    setEditing(true);
  }

  function handleSave() {
    const num = Number(inputValue);
    if (!isNaN(num) && num >= 0) {
      // percent の場合は /100 して保存
      const saveVal = format === 'percent' ? num / 100 : num;
      onSave(label, saveVal);
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="text-xs mt-1 flex items-center gap-1">
        <span className="opacity-60">目標:</span>
        <input
          ref={inputRef}
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="w-20 px-1 py-0.5 text-xs border border-gray-300 rounded
            bg-white text-gray-800 outline-none focus:ring-1 focus:ring-blue-500"
          step={format === 'percent' ? '0.01' : '1'}
        />
        {format === 'percent' && <span className="opacity-60">%</span>}
      </div>
    );
  }

  return (
    <div
      className="text-xs mt-1 opacity-60 cursor-pointer hover:opacity-100
        hover:underline decoration-dashed transition-opacity"
      onClick={handleStartEdit}
      title="クリックして目標値を編集"
    >
      目標: {formatValue(target, format)}
    </div>
  );
}

interface KpiSummaryCardsProps {
  readonly items: readonly KpiSummary[];
  readonly onTargetChange?: (label: string, value: number) => void;
}

export default function KpiSummaryCards({ items, onTargetChange }: KpiSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-lg border p-3 ${STATUS_COLORS[item.status]}`}
        >
          <div className="text-xs font-medium opacity-70 mb-1">{item.label}</div>
          <div className="text-lg font-bold">
            {formatValue(item.value, item.format)}
          </div>
          {item.target !== null && onTargetChange ? (
            <EditableTarget
              label={item.label}
              target={item.target}
              format={item.format}
              onSave={onTargetChange}
            />
          ) : item.target !== null ? (
            <div className="text-xs mt-1 opacity-60">
              目標: {formatValue(item.target, item.format)}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
