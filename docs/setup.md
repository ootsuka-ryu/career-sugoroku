# セットアップ手順

## 1. 依存関係

```bash
npm install
```

## 2. 環境変数

`.env.example` を `.env.local` にコピーし、Supabase の値を設定します。

```bash
cp .env.example .env.local
```

## 3. 開発サーバー

```bash
npm run dev
```

## 4. Supabase Auth

メール/パスワード認証を有効化します。Google OAuth を使う場合は Supabase Dashboard で Google provider を有効化し、`/auth/callback` をリダイレクト URL に登録します。

## 5. Database

Supabase CLI を使う場合は、以下で初期スキーマと seed を反映します。

```bash
supabase db push
supabase db reset
```

SQL Editor で手動実行する場合は、以下の順で実行します。

1. `supabase/migrations/202605180001_initial_schema.sql`
2. `supabase/seed.sql`

実運用では、Supabase Auth で作成されたユーザー ID を `staff_users.id` に登録してください。
