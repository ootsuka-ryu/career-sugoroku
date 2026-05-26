import { MessageSquareWarning } from "lucide-react";
import { FollowUpBoard } from "@/components/follow-ups/follow-up-board";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { uniqueStaffByDisplayName } from "@/lib/staff/display";
import { createClient } from "@/lib/supabase/server";

export default async function FollowUpsPage() {
  const supabase = createClient();
  const [studentsResult, staffResult] = await Promise.all([
    supabase
      .from("students")
      .select(
        `
        id,
        display_name,
        real_name,
        university,
        grade,
        motivation_level,
        last_inbound_at,
        last_outbound_at,
        ai_next_action,
        line_user_id,
        student_assignees(staff_users!student_assignees_staff_id_fkey(id, name, email))
      `
      )
      .not("last_outbound_at", "is", null)
      .order("last_outbound_at", { ascending: false }),
    supabase
      .from("staff_users")
      .select("id, name, email")
      .eq("is_active", true)
      .order("name")
  ]);

  const students = ((studentsResult.data ?? []) as any[])
    .filter((student) => {
      if (!student.last_outbound_at) return false;
      if (!student.last_inbound_at) return true;
      return new Date(student.last_outbound_at) > new Date(student.last_inbound_at);
    })
    .map((student) => ({
      id: student.id,
      display_name: student.display_name,
      real_name: student.real_name,
      university: student.university,
      grade: student.grade,
      motivation_level: student.motivation_level,
      last_inbound_at: student.last_inbound_at,
      last_outbound_at: student.last_outbound_at,
      ai_next_action: student.ai_next_action,
      line_user_id: student.line_user_id,
      assignees: (student.student_assignees ?? [])
        .map((row: any) => row.staff_users)
        .filter(Boolean)
    }));

  const staffUsers = uniqueStaffByDisplayName((staffResult.data ?? []) as Array<{
    id: string;
    name: string;
    email: string;
  }>);

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="accent">Step 9</Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">
          返信なしピックアップ
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          アプリ送信、またはチャット画面で記録した公式LINE直接送信のあと、返信がない学生を確認します。
        </p>
      </div>

      {(studentsResult.error || staffResult.error) && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <MessageSquareWarning className="h-5 w-5" />
              返信なしデータ取得エラー
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-destructive">
            <p>{studentsResult.error?.message}</p>
            <p>{staffResult.error?.message}</p>
          </CardContent>
        </Card>
      )}

      <FollowUpBoard staffUsers={staffUsers} students={students} />
    </div>
  );
}
