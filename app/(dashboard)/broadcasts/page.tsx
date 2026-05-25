import { Radio } from "lucide-react";
import { BroadcastForm } from "@/components/broadcasts/broadcast-form";
import { BroadcastList } from "@/components/broadcasts/broadcast-list";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { StaffSummary, TagSummary } from "@/lib/students/types";

export default async function BroadcastsPage() {
  const supabase = createClient();

  const [broadcastsResult, tagsResult, staffResult, surveysResult] = await Promise.all([
    supabase
      .from("broadcasts")
      .select(
        "id, title, body_jsonb, target_mode, status, estimated_recipients, sent_count, failed_count, scheduled_at, sent_at, created_at, staff_users!broadcasts_sent_by_fkey(id, name, email)"
      )
      .order("created_at", { ascending: false }),
    supabase.from("tags").select("id, name, color").order("name"),
    supabase
      .from("staff_users")
      .select("id, name, email, line_user_id")
      .eq("is_active", true)
      .order("name"),
    (supabase as any)
      .from("surveys")
      .select("id, title, admin_title, public_title")
      .eq("is_active", true)
      .eq("is_visible", true)
      .order("updated_at", { ascending: false })
  ]);

  const broadcasts = (broadcastsResult.data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    body_jsonb: row.body_jsonb,
    target_mode: row.target_mode,
    status: row.status,
    precheck_jsonb: row.precheck_jsonb ?? null,
    estimated_recipients: row.estimated_recipients,
    sent_count: row.sent_count,
    failed_count: row.failed_count,
    scheduled_at: row.scheduled_at,
    sent_at: row.sent_at,
    created_at: row.created_at,
    staff: row.staff_users
  }));
  const tags = (tagsResult.data ?? []) as TagSummary[];
  const staffUsers = (staffResult.data ?? []) as StaffSummary[];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const surveys = (surveysResult.data ?? []).map((row: any) => ({
    id: row.id,
    title: row.admin_title || row.public_title || row.title,
    url: `${baseUrl}/survey/${row.id}`
  }));
  const scheduledCount = broadcasts.filter((broadcast) => broadcast.status === "scheduled").length;
  const sentCount = broadcasts.reduce((sum, broadcast) => sum + broadcast.sent_count, 0);

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="accent">Step 5</Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">配信作成</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          タグで対象を絞り込み、通常テキストまたは横スクロールしないグリッド型Flexを配信します。
        </p>
      </div>

      {(broadcastsResult.error || tagsResult.error || staffResult.error || surveysResult.error) && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">配信データ取得エラー</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-destructive">
            <p>{broadcastsResult.error?.message}</p>
            <p>{tagsResult.error?.message}</p>
            <p>{staffResult.error?.message}</p>
            <p>{surveysResult.error?.message}</p>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="配信数" value={`${broadcasts.length}件`} />
        <SummaryCard label="予約中" value={`${scheduledCount}件`} />
        <SummaryCard label="今月送信記録" value={`${sentCount}通`} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.42fr_0.58fr]">
        <Card>
          <CardHeader>
            <CardTitle>新規配信</CardTitle>
          </CardHeader>
          <CardContent>
            <BroadcastForm surveys={surveys} tags={tags} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>配信一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <BroadcastList broadcasts={broadcasts} staffUsers={staffUsers} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Radio className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
