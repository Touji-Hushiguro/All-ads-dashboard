import type { ColumnDef } from '@/types';

export const AD_COLUMNS: readonly ColumnDef[] = [
  { key: 'adName', label: 'Ad Name', format: 'text', defaultVisible: true },
  { key: 'platform', label: '媒体', format: 'text', defaultVisible: true },
  { key: 'spend', label: 'Spend', format: 'currency', defaultVisible: true },
  { key: 'impressions', label: 'IMP', format: 'number', defaultVisible: true },
  { key: 'cpm', label: 'CPM', format: 'currency', defaultVisible: true },
  { key: 'clicks', label: 'Clicks', format: 'number', defaultVisible: true },
  { key: 'ctr', label: 'CTR', format: 'percent', defaultVisible: true },
  { key: 'cpc', label: 'CPC', format: 'currency', defaultVisible: true },
  { key: 'mcv', label: 'MCV', format: 'number', defaultVisible: true },
  { key: 'mcvr', label: 'MCVR', format: 'percent', defaultVisible: true },
  { key: 'mcpa', label: 'MCPA', format: 'currency', defaultVisible: true },
  { key: 'cv', label: 'CV', format: 'number', defaultVisible: true },
  { key: 'cvr', label: 'CVR', format: 'percent', defaultVisible: true },
  { key: 'cpa', label: 'CPA', format: 'currency', defaultVisible: true },
  { key: 'revenue', label: '売上', format: 'currency', defaultVisible: true },
  { key: 'grossProfit', label: '粗利', format: 'currency', defaultVisible: true },
  { key: 'lpv', label: 'LPV', format: 'number', defaultVisible: false },
  { key: 'lpvr', label: 'LPVR', format: 'percent', defaultVisible: false },
  { key: 'lpvc', label: 'LPVC', format: 'currency', defaultVisible: false },
  { key: 'isStopped', label: '停止', format: 'boolean', defaultVisible: true },
];
