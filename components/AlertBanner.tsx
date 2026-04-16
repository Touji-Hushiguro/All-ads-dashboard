'use client';

import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useState } from 'react';
import type { Alert } from '@/types';

const ALERT_STYLES: Record<Alert['type'], { bg: string; icon: typeof AlertTriangle }> = {
  critical: { bg: 'bg-red-50 border-red-200 text-red-800', icon: AlertTriangle },
  warning: { bg: 'bg-orange-50 border-orange-200 text-orange-800', icon: AlertCircle },
  info: { bg: 'bg-yellow-50 border-yellow-200 text-yellow-800', icon: Info },
};

interface AlertBannerProps {
  readonly alerts: readonly Alert[];
}

export default function AlertBanner({ alerts }: AlertBannerProps) {
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.id));

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {visibleAlerts.map((alert) => {
        const style = ALERT_STYLES[alert.type];
        const Icon = style.icon;
        return (
          <div
            key={alert.id}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${style.bg}`}
          >
            <Icon size={18} className="flex-shrink-0" />
            <span className="text-sm flex-1">
              <span className="font-medium">{alert.adName}</span>
              {' — '}
              {alert.message}
            </span>
            <button
              onClick={() => setDismissed((prev) => new Set([...prev, alert.id]))}
              className="p-0.5 rounded-full hover:bg-black/10 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
