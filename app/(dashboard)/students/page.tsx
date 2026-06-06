import Link from "next/link";
import { Download, Plus, Users } from "lucide-react";
import {
  StudentListTable,
  type StudentEventSummary,
  type StudentMessageSearchSummary,
  type StudentRecordingSearchSummary
} from "@/components/students/student-list-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { uniqueStaffByDisplayName } from "@/lib/staff/display";
import { createClient } from "@/lib/supabase/server";
import { isHighMotivationRank } from "@/lib/students/options";
import { normalizeStudentListItem } from "@/lib/students/normalize";
import type { StaffSummary, TagSummary } from "@/lib/students/types";

export default async function StudentsPage({
  searchParams
}: {
  searchParams?: { graduationYear?: string };
}) {
  const supabase = createClient();

  const [
    studentsResult,
    tagsResult,
    staffResult,
    eventParticipantsResult,
    messagesResult,
    recordingsResult
  ] = await Promise.all([
    supabase
      .from("students")
      .select(
        `
        *,
        student_tags(tags(id, name, color)),
        student_assignees(staff_users!student_assignees_staff_id_fkey(id, name, email))
      `
      )
      .order("updated_at", { ascending: false }),
    supabase.from("tags").select("id, name, color").order("name"),
    supabase
      .from("staff_users")
      .select("id, name, email")
      .eq("is_active", true)
      .order("name"),
    (supabase as any)
      .from("event_participants")
      .select(
        `
        student_id,
        status,
        memo,
        created_at,
        recruiting_events(id, title, event_type, starts_at, location)
      `
      ),
    (supabase as any)
      .from("messages")
      .select("student_id, payload, sent_at")
      .order("sent_at", { ascending: false })
      .limit(5000),
    (supabase as any)
      .from("recordings")
      .select("student_id, transcript, ai_summary, ai_next_action, recorded_at")
      .order("recorded_at", { ascending: false })
      .limit(3000)
  ]);

  const students = (studentsResult.data ?? []).map(normalizeStudentListItem);
  const selectedGraduationYear = Number(searchParams?.graduationYear);
  const scopedStudents = Number.isFinite(selectedGraduationYear)
    ? students.filter(
        (student) =>
          !student.graduation_year || student.graduation_year === selectedGraduationYear
      )
    : students;
  const tags = (tagsResult.data ?? []) as TagSummary[];
  const staffUsers = uniqueStaffByDisplayName((staffResult.data ?? []) as StaffSummary[]);
  const hasOptionalEventError = isMissingOptionalEventTable(eventParticipantsResult.error);
  const eventParticipants = (hasOptionalEventError ? [] : eventParticipantsResult.data ?? []).map((row: any) => ({
    student_id: row.student_id,
    status: row.status,
    memo: row.memo,
    created_at: row.created_at,
    event: Array.isArray(row.recruiting_events)
      ? row.recruiting_events[0] ?? null
      : row.recruiting_events
  })) as StudentEventSummary[];
  const messageSearchItems = (messagesResult.data ?? []).map((row: any) => ({
    student_id: row.student_id,
    text: extractMessageText(row.payload),
    sent_at: row.sent_at
  })) as StudentMessageSearchSummary[];
  const recordingSearchItems = (recordingsResult.data ?? []).map((row: any) => ({
    student_id: row.student_id,
    transcript: row.transcript,
    ai_summary: row.ai_summary,
    ai_next_action: row.ai_next_action,
    recorded_at: row.recorded_at
  })) as StudentRecordingSearchSummary[];
  const waitingReplyCount = scopedStudents.filter((student) => {
    if (!student.last_outbound_at) return false;
    if (!student.last_inbound_at) return true;
    return new Date(student.last_outbound_at) > new Date(student.last_inbound_at);
  }).length;
  const highMotivationCount = scopedStudents.filter(
    (student) =>
      isHighMotivationRank(student.motivation_rank) ||
      (!student.motivation_rank && (student.motivation_level ?? 0) >= 4)
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Badge variant="accent">学生管理</Badge>
          <h1 className="mt-3 text-2xl font-semibold tracking-normal">学生一覧</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            氏名、大学、タグ、担当者、志望度、返信なし条件で学生を絞り込めます。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/students/import">
              <Download className="mr-2 h-4 w-4" />
              CSVインポート
            </Link>
          </Button>
          <Button asChild>
            <Link href="/students/new">
              <Plus className="mr-2 h-4 w-4" />
              新規学生
            </Link>
          </Button>
        </div>
      </div>

      {(studentsResult.error || tagsResult.error || staffResult.error || (!hasOptionalEventError && eventParticipantsResult.error)) && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">データ取得エラー</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-destructive">
            <p>{studentsResult.error?.message}</p>
            <p>{tagsResult.error?.message}</p>
            <p>{staffResult.error?.message}</p>
            <p>{!hasOptionalEventError ? eventParticipantsResult.error?.message : null}</p>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          description="現在Supabaseに登録されている学生"
          label="学生数"
          value={`${scopedStudents.length}名`}
        />
        <SummaryCard
          description="専願、併願、A、B または旧志望度4以上"
          label="高志望度"
          value={`${highMotivationCount}名`}
        />
        <SummaryCard
          description="こちらの送信後に返信がない学生"
          label="返信待ち"
          value={`${waitingReplyCount}名`}
        />
      </section>

      <StudentListTable
        eventParticipants={eventParticipants}
        messageSearchItems={messageSearchItems}
        recordingSearchItems={recordingSearchItems}
        staffUsers={staffUsers}
        students={scopedStudents}
        tags={tags}
      />
    </div>
  );
}

function extractMessageText(payload: unknown) {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;
  const directText = record.text ?? record.body ?? record.message;
  if (typeof directText === "string") return directText;
  try {
    return JSON.stringify(payload);
  } catch {
    return "";
  }
}

function isMissingOptionalEventTable(error: unknown) {
  const message = typeof error === "object" && error && "message" in error
    ? String((error as { message?: unknown }).message ?? "")
    : "";
  return /event_participants|recruiting_events|schema cache/i.test(message);
}

function SummaryCard({
  label,
  value,
  description
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Users className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
