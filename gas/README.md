# GAS セットアップ手順

## 1. スプレッドシート作成
1. Google Driveで新規スプレッドシートを作成
2. 「拡張機能」→「Apps Script」を開く
3. `Code.gs` の内容を貼り付けて保存

## 2. 初期セットアップ
1. Apps Scriptエディタで `setupSheets` を実行
2. 3シート（案件マスタ・広告データ・設定）が自動作成される

## 3. 案件マスタにデータ入力
案件マスタに以下のように入力:

| project_id | project_name | slug | sort_order | platform | account_id | account_name | 目標CPA | 目標MCPA | 目標CPM | 目標CTR | 目標CPC | 目標MCVR | 日予算 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| proj-1 | DENNOVATE | dennovate | 0 | meta | 1679205389760560 | DENNOVATE | 15000 | 5000 | 3000 | 0.015 | 200 | 0.03 | 100000 |
| proj-1 | DENNOVATE | dennovate | 0 | meta | 639345955662224 | ad_dennovate4_3wl | 15000 | 5000 | 3000 | 0.015 | 200 | 0.03 | 100000 |

## 4. 設定シートにトークン入力
| key | value |
|---|---|
| META_ACCESS_TOKEN | EAAxxxx... |
| META_API_VERSION | v22.0 |

## 5. Webアプリとしてデプロイ
1. Apps Script → 「デプロイ」→「新しいデプロイ」
2. 種類: ウェブアプリ
3. アクセス: 「全員」
4. デプロイ → URLをコピー
5. そのURLを `.env.local` の `NEXT_PUBLIC_GAS_URL` に設定

## 6. 日次トリガー設定
1. Apps Script → 左メニュー「トリガー」
2. 「トリガーを追加」
3. 関数: `dailySyncTrigger`
4. イベント: 時間主導型 → 日付ベースのタイマー → 午前9時〜10時
