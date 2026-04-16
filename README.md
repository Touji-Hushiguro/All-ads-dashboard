# Ad Dashboard

社内広告運用チーム向けのデイリー広告配信データ管理Webアプリ。Chrome型タブUIで案件・媒体を横断管理。

## 構成

```
Next.js (Vercel)
    ↓ fetch
Google Apps Script (Web App)
    ↓ read/write
Google Sheets (案件マスタ / 広告データ / 設定)
    ↑ sync
Meta Graph API
```

- **Next.js 16 + React 19 + Tailwind CSS**
- **Google Apps Script** — バックエンドAPI + Meta同期ロジック
- **Google Sheets** — データストア（案件・広告・設定）
- **NextAuth (Auth.js v5)** — Googleログイン（ドメイン制限）

## 機能

- Chrome風タブで案件切り替え（DnD並び替え・追加・削除）
- 媒体サブタブ（Meta / Google / TikTok / 全媒体合計）
- KPIサマリーカード 14指標（広告費/IMP/Clicks/CPM/CTR/CPC/MCV/MCVR/MCPA/CV/CVR/CPA/売上/粗利）
- KPI目標値比較ハイライト（緑=目標達成、赤=超過、黄=要注意）
- 広告パフォーマンステーブル（全カラムソート・カラム表示切替）
- アラートバナー（CPA/MCPA/CTR条件判定）
- 複数トークンプール対応（アカウント別トークンを設定シートに複数登録可能）
- 1分毎の自動Meta同期 + 30秒毎のダッシュボード自動更新

## ローカル開発

```bash
npm install
npm run dev
```

`.env.local`:
```
NEXT_PUBLIC_GAS_URL=https://script.google.com/macros/s/xxx/exec
```

認証はローカル開発中は自動でスキップされます（`AUTH_SECRET` や `AUTH_GOOGLE_ID` が未設定の場合）。

## デプロイ（Vercel）

1. Vercelに GitHub連携でプロジェクト作成
2. Root Directory: `ad-dashboard`
3. Environment Variables:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_GAS_URL` | GASウェブアプリURL |
| `AUTH_SECRET` | `openssl rand -base64 33` で生成 |
| `AUTH_GOOGLE_ID` | Google Cloud OAuth クライアントID |
| `AUTH_GOOGLE_SECRET` | Google Cloud OAuth シークレット |
| `AUTH_URL` | デプロイ先URL（例: https://xxx.vercel.app） |
| `ALLOWED_EMAIL_DOMAINS` | `3well.co.jp`（複数ならカンマ区切り） |

4. Google Cloud Console の OAuth クライアント設定:
   - 承認済みリダイレクトURI: `https://xxx.vercel.app/api/auth/callback/google`

## GAS セットアップ

`gas/README.md` 参照。

## ディレクトリ構成

```
ad-dashboard/
├── app/
│   ├── (dashboard)/        # 認証必要なダッシュボードエリア
│   │   ├── layout.tsx      # タブレイアウト
│   │   ├── [project]/page.tsx
│   │   └── settings/page.tsx
│   ├── api/auth/           # NextAuth
│   └── signin/page.tsx     # ログイン画面
├── components/             # UIコンポーネント
├── lib/
│   ├── api/                # GAS/Meta APIクライアント
│   ├── hooks/              # React hooks
│   └── ...
├── gas/                    # Google Apps Script ソース
│   ├── Code.gs
│   ├── appsscript.json
│   └── README.md
├── types/index.ts
├── auth.ts                 # NextAuth設定
└── middleware.ts           # ルート保護
```
