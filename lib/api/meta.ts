/**
 * Meta Graph API v22.0 クライアント
 */

const API_BASE = 'https://graph.facebook.com';

interface MetaInsight {
  readonly ad_id: string;
  readonly ad_name: string;
  readonly spend: string;
  readonly impressions: string;
  readonly cpm: string;
  readonly clicks: string;
  readonly ctr: string;
  readonly cpc: string;
  readonly actions?: readonly { readonly action_type: string; readonly value: string }[];
  readonly date_start: string;
  readonly date_stop: string;
}

interface MetaApiResponse<T> {
  readonly data: readonly T[];
  readonly paging?: {
    readonly cursors: {
      readonly after: string;
    };
    readonly next?: string;
  };
}

function getConfig() {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const appSecret = process.env.META_APP_SECRET;
  const apiVersion = process.env.META_API_VERSION ?? 'v22.0';

  if (!accessToken) {
    throw new Error('META_ACCESS_TOKEN is not configured');
  }

  return { accessToken, appSecret, apiVersion };
}

/**
 * appsecret_proof を生成
 */
async function generateAppSecretProof(
  accessToken: string,
  appSecret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(accessToken)
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Meta APIリクエストを送信（rate limit対応つき）
 */
async function metaFetch<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<MetaApiResponse<T>> {
  const config = getConfig();

  const url = new URL(`${API_BASE}/${config.apiVersion}/${endpoint}`);
  url.searchParams.set('access_token', config.accessToken);

  if (config.appSecret) {
    const proof = await generateAppSecretProof(
      config.accessToken,
      config.appSecret
    );
    url.searchParams.set('appsecret_proof', proof);
  }

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString());

  if (response.status === 429) {
    // Rate limited — wait and retry once
    const retryAfter = Number(response.headers.get('retry-after') ?? '60');
    console.warn(`Meta API rate limited. Waiting ${retryAfter}s...`);
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    const retryResponse = await fetch(url.toString());
    if (!retryResponse.ok) {
      const errBody = await retryResponse.text();
      throw new Error(`Meta API error (retry): ${retryResponse.status} - ${errBody}`);
    }
    return retryResponse.json() as Promise<MetaApiResponse<T>>;
  }

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Meta API error: ${response.status} - ${errBody}`);
  }

  return response.json() as Promise<MetaApiResponse<T>>;
}

/**
 * 広告アカウントのインサイトを取得（日次）
 */
export async function fetchAccountInsights(
  accountId: string,
  date: string
): Promise<readonly MetaInsight[]> {
  const result = await metaFetch<MetaInsight>(`act_${accountId}/insights`, {
    level: 'ad',
    fields: [
      'ad_id',
      'ad_name',
      'spend',
      'impressions',
      'cpm',
      'clicks',
      'ctr',
      'cpc',
      'actions',
    ].join(','),
    time_range: JSON.stringify({ since: date, until: date }),
    limit: '500',
  });

  return result.data;
}

/**
 * MetaInsightをAdPerformance用のデータに変換
 */
export function transformInsight(
  insight: MetaInsight,
  projectId: string,
  accountId: string
) {
  const actions = insight.actions ?? [];
  const findAction = (type: string) =>
    Number(actions.find((a) => a.action_type === type)?.value ?? '0');

  // MCV: offsite_conversion.fb_pixel_lead や link_click をベースに
  const mcv = findAction('offsite_conversion.fb_pixel_lead') || findAction('lead');
  const cv =
    findAction('offsite_conversion.fb_pixel_purchase') ||
    findAction('offsite_conversion.fb_pixel_complete_registration');
  const lpv = findAction('landing_page_view');

  const spend = Number(insight.spend);
  const clicks = Number(insight.clicks);

  return {
    projectId,
    platform: 'meta' as const,
    accountId,
    adName: insight.ad_name,
    date: insight.date_start,
    spend,
    impressions: Number(insight.impressions),
    cpm: Number(insight.cpm),
    clicks,
    ctr: Number(insight.ctr),
    cpc: Number(insight.cpc),
    mcv,
    mcvr: clicks > 0 ? mcv / clicks : 0,
    mcpa: mcv > 0 ? spend / mcv : 0,
    cv,
    cvr: clicks > 0 ? cv / clicks : 0,
    cpa: cv > 0 ? spend / cv : 0,
    lpv,
    lpvr: clicks > 0 ? lpv / clicks : 0,
    lpvc: lpv > 0 ? spend / lpv : 0,
    revenue: Math.round(spend * 1.2),
    grossProfit: Math.round(spend * 0.2),
    isStopped: false,
    rawAdId: insight.ad_id,
  };
}
