# Step 8 AI次アクション

学生ごとの最近の接触履歴、LINE履歴、アンケート回答、録音要約、自社リソースをもとに、AIが次アクションを提案します。

## 画面から使う

1. `/dashboard` を開きます。
2. 「AI提案を今すぐ更新」を押します。
3. 最大25名分の `students.ai_next_action` が更新されます。
4. 「今日対応すべき学生 TOP 10」に候補が表示されます。

## API

```txt
POST /api/ai/next-actions/run?limit=25
POST /api/ai/next-actions/run?studentId=学生ID
```

## Vercel Cron

`vercel.json` で毎朝7時（JST）に以下を実行します。

```txt
/api/ai/next-actions/run?limit=100
```

## 環境変数

```bash
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-haiku-4-5
CRON_SECRET=
AI_BATCH_LIMIT=100
```

`ANTHROPIC_API_KEY` が未設定の場合でも、動作確認用の仮提案を作ります。
