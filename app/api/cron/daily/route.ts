import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { fetchAccountInsights, transformInsight } from '@/lib/api/meta';

/**
 * Vercel Cron Job — 日次データ同期
 * 毎朝9時JST (0:00 UTC) に実行
 */
export async function GET(request: Request) {
  // Cron secret検証
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase is not configured' },
      { status: 503 }
    );
  }

  try {
    // 昨日の日付（JST）
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstDate = new Date(now.getTime() + jstOffset);
    jstDate.setDate(jstDate.getDate() - 1);
    const yesterday = jstDate.toISOString().split('T')[0];

    // アクティブなアカウント一覧を取得
    const { data: accounts, error: accountsError } = await supabase
      .from('ad_accounts')
      .select('*, projects(id, name)')
      .eq('is_active', true)
      .eq('platform', 'meta');

    if (accountsError) {
      console.error('Failed to fetch accounts:', accountsError);
      return NextResponse.json(
        { error: 'Failed to fetch accounts' },
        { status: 500 }
      );
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        message: 'No active Meta accounts found',
        synced: 0,
      });
    }

    let totalSynced = 0;
    const errors: string[] = [];

    // アカウントごとにデータ取得
    for (const account of accounts) {
      try {
        const insights = await fetchAccountInsights(
          account.account_id,
          yesterday
        );

        const records = insights.map((insight) =>
          transformInsight(insight, account.project_id, account.account_id)
        );

        if (records.length > 0) {
          const { error: upsertError } = await supabase
            .from('ad_performance')
            .upsert(
              records.map((r) => ({
                project_id: r.projectId,
                platform: r.platform,
                account_id: r.accountId,
                ad_name: r.adName,
                date: r.date,
                spend: r.spend,
                impressions: r.impressions,
                cpm: r.cpm,
                clicks: r.clicks,
                ctr: r.ctr,
                cpc: r.cpc,
                mcv: r.mcv,
                mcvr: r.mcvr,
                mcpa: r.mcpa,
                cv: r.cv,
                cvr: r.cvr,
                cpa: r.cpa,
                lpv: r.lpv,
                lpvr: r.lpvr,
                lpvc: r.lpvc,
                revenue: r.revenue,
                gross_profit: r.grossProfit,
                is_stopped: r.isStopped,
                raw_ad_id: r.rawAdId,
              })),
              { onConflict: 'platform,account_id,ad_name,date' }
            );

          if (upsertError) {
            errors.push(
              `Account ${account.account_name}: ${upsertError.message}`
            );
          } else {
            totalSynced += records.length;
          }
        }

        // Rate limit対応: アカウント間に1秒間隔
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Account ${account.account_name}: ${msg}`);
        console.error(`Error syncing ${account.account_name}:`, err);
      }
    }

    return NextResponse.json({
      message: 'Daily sync completed',
      date: yesterday,
      totalSynced,
      accountsProcessed: accounts.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('Cron job error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
