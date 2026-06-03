import Link from "next/link";
import { CalendarDays } from "lucide-react";
import {
  addEventParticipant,
  updateEventSurveyLink
} from "@/app/(dashboard)/events/actions";
import { EventCreateForm } from "@/components/events/event-create-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { localizeSampleText } from "@/lib/display/localize";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function EventsPage() {
  const supabase = createClient() as any;
  const [eventsResult, surveysResult, studentsResult, participantsResult] = await Promise.all([
    supabase
      .from("recruiting_events")
      .select("id, title, event_type, starts_at, location, description, survey_id, next_action, created_at")
      .order("starts_at", { ascending: false, nullsFirst: false }),
    supabase.from("surveys").select("id, title, admin_title").order("updated_at", { ascending: false }),
    supabase
      .from("students")
      .select("id, real_name, display_name, graduation_year, university")
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase
      .from("event_participants")
      .select("event_id, student_id, status, memo, created_at, students(id, real_name, display_name, graduation_year, university)")
  ]);

  const events = eventsResult.data ?? [];
  const surveys = surveysResult.data ?? [];
  const students = studentsResult.data ?? [];
  const participants = participantsResult.data ?? [];
  const surveyById = new Map(surveys.map((survey: any) => [survey.id, survey]));

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="accent">イベント</Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">イベント管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          説明会、店舗見学、座談会の参加者・欠席者・アンケート・次回案内を管理します。
        </p>
      </div>

      <section className="grid gap-4 xl:grid-cols-[0.42fr_0.58fr]">
        <Card>
          <CardHeader>
            <CardTitle>イベントを作成</CardTitle>
          </CardHeader>
          <CardContent>
            <EventCreateForm surveys={surveys} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          {events.length > 0 ? events.map((event: any) => {
            const eventParticipants = participants.filter((item: any) => item.event_id === event.id);
            const attended = eventParticipants.filter((item: any) => item.status === "参加").length;
            const absent = eventParticipants.filter((item: any) => item.status === "欠席").length;
            return (
              <Card key={event.id}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    {event.title}
                    <Badge variant="secondary">{event.event_type}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 text-sm md:grid-cols-4">
                    <p>日時: {formatDateTime(event.starts_at)}</p>
                    <p>場所: {event.location ?? "-"}</p>
                    <p>参加: {attended}名</p>
                    <p>欠席: {absent}名</p>
                  </div>
                  {event.description ? <p className="text-sm text-muted-foreground">{event.description}</p> : null}
                  <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3 text-sm md:flex-row md:items-center md:justify-between">
                    <div>
                      <span className="font-medium">紐づけアンケート: </span>
                      {event.survey_id ? (
                        <Link
                          className="text-blue-700 underline-offset-2 hover:underline"
                          href={`/surveys?focus=${event.survey_id}`}
                        >
                          {formatSurveyName(surveyById.get(event.survey_id))}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">なし</span>
                      )}
                    </div>
                    <form action={updateEventSurveyLink} className="flex flex-col gap-2 md:flex-row md:items-center">
                      <input name="event_id" type="hidden" value={event.id} />
                      <select
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                        defaultValue={event.survey_id ?? ""}
                        name="survey_id"
                      >
                        <option value="">紐づけなし</option>
                        {surveys.map((survey: any) => (
                          <option key={survey.id} value={survey.id}>
                            {formatSurveyName(survey)}
                          </option>
                        ))}
                      </select>
                      <Button size="sm" type="submit" variant="outline">
                        手動で紐づけ
                      </Button>
                    </form>
                  </div>

                  {eventParticipants.length > 0 ? (
                    <div className="overflow-hidden rounded-md border">
                      <div className="grid grid-cols-[1.2fr_7rem_1.1fr_7rem_1fr] bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
                        <span>氏名</span>
                        <span>卒業年度</span>
                        <span>大学名</span>
                        <span>状態</span>
                        <span>メモ</span>
                      </div>
                      {eventParticipants.map((participant: any) => {
                        const student = normalizeJoinedStudent(participant.students);
                        return (
                          <div
                            className="grid grid-cols-[1.2fr_7rem_1.1fr_7rem_1fr] border-t px-3 py-2 text-sm"
                            key={`${participant.event_id}-${participant.student_id}`}
                          >
                            <span className="font-medium">
                              {localizeSampleText(student?.real_name) ??
                                localizeSampleText(student?.display_name) ??
                                "名前未登録"}
                            </span>
                            <span>{formatGraduationYear(student?.graduation_year)}</span>
                            <span>{localizeSampleText(student?.university) ?? "-"}</span>
                            <span>{participant.status}</span>
                            <span className="text-muted-foreground">{participant.memo || "-"}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                      参加者はまだ登録されていません。
                    </p>
                  )}

                  <form action={addEventParticipant} className="grid gap-2 md:grid-cols-[1fr_140px_1fr_auto]">
                    <input name="event_id" type="hidden" value={event.id} />
                    <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="student_id">
                      {students.map((student: any) => (
                        <option key={student.id} value={student.id}>
                          {localizeSampleText(student.real_name) ?? localizeSampleText(student.display_name) ?? "名前未登録"} / {formatGraduationYear(student.graduation_year)} / {localizeSampleText(student.university) ?? "-"}
                        </option>
                      ))}
                    </select>
                    <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="status" defaultValue="参加">
                      <option>申込</option>
                      <option>参加</option>
                      <option>欠席</option>
                      <option>キャンセル</option>
                      <option>次回案内済み</option>
                    </select>
                    <Input name="memo" placeholder="メモ" />
                    <Button type="submit" variant="outline">参加者追加</Button>
                  </form>
                </CardContent>
              </Card>
            );
          }) : (
            <Card>
              <CardContent className="py-8 text-sm text-muted-foreground">
                イベントはまだありません。
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}

function formatSurveyName(survey: any) {
  if (!survey) return "アンケート";
  return survey.admin_title ?? survey.title ?? "アンケート";
}

function formatGraduationYear(value: number | string | null | undefined) {
  if (!value) return "-";
  const text = String(value);
  return text.endsWith("卒") ? text : `${text}卒`;
}

function normalizeJoinedStudent(value: any) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
