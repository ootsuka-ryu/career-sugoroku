import { TaskBoard, type GeneratedTaskView, type ManualTaskView } from "@/components/tasks/task-board";
import { Badge } from "@/components/ui/badge";
import { localizeSampleText } from "@/lib/display/localize";
import { daysSince, formatDateTime } from "@/lib/format";
import { getStaffDisplayName } from "@/lib/staff/display";
import { createClient } from "@/lib/supabase/server";
import { getMotivationRankLabel } from "@/lib/students/options";

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
  const manualTasks = (manualTasksResult.data ?? []).map((task: any) => ({
    id: task.id,
    title: task.title,
    dueDate: task.due_date,
    studentName: task.students?.real_name ?? task.students?.display_name ?? "学生未指定",
    staffId: task.staff_users?.id ?? null
  })) as ManualTaskView[];
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

      <TaskBoard
        generatedTasks={generatedTasks}
        manualTasks={manualTasks}
        staffUsers={staffUsers}
      />
    </div>
  );
}

function buildGeneratedTasks(students: any[]): GeneratedTaskView[] {
  const tasks: GeneratedTaskView[] = [];
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
    const assigneeIds = (student.student_assignees ?? [])
      .map((relation: any) => relation.staff_users?.id)
      .filter(Boolean) as string[];

    if (student.last_outbound_at && !inboundAfterOutbound && outboundDays !== null && outboundDays >= 3) {
      tasks.push({
        key: `reply-wait-${student.id}-${student.last_outbound_at}`,
        title: `返信待ち${outboundDays}日です`,
        reason: `最後の送信: ${formatDateTime(student.last_outbound_at)}`,
        studentId: student.id,
        studentName,
        university,
        priority: outboundDays >= 14 ? 95 : outboundDays >= 7 ? 85 : 70,
        assigneeIds
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
        priority: 90,
        assigneeIds
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
        priority: 80,
        assigneeIds
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
