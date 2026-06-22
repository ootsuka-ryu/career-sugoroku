import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  CalendarClock,
  ClipboardList,
  Mail,
  MessageSquareText,
  Mic,
  Phone,
  UserRound
} from "lucide-react";
import { StudentAssigneeSelect } from "@/components/students/student-assignee-select";
import {
  StudentActionForm,
  StudentFunnelFlagForm,
  StudentPageSaveButton,
  StudentProfileForm,
  StudentTagManager
} from "@/components/students/student-detail-forms";
import { StudentPhotoCard } from "@/components/students/student-photo-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { localizeSampleText, localizeStatus } from "@/lib/display/localize";
import { formatDate, formatDateTime } from "@/lib/format";
import { getStaffDisplayName, uniqueStaffByDisplayName } from "@/lib/staff/display";
import { createClient } from "@/lib/supabase/server";
import { getCandidateStageLabel, getMotivationRankLabel } from "@/lib/students/options";
import { normalizeStudentDetail } from "@/lib/students/normalize";
import {
  buildRecommendedChatDraft,
  buildRecommendedChatReason
} from "@/lib/students/recommended-chat";
import type {
  StaffSummary,
  StudentActionItem,
  StudentMessageItem,
  StudentRecordingItem,
  StudentSurveyResponseItem,
  TagSummary
} from "@/lib/students/types";

type EventParticipant = {
  event_id: string;
  student_id: string;
  status: string;
  memo: string | null;
  created_at: string;
  recruiting_events: {
    id: string;
    title: string;
    event_type: string;
    starts_at: string | null;
    location: string | null;
  } | null;
};

type TimelineItem = {
  id: string;
  at: string;
  label: string;
  title: string;
  body: string | null;
};

