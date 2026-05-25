import { Bot } from "lucide-react";
import { AutoReplyAdmin } from "@/components/auto-replies/auto-reply-admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function AutoRepliesPage() {
  const supabase = createClient() as any;
  const { data, error } = await supabase
    .from("auto_replies")
    .select("id, trigger_keyword, match_type, reply_payload_jsonb, is_active, updated_at")
    .order("updated_at", { ascending: false });

  const replies = (data ?? []).map((reply: any) => ({
    id: reply.id,
    trigger_keyword: reply.trigger_keyword,
    match_type: reply.match_type,
    reply_text:
      typeof reply.reply_payload_jsonb?.text === "string"
        ? reply.reply_payload_jsonb.text
        : "",
    is_active: reply.is_active,
    updated_at: reply.updated_at
  }));

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="accent">Step 5</Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">自動応答</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          完全一致、部分一致、正規表現でキーワードを判定し、学生からのLINEに自動返信します。
        </p>
      </div>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Bot className="h-5 w-5" />
              自動応答取得エラー
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-destructive">
            {error.message}
          </CardContent>
        </Card>
      ) : null}

      <AutoReplyAdmin replies={replies} />
    </div>
  );
}
