import type { ReactNode } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Database,
  LineChart,
  Mail,
  MessageCircle,
  Server,
  ShieldCheck,
  Users
} from "lucide-react";
import { addStaffUser, deactivateStaffUser } from "@/app/(dashboard)/settings/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";

const lineMonthlyLimit = 5000;

const envItems = [
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    label: "Supabase URL",
    required: true
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    label: "Supabase anon key",
    required: true
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    label: "Supabase service role key",
    required: true
  },
  {
    key: "LINE_CHANNEL_ACCESS_TOKEN",
    label: "LINE Channel access token",
    required: true
  },
  {
    key: "LINE_CHANNEL_SECRET",
    label: "LINE Channel secret",
    required: true
  },
  {
    key: "ANTHROPIC_API_KEY",
    label: "Claude API key",
    required: false
  },
  {
    key: "GROQ_API_KEY",
    label: "Groq Whisper API key",
    required: false
  },
  {
    key: "OPENAI_API_KEY",
    label: "OpenAI fallback key",
    required: false
  },
  {
    key: "RESEND_API_KEY",
    label: "Resend API key",
    required: false
  },
  {
    key: "ZOOM_CLIENT_ID",
    label: "Zoom Client ID",
    required: false
  },
  {
    key: "ZOOM_CLIENT_SECRET",
    label: "Zoom Client Secret",
    required: false
  }
];