export default async function StudentDetailPage({
  params
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [
    studentResult,
    tagsResult,
    actionsResult,
    messagesResult,
    surveyResponsesResult,
    recordingsResult,
    eventParticipantsResult,
    staffUsersResult
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
      .eq("id", params.id)
      .maybeSingle(),
    supabase.from("tags").select("id, name, color").order("name"),
    supabase
      .from("student_actions")
      .select("id, action_type, title, body, executed_at, staff_users!student_actions_staff_id_fkey(id, name, email)")
      .eq("student_id", params.id)
      .order("executed_at", { ascending: false })
      .limit(50),
    supabase
      .from("messages")
      .select("id, direction, type, payload, sent_at, staff_users!messages_staff_id_fkey(id, name, email)")
      .eq("student_id", params.id)
      .order("sent_at", { ascending: false })
      .limit(50),
    supabase
      .from("survey_responses")
      .select("id, submitted_at, raw_answers_jsonb, surveys(title, survey_questions(id, label, order))")
      .eq("student_id", params.id)
      .order("submitted_at", { ascending: false })
      .limit(30),
    supabase
      .from("recordings")
      .select(
        "id, source, audio_url, duration_sec, transcript, ai_summary, ai_next_action, recorded_at"
      )
      .eq("student_id", params.id)
      .order("recorded_at", { ascending: false })
      .limit(30),
    supabase
      .from("event_participants")
      .select("event_id, student_id, status, memo, created_at, recruiting_events(id, title, event_type, starts_at, location)")
      .eq("student_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("staff_users")
      .select("id, name, email")
      .eq("is_active", true)
      .order("name")
  ]);

  if (!studentResult.data) notFound();

  const student = normalizeStudentDetail(studentResult.data);
  const allTags = (tagsResult.data ?? []) as TagSummary[];
  const actions = (actionsResult.data ?? []).map((row: any) => ({
    id: row.id,
    action_type: row.action_type,
    title: row.title,
    body: row.body,
    executed_at: row.executed_at,
    staff: row.staff_users
  })) as StudentActionItem[];
  const messages = (messagesResult.data ?? []).map((row: any) => ({
    id: row.id,
    direction: row.direction,
    type: row.type,
    payload: row.payload,
    sent_at: row.sent_at,
    staff: row.staff_users
  })) as StudentMessageItem[];
  const surveyResponses = (surveyResponsesResult.data ?? []).map((row: any) => ({
    id: row.id,
    submitted_at: row.submitted_at,
    raw_answers_jsonb: row.raw_answers_jsonb,
    survey: row.surveys
      ? {
          title: row.surveys.title,
          questions: (row.surveys.survey_questions ?? []).map((question: any) => ({
            id: question.id,
            label: question.label,
            order: question.order
          }))
        }
      : null
  })) as StudentSurveyResponseItem[];
  const recordings = (recordingsResult.data ?? []) as StudentRecordingItem[];
  const eventParticipants = (eventParticipantsResult.data ?? []) as EventParticipant[];
  const staffOptions = uniqueSelectableAssignees((staffUsersResult.data ?? []) as StaffSummary[]);
  const currentAssigneeId = student.assignees[0]?.id ?? null;
  const timeline = buildTimeline({
    actions,
    messages,
    surveyResponses,
    recordings,
    eventParticipants
  });
  const recommendedChatText = buildRecommendedChatDraft(student);
  const recommendedChatReason = buildRecommendedChatReason(student);
  const recommendedChatHref = buildRecommendedChatHref(
    student.id,
    recommendedChatText,
    recommendedChatReason
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Button asChild className="mb-4" size="sm" variant="ghost">
            <Link href="/students">
              <ArrowLeft className="mr-2 h-4 w-4" />
              学生一覧へ
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-normal">
              {localizeSampleText(student.real_name) ||
                localizeSampleText(student.display_name) ||
                "名前未登録"}
            </h1>
            <Badge variant="secondary">{localizeStatus(student.status)}</Badge>
            {getMotivationRankLabel(student.motivation_rank, student.motivation_level) !== "-" ? (
              <Badge variant="accent">
                確度 {getMotivationRankLabel(student.motivation_rank, student.motivation_level)}
              </Badge>
            ) : null}
            <Badge variant="outline">{getCandidateStageLabel(student.candidate_stage)}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {localizeSampleText(student.university) || "大学未登録"} / {student.grade || "学年未登録"} /{" "}
            {student.graduation_year ?? "-"}卒
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <StudentAssigneeSelect
            currentAssigneeId={currentAssigneeId}
            staffOptions={staffOptions}
            studentId={student.id}
          />
          {recommendedChatText ? (
            <Button asChild size="sm">
              <Link href={recommendedChatHref}>
                <MessageSquareText className="mr-2 h-4 w-4" />
                AIおススメチャット
              </Link>
            </Button>
          ) : (
            <Button disabled size="sm" variant="outline">
              <MessageSquareText className="mr-2 h-4 w-4" />
              AIおススメチャット
            </Button>
          )}
          <Button asChild size="sm">
            <Link href={`/chat?studentId=${student.id}`}>
              <MessageSquareText className="mr-2 h-4 w-4" />
              チャットへ
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/recordings?studentId=${student.id}`}>録音を追加</Link>
          </Button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard icon={CalendarClock} label="最終受信" value={formatDateTime(student.last_inbound_at)} />
        <InfoCard icon={MessageSquareText} label="最終送信" value={formatDateTime(student.last_outbound_at)} />
        <InfoCard icon={Phone} label="電話" value={student.phone || "-"} />
        <InfoCard icon={Mail} label="メール" value={student.email || "-"} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.7fr_0.3fr]">
        <Card>
          <CardHeader>
            <CardTitle>プロフィール編集</CardTitle>
          </CardHeader>
          <CardContent>
            <StudentProfileForm student={student} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>進捗チェック</CardTitle>
            </CardHeader>
            <CardContent>
              <StudentFunnelFlagForm student={student} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>顔写真</CardTitle>
            </CardHeader>
            <CardContent>
              <StudentPhotoCard
                photoPositionX={student.photo_position_x}
                photoPositionY={student.photo_position_y}
                photoScale={student.photo_scale}
                photoUrl={student.photo_url}
                studentId={student.id}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>タグ</CardTitle>
            </CardHeader>
            <CardContent>
              <StudentTagManager
                allTags={allTags}
                currentTags={student.tags}
                studentId={student.id}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                AI提案
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium">AI次アクション</p>
                <p className="mt-1 text-muted-foreground">
                  {localizeSampleText(student.ai_next_action) || "まだ提案はありません。"}
                </p>
                {recommendedChatText ? (
                  <Button asChild className="mt-3" size="sm">
                    <Link href={recommendedChatHref}>
                      <MessageSquareText className="mr-2 h-4 w-4" />
                      AIおススメチャット
                    </Link>
                  </Button>
                ) : (
                  <Button className="mt-3" disabled size="sm" variant="outline">
                    <MessageSquareText className="mr-2 h-4 w-4" />
                    AIおススメチャット
                  </Button>
                )}
              </div>
              <div>
                <p className="font-medium">手動次アクション</p>
                <p className="mt-1 text-muted-foreground">
                  {localizeSampleText(student.manual_next_action) || "未設定"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="flex justify-end">
        <StudentPageSaveButton studentId={student.id} />
      </div>

      <section className="grid gap-4 xl:grid-cols-[0.45fr_0.55fr]">
        <Card>
          <CardHeader>
            <CardTitle>実施済アクションを追加</CardTitle>
          </CardHeader>
          <CardContent>
            <StudentActionForm studentId={student.id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>時系列タイムライン</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[520px] overflow-y-auto pr-2">
            <Timeline
              emptyText="まだ履歴はありません。"
              items={timeline.slice(0, 40).map((item) => ({
                id: item.id,
                title: `[${item.label}] ${item.title}`,
                meta: formatDateTime(item.at),
                body: item.body
              }))}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>参加イベント一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <Timeline
              emptyText="参加イベントはまだありません。"
              items={eventParticipants.map((participant) => ({
                id: participant.event_id,
                title: participant.recruiting_events?.title ?? "イベント",
                meta: `${participant.status} / ${formatDateTime(participant.recruiting_events?.starts_at ?? participant.created_at)}`,
                body: [participant.recruiting_events?.location, participant.memo].filter(Boolean).join("\n")
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>チャット履歴</CardTitle>
          </CardHeader>
          <CardContent>
            <Timeline
              emptyText="チャット履歴はまだありません。"
              items={messages.map((message) => ({
                id: message.id,
                title: message.direction === "in" ? "学生から受信" : "スタッフが送信",
                meta: formatDateTime(message.sent_at),
                body: localizeSampleText(getMessageText(message.payload)) || ""
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              アンケート回答
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Timeline
              emptyText="アンケート回答はまだありません。"
              items={surveyResponses.map((response) => ({
                id: response.id,
                title: response.survey?.title ?? "アンケート",
                meta: formatDateTime(response.submitted_at),
                body: formatSurveyAnswer(response.raw_answers_jsonb, response.survey?.questions)
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              録音とAI要約
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Timeline
              emptyText="録音はまだありません。"
              items={recordings.map((recording) => ({
                id: recording.id,
                title: `${recording.source} / ${recording.duration_sec ?? "-"}秒`,
                meta: formatDate(recording.recorded_at),
                body: recording.ai_summary || recording.transcript || recording.audio_url
              }))}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value
}: {
  icon: typeof UserRound;
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
        <p className="truncate text-base font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Timeline({
  items,
  emptyText
}: {
  items: Array<{ id: string; title: string; meta: string; body: string | null }>;
  emptyText: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div className="border-l-2 border-primary/30 pl-3" key={item.id}>
          <p className="text-sm font-medium">{item.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
          {item.body ? (
            <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-sm text-muted-foreground">
              {item.body}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function getMessageText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  if ("text" in payload && typeof payload.text === "string") return payload.text;
  return JSON.stringify(payload);
}

function getActionTypeLabel(type: string) {
  const labels: Record<string, string> = {
    call: "電話",
    line: "LINE",
    zoom: "Zoom",
    email: "メール",
    event: "イベント",
    note: "メモ",
    ai: "AI"
  };
  return labels[type] ?? type;
}

function formatSurveyAnswer(
  value: unknown,
  questions: NonNullable<StudentSurveyResponseItem["survey"]>["questions"] = []
) {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  const questionMap = new Map((questions ?? []).map((question) => [question.id, question]));
  return Object.entries(record)
    .map(([key, item]) => {
      const question = questionMap.get(key);
      return {
        order: question?.order ?? 9999,
        key,
        label: localizeSampleText(question?.label) || question?.label || localizeSampleText(key) || key,
        value: formatSurveyAnswerValue(item)
      };
    })
    .sort((a, b) => a.order - b.order || a.key.localeCompare(b.key))
    .map((row) => `${row.label}: ${row.value}`)
    .join("\n");
}

function formatSurveyAnswerValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => localizeSampleText(String(item)) || String(item)).join("、");
  }
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return localizeSampleText(String(value)) || String(value);
}

function isSelectableAssignee(staff: StaffSummary) {
  const key = `${staff.name ?? ""} ${staff.email ?? ""}`.toLowerCase();
  return (
    key.includes("otsuka") ||
    key.includes("ohtsuka") ||
    key.includes("大塚") ||
    key.includes("nakano") ||
    key.includes("中野")
  );
}

function uniqueSelectableAssignees(staffUsers: StaffSummary[]) {
  return uniqueStaffByDisplayName(staffUsers.filter(isSelectableAssignee));
}

function buildRecommendedChatHref(studentId: string, draftText: string, reasonText = "") {
  return {
    pathname: "/chat",
    query: draftText
      ? { studentId, draft: draftText, reason: reasonText, tab: "text" }
      : { studentId }
  };
}

function buildTimeline({
  actions,
  messages,
  surveyResponses,
  recordings,
  eventParticipants
}: {
  actions: StudentActionItem[];
  messages: StudentMessageItem[];
  surveyResponses: StudentSurveyResponseItem[];
  recordings: StudentRecordingItem[];
  eventParticipants: EventParticipant[];
}) {
  const items: TimelineItem[] = [
    ...actions.map((action) => ({
      id: `action-${action.id}`,
      at: action.executed_at,
      label: getActionTypeLabel(action.action_type),
      title: localizeSampleText(action.title) || action.title,
      body: localizeSampleText(action.body) || action.body
    })),
    ...messages.map((message) => ({
      id: `message-${message.id}`,
      at: message.sent_at,
      label: "LINE",
      title: message.direction === "in" ? "学生から受信" : "スタッフが送信",
      body: localizeSampleText(getMessageText(message.payload)) || getMessageText(message.payload)
    })),
    ...surveyResponses.map((response) => ({
      id: `survey-${response.id}`,
      at: response.submitted_at,
      label: "アンケート",
      title: response.survey?.title ?? "アンケート回答",
      body: formatSurveyAnswer(response.raw_answers_jsonb, response.survey?.questions)
    })),
    ...recordings.map((recording) => ({
      id: `recording-${recording.id}`,
      at: recording.recorded_at,
      label: "録音/AI",
      title: recording.ai_next_action || "録音を保存",
      body: recording.ai_summary || recording.transcript || recording.audio_url
    })),
    ...eventParticipants.map((participant) => ({
      id: `event-${participant.event_id}`,
      at: participant.recruiting_events?.starts_at ?? participant.created_at,
      label: "イベント",
      title: participant.recruiting_events?.title ?? "イベント参加",
      body: [participant.status, participant.recruiting_events?.location, participant.memo]
        .filter(Boolean)
        .join("\n")
    }))
  ];

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
