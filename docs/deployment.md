# デプロイ手順

## Vercel

1. Git リポジトリを Vercel に接続します。
2. `.env.example` の値を Vercel Project Settings の Environment Variables に登録します。
3. Build command は `npm run build` を使います。

## Supabase

Supabase CLI でマイグレーションを適用します。

```bash
supabase db push
```

初回 admin の作成は SQL Editor または service role 経由で行います。`staff_users.id` には Auth ユーザーの UUID を入れてください。

## 外部サービス

- LINE Developers: Messaging API チャネル、Channel access token、Channel secret
- Zoom App Marketplace: Server-to-Server OAuth
- Anthropic: Claude API key
- Groq: Whisper API 用 key
- Resend: メール送信用 API key
- Cloudflare R2: 録音ファイル保存用 bucket
