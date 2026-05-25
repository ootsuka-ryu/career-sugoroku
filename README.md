# 薬学生 LINE 採用 CRM

薬学生の新卒採用管理と LINE 公式アカウント運用を一体化する Next.js アプリです。

Step 1 では、Next.js 14 App Router、Tailwind CSS、shadcn/ui 互換 UI、Supabase Auth 接続、ログイン画面、管理画面レイアウトを実装しました。Step 2 では Supabase 用の初期スキーマ、RLS、Realtime 設定、seed、CSV サンプル、CSV インポート検証ロジックを追加しています。

## 技術スタック

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- shadcn/ui 互換コンポーネント
- Supabase Auth / PostgreSQL / Realtime
- Vercel デプロイ想定

## セットアップ

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local` に最低限以下を設定してください。

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Google OAuth を使う場合は Supabase Dashboard で Google provider を有効化し、リダイレクト URL に以下を追加します。

```txt
http://localhost:3000/auth/callback
https://your-vercel-domain.vercel.app/auth/callback
```

## Supabase 初期化

Supabase CLI を使う場合:

```bash
supabase db push
supabase db reset
```

SQL Editor から始める場合:

1. `supabase/migrations/202605180001_initial_schema.sql` を実行します。
2. `supabase/seed.sql` を実行します。
3. 実運用では `staff_users.id` を Supabase Auth の `auth.users.id` と一致させます。

最初の admin は通常ログイン画面からは作れません。Supabase SQL Editor または service role を使って `staff_users` に追加してください。

## 実装ファイル一覧

- `app/(auth)/login/page.tsx`: ログイン画面
- `app/auth/callback/route.ts`: Supabase OAuth コールバック
- `app/(dashboard)/layout.tsx`: 認証済み管理画面レイアウト
- `app/(dashboard)/dashboard/page.tsx`: 初期ダッシュボード
- `app/(dashboard)/students/import/page.tsx`: CSV インポート画面の入口
- `components/auth/login-form.tsx`: メール/パスワードと Google ログイン
- `components/layout/app-sidebar.tsx`: サイドナビゲーション
- `components/ui/*`: shadcn/ui 互換の基本 UI
- `lib/supabase/*`: Supabase Browser/Server/Middleware クライアントと DB 型
- `lib/csv/student-import.ts`: CSV 列マッピングと行検証ロジック
- `supabase/migrations/202605180001_initial_schema.sql`: 初期 DB スキーマ/RLS/Realtime
- `supabase/seed.sql`: seed データ
- `samples/students-sample.csv`: インポート用サンプル CSV
- `.env.example`: 環境変数テンプレート

## 動作確認

```bash
npm run typecheck
npm run build
```

Supabase の URL と anon key が未設定の場合、ログイン操作と認証済み画面へのアクセスは失敗します。`/login` の表示とビルドは環境変数なしでも確認できます。

## LINE Webhook

Step 4 で LINE Webhook と 1:1 チャット画面を追加しています。

ローカル開発中に LINE Developers から直接 Webhook を呼ぶには、ngrok などで localhost を HTTPS 公開し、LINE Developers の Webhook URL に以下を設定します。

```txt
https://your-public-url.example.com/api/line/webhook
```

Vercel にデプロイした後は以下です。

```txt
https://your-vercel-domain.vercel.app/api/line/webhook
```

`.env.local` には以下を設定します。

```bash
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
```

未設定または `your-...` のままでも、チャット画面からの送信は `mock_sent` としてDBに保存されます。本当にLINEへ送るには、LINE Developers の長期 Channel access token と Channel secret を設定して開発サーバーを再起動してください。

## Cloudflare Workers デプロイ

このプロジェクトは Cloudflare Workers + OpenNext でデプロイできます。

```bash
npm run build:cloudflare
npm run preview:cloudflare
npm run deploy:cloudflare
```

Cloudflare の環境変数には、少なくとも以下を設定してください。

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
CRON_SECRET=
```

Cloudflare にデプロイ後、LINE Developers の Webhook URL には以下を設定します。

```txt
https://<your-worker-domain>/api/line/webhook
```

ローカルで Cloudflare 形式の確認をする場合は `.dev.vars.example` を `.dev.vars` にコピーし、値を入れてから `npm run preview:cloudflare` を実行します。

## 次ステップ

Step 3 では以下を実装します。

- 学生一覧の TanStack Table
- フィルタ、ソート、タグ表示
- 学生詳細ページ
- 担当者/タグ/アクション履歴の表示と更新
- CSV インポート画面のアップロードと列マッピング UI
