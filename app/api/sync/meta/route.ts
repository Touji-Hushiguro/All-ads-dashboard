import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { fetchAccountInsights, transformInsight } from '@/lib/api/meta';

export async function POST(request: Request) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { projectId, accountId, date } = body as {
      projectId: string;
      accountId: string;
      date: string;
    };

    if (!projectId || !accountId || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, accountId, date' },
        { status: 400 }
      );
    }

    // Meta APIからインサイトデータ取得
    const insights = await fetchAccountInsights(accountId, date);

    // AdPerformance形式に変換
    const records = insights.map((insight) =>
      transformInsight(insight, projectId, accountId)
    );

    if (records.length === 0) {
      return NextResponse.json({
        message: 'No data returned from Meta API',
        synced: 0,
      });
    }

    // Supabaseにupsert
    const { error } = await supabase
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

    if (error) {
      console.error('Supabase upsert error:', error);
      return NextResponse.json(
        { error: 'Failed to save data to database', detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Sync completed',
      synced: records.length,
    });
  } catch (err) {
    console.error('Meta sync error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
