import Link from "next/link";
import { CheckCircle2, Clock, UserRound } from "lucide-react";
import { completeGeneratedTask, completeManualTask } from "@/app/(dashboard)/tasks/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { localizeSampleText } from "@/lib/display/localize";
import { daysSince, formatDateTime } from "@/lib/format";
import { getStaffDisplayName } from "@/lib/staff/display";
import { createClient } from "@/lib/supabase/server";
import { getMotivationRankLabel } from "@/lib/students/options";

type GeneratedTask = {
  key: string;
  title: string;
  reason: string;
  studentId: string;
  studentName: string;
  university: string;
  priority: number;
};

export default async function TasksPage() {
  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [studentsResult, dismissalsResult, manualTasksResult, staffResult] = await Promise.all([
    supabase
      .from("students")
      .select("id, real_name, display_name, university, motivation_level, last_inbound_at, last_outbound_at, ai_next_action, manual_next_action, updated_at, student_assignees(staff_users!student_assignees_staff_id_fkey(id, name, email))")
      .order("updated_at", { ascending: false })
      .limit(200),
    user
      ? supabase.from("task_dismissals").select("task_key").eq("staff_id", user.id)
      : Promise.resolve({ data: [] }),
    supabase
      .from("staff_tasks")
      .select("id, title, reason, due_date, completed_at, student_id, staff_users!staff_tasks_staff_id_fkey(id, name, email), students(id, real_name, display_name, university)")
      .is("completed_at", null)
      .order("due_date", { ascending: true }),
    supabase.from("staff_users").select("id, name, email").eq("is_active", true).order("name")
  ]);

  const dismissed = new Set((dismissalsResult.data ?? []).map((item: any) => item.task_key));
  const generatedTasks = buildGeneratedTasks(studentsResult.data ?? []).filter(
    (task) => !dismissed.has(task.key)
  );
  const manualTasks = manualTasksResult.data ?? [];
  const staffUsers = uniqueVisibleStaff(staffResult.data ?? []);

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="accent">今日やること</Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">今日やることリスト</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          返信待ち、面談後フォロー、高志望度の未連絡を自動で並べます。完了したらチェックで消えます。
        </p>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.55fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              自動ピックアップ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {generatedTasks.length > 0 ? (
              generatedTasks.map((task) => (
                <div className="rounded-md border bg-card p-4" key={task.key}>
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          className={task.priority >= 90 ? "bg-destructive text-destructive-foreground" : ""}
                          variant="secondary"
                        >
                          優先度 {task.priority}
                        </Badge>
                        <Link className="font-medium text-primary hover:underline" href={`/students/${task.studentId}`}>
                          {task.studentName}
                        </Link>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{task.university}</p>
                      <p className="mt-2 text-sm">{task.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{task.reason}</p>
                    </div>
                    <form action={completeGeneratedTask}>
                      <input name="task_key" type="hidden" value={task.key} />
                      <Button size="sm" type="submit" variant="outline">
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        完了
                      </Button>
                    </form>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">今日の自動タスクはありません。</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-primary" />
              スタッフ別タスク
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {staffUsers.map((staff: any) => {
              const tasks = manualTasks.filter((task: any) =>
                staff.ids.includes(task.staff_users?.id)
              );
              return (
                <div key={staff.displayName} className="rounded-md border p-3">
                  <p className="font-medium">{staff.displayName}</p>
                  <p className="text-xs text-muted-foreground">{tasks.length}件の未完了タスク</p>
                  <div className="mt-3 space-y-2">
                    {tasks.length > 0 ? tasks.map((task: any) => (
                      <div key={task.id} className="rounded-md bg-secondary/70 p-2 text-sm">
                        <p className="font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.students?.real_name ?? task.students?.display_name ?? "学生未指定"} / 期限 {task.due_date ?? "-"}
                        </p>
                        <form action={completeManualTask} className="mt-2">
                          <input name="task_id" type="hidden" value={task.id} />
                          <Button size="sm" type="submit" variant="outline">完了</Button>
                        </form>
                      </div>
                    )) : <p className="text-xs text-muted-foreground">未完了タスクはありません。</p>}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function buildGeneratedTasks(students: any[]): GeneratedTask[] {
  const tasks: GeneratedTask[] = [];
  for (const student of students) {
    const studentName =
      localizeSampleText(student.real_name) ||
      localizeSampleText(student.display_name) ||
      "名前未登録";
    const university = localizeSampleText(student.university) || "大学未登録";
    const outboundDays = daysSince(student.last_outbound_at);
    const inboundAfterOutbound =
      student.last_inbound_at &&
      student.last_outbound_at &&
      new Date(student.last_inbound_at) > new Date(student.last_outbound_at);

    if (student.last_outbound_at && !inboundAfterOutbound && outboundDays !== null && outboundDays >= 3) {
      tasks.push({
        key: `reply-wait-${student.id}-${student.last_outbound_at}`,
        title: `返信待ち${outboundDays}日です`,
        reason: `最後の送信: ${formatDateTime(student.last_outbound_at)}`,
        studentId: student.id,
        studentName,
        university,
        priority: outboundDays >= 14 ? 95 : outboundDays >= 7 ? 85 : 70
      });
    }

    const highMotivation = Number(student.motivation_level ?? 0) >= 4;
    if (highMotivation && (!student.last_outbound_at || (outboundDays ?? 0) >= 7)) {
      tasks.push({
        key: `high-motivation-${student.id}-${student.updated_at}`,
        title: "志望度が高い学生に連絡してください",
        reason: `志望度: ${getMotivationRankLabel(null, student.motivation_level)}`,
        studentId: student.id,
        studentName,
        university,
        priority: 90
      });
    }

    if (student.manual_next_action) {
      tasks.push({
        key: `manual-next-${student.id}-${student.updated_at}`,
        title: localizeSampleText(student.manual_next_action) || student.manual_next_action,
        reason: "手動次アクションに登録されています。",
        studentId: student.id,
        studentName,
        university,
        priority: 80
      });
    }
  }

  return tasks.sort((a, b) => b.priority - a.priority).slice(0, 50);
}

function uniqueVisibleStaff(staffUsers: any[]) {
  const map = new Map<string, { ids: string[]; displayName: string }>();

  for (const staff of staffUsers) {
    if (String(staff.name ?? "").trim().toLowerCase() === "admin") continue;

    const displayName = getStaffDisplayName(staff);
    const current = map.get(displayName);
    if (current) {
      current.ids.push(staff.id);
    } else {
      map.set(displayName, {
        ids: [staff.id],
        displayName
      });
    }
  }

  return Array.from(map.values());
}
