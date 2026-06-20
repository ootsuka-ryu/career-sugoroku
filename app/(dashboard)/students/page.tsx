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

const STUDENTS_SELECT = `
  *,
  student_tags(tags(id, name, color)),
  student_assignees(staff_users!student_assignees_staff_id_fkey(id, name, email))
`;
const RELATED_FETCH_CHUNK_SIZE = 200;
const DEFAULT_GRADUATION_YEAR = 2028;
const STUDENT_PAGE_SIZE = 100;

export default async function StudentsPage({
  searchParams
}: {
  searchParams?: { graduationYear?: string; page?: string; q?: string };
}) {
  const supabase = createClient();
  const selectedGraduationYear = Number(searchParams?.graduationYear);
  const graduationYearFilter = Number.isFinite(selectedGraduationYear)
    ? selectedGraduationYear
    : DEFAULT_GRADUATION_YEAR;
  const selectedPage = Number(searchParams?.page);
  const currentPage = Number.isFinite(selectedPage) && selectedPage > 0 ? Math.floor(selectedPage) : 1;

  const [studentsResult, tagsResult, staffResult] = await Promise.all([
    fetchStudentsPage(supabase, graduationYearFilter, currentPage),
    supabase.from("tags").select("id, name, color").order("name"),
    supabase
      .from("staff_users")
      .select("id, name, email")
      .eq("is_active", true)
      .order("name")
  ]);

  const students = (studentsResult.data ?? []).map(normalizeStudentListItem);
  const studentIds = students.map((student) => student.id);
  const [eventParticipantsResult, messagesResult, recordingsResult] =
    studentIds.length === 0
      ? [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null }
        ]
      : await Promise.all([
          fetchRowsForStudentChunks<StudentEventSummary>(studentIds, (ids) =>
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
              )
              .in("student_id", ids)
          ),
          fetchRowsForStudentChunks<StudentMessageSearchSummary>(studentIds, (ids) =>
            (supabase as any)
              .from("messages")
              .select("student_id, payload, sent_at")
              .in("student_id", ids)
              .order("sent_at", { ascending: false })
              .limit(400)
          ),
          fetchRowsForStudentChunks<StudentRecordingSearchSummary>(studentIds, (ids) =>
            (supabase as any)
              .from("recordings")
              .select("student_id, transcript, ai_summary, ai_next_action, recorded_at")
              .in("student_id", ids)
              .order("recorded_at", { ascending: false })
              .limit(250)
          )
        ]);

  const scopedStudents = students;
  const totalStudents = studentsResult.count ?? scopedStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalStudents / STUDENT_PAGE_SIZE));
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

      {(studentsResult.error ||
        tagsResult.error ||
        staffResult.error ||
        messagesResult.error ||
        recordingsResult.error ||
        (!hasOptionalEventError && eventParticipantsResult.error)) && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">データ取得エラー</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-destructive">
            <p>{getErrorMessage(studentsResult.error)}</p>
            <p>{getErrorMessage(tagsResult.error)}</p>
            <p>{getErrorMessage(staffResult.error)}</p>
            <p>{getErrorMessage(messagesResult.error)}</p>
            <p>{getErrorMessage(recordingsResult.error)}</p>
            <p>{!hasOptionalEventError ? getErrorMessage(eventParticipantsResult.error) : null}</p>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          description={`${graduationYearFilter}卒または卒年未登録の学生`}
          label="学生数"
          value={`${totalStudents}名`}
        />
        <SummaryCard
          description="専願、併願、A、B または旧志望度4以上"
          label="ゴダイへの確度"
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
      <StudentsPager
        currentPage={currentPage}
        graduationYear={graduationYearFilter}
        query={searchParams?.q}
        totalPages={totalPages}
        totalStudents={totalStudents}
      />
    </div>
  );
}

async function fetchStudentsPage(
  supabase: ReturnType<typeof createClient>,
  graduationYear: number,
  page: number
) {
  const from = (page - 1) * STUDENT_PAGE_SIZE;
  const to = from + STUDENT_PAGE_SIZE - 1;
  const query = supabase
    .from("students")
    .select(STUDENTS_SELECT, { count: "exact" })
    .or(`graduation_year.is.null,graduation_year.eq.${graduationYear}`)
    .order("updated_at", { ascending: false })
    .range(from, to);

  const { data, error, count } = await query;

  return { data: data ?? [], error, count };
}

function StudentsPager({
  currentPage,
  graduationYear,
  query,
  totalPages,
  totalStudents
}: {
  currentPage: number;
  graduationYear: number;
  query?: string;
  totalPages: number;
  totalStudents: number;
}) {
  if (totalPages <= 1) return null;

  const pages = buildPageNumbers(currentPage, totalPages);

  return (
    <nav className="flex flex-col gap-3 rounded-md border bg-card px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
      <p className="text-muted-foreground">
        1ページ100名ずつ表示中 / 全{totalStudents}名
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild={currentPage > 1} disabled={currentPage <= 1} size="sm" variant="outline">
          {currentPage > 1 ? (
            <Link href={buildStudentsPageHref(currentPage - 1, graduationYear, query) as any}>前へ</Link>
          ) : (
            <span>前へ</span>
          )}
        </Button>
        {pages.map((page, index) =>
          page === "ellipsis" ? (
            <span className="px-2 text-muted-foreground" key={`ellipsis-${index}`}>
              ...
            </span>
          ) : (
            <Button
              asChild={page !== currentPage}
              key={page}
              size="sm"
              variant={page === currentPage ? "default" : "outline"}
            >
              {page === currentPage ? (
                <span>{page}</span>
              ) : (
                <Link href={buildStudentsPageHref(page, graduationYear, query) as any}>{page}</Link>
              )}
            </Button>
          )
        )}
        <Button
          asChild={currentPage < totalPages}
          disabled={currentPage >= totalPages}
          size="sm"
          variant="outline"
        >
          {currentPage < totalPages ? (
            <Link href={buildStudentsPageHref(currentPage + 1, graduationYear, query) as any}>次へ</Link>
          ) : (
            <span>次へ</span>
          )}
        </Button>
      </div>
    </nav>
  );
}

function buildStudentsPageHref(page: number, graduationYear: number, query?: string) {
  const params = new URLSearchParams();
  params.set("graduationYear", String(graduationYear));
  if (page > 1) params.set("page", String(page));
  const trimmed = query?.trim();
  if (trimmed) params.set("q", trimmed);
  return `/students?${params.toString()}`;
}

function buildPageNumbers(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const candidates = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const sorted = Array.from(candidates)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
  const pages: Array<number | "ellipsis"> = [];

  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];
    if (previous && page - previous > 1) pages.push("ellipsis");
    pages.push(page);
  });

  return pages;
}

async function fetchRowsForStudentChunks<T>(
  studentIds: string[],
  buildQuery: (ids: string[]) => PromiseLike<{ data: T[] | null; error: unknown }>
) {
  const rows: T[] = [];

  for (let index = 0; index < studentIds.length; index += RELATED_FETCH_CHUNK_SIZE) {
    const ids = studentIds.slice(index, index + RELATED_FETCH_CHUNK_SIZE);
    const { data, error } = await buildQuery(ids);

    if (error) {
      return { data: rows, error };
    }

    rows.push(...(data ?? []));
  }

  return { data: rows, error: null };
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

function getErrorMessage(error: unknown) {
  if (!error) return null;
  if (typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }
  return String(error);
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
