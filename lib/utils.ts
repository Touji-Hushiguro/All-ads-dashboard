/**
 * 数値を日本円フォーマットで表示
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * 数値をパーセント表示
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * 数値をカンマ区切りで表示
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ja-JP', {
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * フォーマット種別に応じた表示
 */
export function formatValue(
  value: number,
  format: 'currency' | 'number' | 'percent'
): string {
  switch (format) {
    case 'currency':
      return formatCurrency(value);
    case 'percent':
      return formatPercent(value);
    case 'number':
      return formatNumber(value);
  }
}

/**
 * KPIの目標比較ステータス判定
 * value < target → good (緑)
 * value < target * 1.2 → warning (黄)
 * value >= target * 1.2 → over (赤)
 */
export function getKpiStatus(
  value: number,
  target: number | null,
  lowerIsBetter: boolean = true
): 'good' | 'warning' | 'over' | 'neutral' {
  if (target === null || target === 0) return 'neutral';

  if (lowerIsBetter) {
    if (value <= target) return 'good';
    if (value <= target * 1.2) return 'warning';
    return 'over';
  }

  // Higher is better (CTR, CVR, etc.)
  if (value >= target) return 'good';
  if (value >= target * 0.8) return 'warning';
  return 'over';
}

/**
 * slugを生成
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * UUID生成 (簡易版)
 */
export function generateId(): string {
  return crypto.randomUUID();
}