export default async function SettingsPage() {
  const supabase = createClient() as any;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    staffResult,
    resourcesResult,
    broadcastsResult,
    messagesResult,
    studentsResult,
    surveysResult,
    recordingsResult
  ] = await Promise.all([
    supabase
      .from("staff_users")
      .select("id, email, name, role, line_user_id, is_active")
      .order("created_at"),
    supabase
      .from("company_resources")
      .select("id, title, kind, is_ai_context, updated_at")
      .order("updated_at", { ascending: false }),
    supabase
      .from("broadcasts")
      .select("id, title, status, estimated_recipients, sent_count, failed_count, scheduled_at, sent_at")
      .gte("created_at", monthStart.toISOString()),
    supabase
      .from("messages")
      .select("id, status, sent_at")
      .eq("direction", "out")
      .gte("sent_at", monthStart.toISOString()),
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("surveys").select("id", { count: "exact", head: true }),
    supabase.from("recordings").select("id, duration_sec", { count: "exact" })
  ]);

  const staffUsers = staffResult.data ?? [];
  const visibleStaffUsers = staffUsers.filter(
    (staff: any) => String(staff.name ?? "").toLowerCase() !== "admin"
  );
  const resources = resourcesResult.data ?? [];
  const broadcasts = broadcastsResult.data ?? [];
  const messages = messagesResult.data ?? [];
  const recordings = recordingsResult.data ?? [];
  const broadcastSentCount = broadcasts.reduce(
    (sum: number, item: any) => sum + Number(item.sent_count ?? 0),
    0
  );
  const chatSentCount = messages.filter((item: any) =>
    ["sent", "mock_sent", "external_line_official"].includes(item.status)
  ).length;
  const totalLineUsage = broadcastSentCount + chatSentCount;
  const scheduledEstimate = broadcasts
    .filter((item: any) => item.status === "scheduled")
    .reduce((sum: number, item: any) => sum + Number(item.estimated_recipients ?? 0), 0);
  const lineUsageRate = Math.min(100, Math.round((totalLineUsage / lineMonthlyLimit) * 100));
  const totalRecordingHours =
    recordings.reduce((sum: number, item: any) => sum + Number(item.duration_sec ?? 0), 0) /
    3600;

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="accent">Final QA</Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">設定・運用確認</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          LINE通数、月額コスト、外部サービス設定、スタッフ連携、自社AI資料の状態を確認します。
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Users}
          label="学生数"
          value={`${studentsResult.count ?? 0}名`}
        />
        <SummaryCard
          icon={MessageCircle}
          label="今月LINE通数"
          value={`${totalLineUsage} / ${lineMonthlyLimit}`}
        />
        <SummaryCard
          icon={Bot}
          label="AI資料"
          value={`${resources.filter((resource: any) => resource.is_ai_context).length}件`}
        />
        <SummaryCard
          icon={Database}
          label="アンケート"
          value={`${surveysResult.count ?? 0}件`}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.58fr_0.42fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-primary" />
              LINE通数ダッシュボード
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>今月の使用量</span>
                <span className="font-medium">{lineUsageRate}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-secondary">
                <div
                  className={
                    lineUsageRate >= 90
                      ? "h-3 bg-destructive"
                      : lineUsageRate >= 75
                        ? "h-3 bg-amber-500"
                        : "h-3 bg-primary"
                  }
                  style={{ width: `${lineUsageRate}%` }}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Metric label="一斉配信" value={`${broadcastSentCount}通`} />
              <Metric label="個別チャット" value={`${chatSentCount}通`} />
              <Metric label="予約見込み" value={`${scheduledEstimate}通`} />
            </div>

            {totalLineUsage + scheduledEstimate >= lineMonthlyLimit ? (
              <AlertBox tone="danger">
                今月のLINE通数が上限を超える可能性があります。次回配信を翌月に回すか、対象タグを絞ってください。
              </AlertBox>
            ) : totalLineUsage + scheduledEstimate >= lineMonthlyLimit * 0.8 ? (
              <AlertBox tone="warning">
                LINE通数が上限に近づいています。配信前に対象人数を確認してください。
              </AlertBox>
            ) : (
              <AlertBox tone="ok">LINE通数はまだ余裕があります。</AlertBox>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleDollarSign className="h-5 w-5 text-primary" />
              月額コスト目安
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border">
              <CostRow label="LINEライトプラン" value="5,000円" />
              <CostRow label="Supabase" value="0円" />
              <CostRow label="Vercel" value="0円" />
              <CostRow label="Cloudflare R2" value="0円目安" />
              <CostRow label="Claude Haiku" value="300〜800円目安" />
              <CostRow
                label="Groq Whisper"
                value={`${Math.max(30, Math.round(totalRecordingHours * 6))}円目安`}
              />
              <CostRow label="Resend" value="0円目安" />
              <CostRow strong label="合計目安" value="約5,400〜6,000円/月" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.5fr_0.5fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              外部サービス設定
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {envItems.map((item) => (
                <EnvStatus
                  key={item.key}
                  label={item.label}
                  required={item.required}
                  value={process.env[item.key]}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              運用チェック
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ChecklistItem
              done={staffUsers.some((staff: any) => staff.line_user_id)}
              text="スタッフのLINE通知先が登録されている"
            />
            <ChecklistItem
              done={resources.some((resource: any) => resource.is_ai_context)}
              text="AIに渡す自社資料が登録されている"
            />
            <ChecklistItem
              done={Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_CHANNEL_SECRET)}
              text="LINE Messaging API のキーが設定されている"
            />
            <ChecklistItem
              done={Boolean(process.env.NEXT_PUBLIC_APP_URL)}
              text="公開URL用の NEXT_PUBLIC_APP_URL が設定されている"
            />
            <ChecklistItem
              done={Boolean(process.env.RESEND_API_KEY)}
              text="メール通知用の Resend API key が設定されている"
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.45fr_0.55fr]">
        <Card>
          <CardHeader>
            <CardTitle>スタッフ連携</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addStaffUser} className="mb-4 grid gap-2 rounded-md border bg-secondary/40 p-3">
              <Input name="name" placeholder="スタッフ名" required />
              <Input name="email" placeholder="メールアドレス" type="email" required />
              <Input name="line_user_id" placeholder="スタッフ通知用LINE ID（任意）" />
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="role" defaultValue="staff">
                <option value="staff">一般スタッフ</option>
                <option value="admin">管理者</option>
              </select>
              <Button type="submit">スタッフ追加</Button>
            </form>
            <div className="space-y-3">
              {visibleStaffUsers.map((staff: any) => (
                <div className="rounded-md border p-3" key={staff.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{staff.name}</p>
                      <p className="text-sm text-muted-foreground">{staff.email}</p>
                    </div>
                    <Badge variant={staff.role === "admin" ? "accent" : "secondary"}>
                      {staff.role === "admin" ? "管理者" : "スタッフ"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    LINE通知: {staff.line_user_id ? "設定済み" : "未設定"}
                  </p>
                  {staff.is_active ? (
                    <form action={deactivateStaffUser} className="mt-3">
                      <input name="id" type="hidden" value={staff.id} />
                      <Button size="sm" type="submit" variant="outline">削除（無効化）</Button>
                    </form>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">無効化済み</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI自社資料</CardTitle>
          </CardHeader>
          <CardContent>
            {resources.length > 0 ? (
              <div className="space-y-3">
                {resources.map((resource: any) => (
                  <div className="rounded-md border p-3" key={resource.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{resource.title}</p>
                      <Badge variant={resource.is_ai_context ? "accent" : "secondary"}>
                        {resource.is_ai_context ? "AI参照中" : "保管のみ"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{getResourceKind(resource.kind)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                自社資料はまだ登録されていません。
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-secondary/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function AlertBox({
  tone,
  children
}: {
  tone: "ok" | "warning" | "danger";
  children: ReactNode;
}) {
  const className =
    tone === "danger"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : tone === "warning"
        ? "border-amber-300 bg-amber-50 text-amber-800"
        : "border-accent/40 bg-accent/10 text-accent";

  return (
    <div className={`flex gap-2 rounded-md border px-3 py-2 text-sm ${className}`}>
      {tone === "ok" ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <AlertTriangle className="mt-0.5 h-4 w-4" />}
      <p>{children}</p>
    </div>
  );
}

function CostRow({
  label,
  value,
  strong = false
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={
        strong
          ? "flex justify-between border-b bg-secondary px-3 py-2 text-sm font-semibold last:border-b-0"
          : "flex justify-between border-b px-3 py-2 text-sm last:border-b-0"
      }
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function EnvStatus({
  label,
  value,
  required
}: {
  label: string;
  value?: string;
  required: boolean;
}) {
  const configured = Boolean(value && !value.startsWith("your-"));
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{required ? "必須" : "任意"}</p>
      </div>
      <Badge
        className={!configured && required ? "border-destructive text-destructive" : undefined}
        variant={configured ? "accent" : required ? "outline" : "secondary"}
      >
        {configured ? "設定済み" : "未設定"}
      </Badge>
    </div>
  );
}

function ChecklistItem({ done, text }: { done: boolean; text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border px-3 py-2 text-sm">
      {done ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 text-accent" />
      ) : (
        <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
      )}
      <p>{text}</p>
    </div>
  );
}

function getResourceKind(kind: string) {
  const labels: Record<string, string> = {
    approach_policy: "採用方針",
    talk_script: "トークスクリプト",
    event_info: "イベント情報"
  };
  return labels[kind] ?? kind;
}
