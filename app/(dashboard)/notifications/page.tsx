import { Bell, CheckCheck, Mail, MessageCircle } from "lucide-react";
import { markAllNotificationsRead } from "@/app/(dashboard)/notifications/actions";
import { NotificationPreferenceForm } from "@/components/notifications/notification-preference-form";
import { NotificationReadButton } from "@/components/notifications/notification-read-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const notificationTypes = [
  {
    type: "survey_response",
    label: "アンケート回答",
    description: "学生がアンケートに回答したときに通知します。"
  },
  {
    type: "new_friend",
    label: "新規友だち追加",
    description: "LINE公式アカウントに新しい学生が追加されたときに通知します。"
  },
  {
    type: "chat_reply",
    label: "チャット返信",
    description: "学生からLINE返信が届いたときに通知します。"
  },
  {
    type: "urgent_ai_action",
    label: "AI至急対応",
    description: "AIが至急対応すべき学生を検知したときに通知します。"
  }
];

export default async function NotificationsPage() {
  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [notificationsResult, preferencesResult, staffResult] = await Promise.all([
    fetchNotifications(supabase, user?.id),
    supabase
      .from("notification_preferences")
      .select("type, via_line, via_email, is_enabled")
      .eq("staff_id", user?.id),
    supabase
      .from("staff_users")
      .select("email, line_user_id")
      .eq("id", user?.id)
      .maybeSingle()
  ]);

  const notifications = notificationsResult.data ?? [];
  const unreadCount = notifications.filter((item: any) => !item.read_at).length;
  const preferenceMap = new Map(
    (preferencesResult.data ?? []).map((preference: any) => [preference.type, preference])
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <Badge variant="accent">Step 10</Badge>
          <h1 className="mt-3 text-2xl font-semibold tracking-normal">通知</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            アンケート回答・新規友だち・チャット返信・AI至急対応を、スタッフごとにLINE/メールへ通知します。
          </p>
        </div>
        <form action={markAllNotificationsRead}>
          <Button disabled={unreadCount === 0} type="submit" variant="outline">
            <CheckCheck className="mr-2 h-4 w-4" />
            すべて既読
          </Button>
        </form>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          icon={Bell}
          label="未読通知"
          value={`${unreadCount}件`}
        />
        <SummaryCard
          icon={MessageCircle}
          label="スタッフLINE"
          value={staffResult.data?.line_user_id ? "連携済み" : "未設定"}
        />
        <SummaryCard
          icon={Mail}
          label="メール"
          value={staffResult.data?.email ?? user?.email ?? "-"}
        />
      </section>

      {(notificationsResult.error || preferencesResult.error || staffResult.error) ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">通知データ取得エラー</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-destructive">
            <p>{notificationsResult.error?.message}</p>
            <p>{preferencesResult.error?.message}</p>
            <p>{staffResult.error?.message}</p>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[0.62fr_0.38fr]">
        <Card>
          <CardHeader>
            <CardTitle>通知一覧</CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.length > 0 ? (
              <div className="space-y-3">
                {notifications.map((notification: any) => (
                  <div
                    className={
                      notification.read_at
                        ? "rounded-md border p-4"
                        : "rounded-md border-2 border-primary/40 bg-primary/5 p-4"
                    }
                    key={notification.id}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={notification.read_at ? "secondary" : "accent"}>
                            {getNotificationTypeLabel(notification.type)}
                          </Badge>
                          <Badge
                            className={
                              notification.priority === "urgent"
                                ? "bg-destructive text-destructive-foreground"
                                : notification.priority === "info"
                                  ? "bg-slate-500 text-white"
                                  : ""
                            }
                            variant="secondary"
                          >
                            {getPriorityLabel(notification.priority)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(notification.created_at)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {getSentViaLabel(notification.sent_via)}
                          </span>
                        </div>
                        <p className="mt-3 font-semibold">
                          {getPayloadText(notification.payload_jsonb, "title")}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                          {getPayloadText(notification.payload_jsonb, "body")}
                        </p>
                      </div>
                      {!notification.read_at ? (
                        <NotificationReadButton id={notification.id} />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">通知はまだありません。</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>通知設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notificationTypes.map((item) => {
              const preference = preferenceMap.get(item.type) as any;
              return (
                <NotificationPreferenceForm
                  description={item.description}
                  isEnabled={preference?.is_enabled ?? true}
                  key={item.type}
                  label={item.label}
                  type={item.type}
                  viaEmail={preference?.via_email ?? true}
                  viaLine={preference?.via_line ?? true}
                />
              );
            })}
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
  icon: typeof Bell;
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
        <p className="truncate text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

async function fetchNotifications(supabase: any, staffId?: string) {
  const withPriority = await supabase
    .from("notifications")
    .select("id, type, priority, payload_jsonb, sent_via, read_at, created_at")
    .eq("staff_id", staffId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!withPriority.error || !isMissingPriorityColumn(withPriority.error.message)) {
    return withPriority;
  }

  const withoutPriority = await supabase
    .from("notifications")
    .select("id, type, payload_jsonb, sent_via, read_at, created_at")
    .eq("staff_id", staffId)
    .order("created_at", { ascending: false })
    .limit(50);

  return {
    ...withoutPriority,
    data: (withoutPriority.data ?? []).map((notification: any) => ({
      ...notification,
      priority: "normal"
    }))
  };
}

function isMissingPriorityColumn(message: string | undefined) {
  return Boolean(message && /priority|column .* does not exist/i.test(message));
}

function getPayloadText(payload: unknown, key: "title" | "body") {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "-";
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" && value ? value : "-";
}

function getNotificationTypeLabel(type: string) {
  const labels: Record<string, string> = {
    survey_response: "アンケート回答",
    new_friend: "新規友だち",
    chat_reply: "チャット返信",
    urgent_ai_action: "AI至急対応",
    ai_urgent: "AI至急対応"
  };
  return labels[type] ?? type;
}

function getSentViaLabel(value: string) {
  const labels: Record<string, string> = {
    line: "LINE",
    email: "メール",
    both: "LINE/メール"
  };
  return labels[value] ?? value;
}

function getPriorityLabel(value: string | null) {
  const labels: Record<string, string> = {
    urgent: "至急",
    normal: "通常",
    info: "情報のみ"
  };
  return labels[value ?? "normal"] ?? "通常";
}
