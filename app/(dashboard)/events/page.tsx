import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, MapPin, Users, UserX } from "lucide-react";
import {
  cancelEventParticipant,
  updateEventParticipant,
  updateEventSurveyLink
} from "@/app/(dashboard)/events/actions";
import { EventCreateForm } from "@/components/events/event-create-form";
import { EventParticipantForm } from "@/components/events/event-participant-form";
import { EventMessageSettingsForm } from "@/components/events/event-message-settings-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { localizeSampleText } from "@/lib/display/localize";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const EVENT_SELECT_WITH_SETTINGS = [
  "id",
  "title",
  "event_type",
  "starts_at",
  "location",
  "description",
  "survey_id",
  "next_action",
  "created_at",
  "signup_message_enabled",
  "signup_message_template",
  "reminder_enabled",
  "reminder_message_template"
].join(", ");

const EVENT_SELECT_FALLBACK = [
  "id",
  "title",
  "event_type",
  "starts_at",
  "location",
  "description",
  "survey_id",
  "next_action",
  "created_at"
].join(", ");

export default async function EventsPage() {
  const supabase = createClient() as any;
  const [eventsBundle, surveysResult, studentsResult, participantsResult] = await Promise.all([
    fetchEvents(supabase),
    supabase.from("surveys").select("id, title, admin_title").order("updated_at", { ascending: false }),
    supabase
      .from("students")
      .select("id, real_name, display_name, kana, graduation_year, university")
      .order("updated_at", { ascending: false })
      .limit(3000),
    supabase
      .from("event_participants")
      .select("event_id, student_id, status, memo, created_at, students(id, real_name, display_name, graduation_year, university)")
  ]);

  const events = eventsBundle.events;
  const surveys = surveysResult.data ?? [];
  const students = studentsResult.data ?? [];
  const studentOptions = students.map((student: any) => ({
    id: student.id,
    name:
      localizeSampleText(student.real_name) ??
      localizeSampleText(student.display_name) ??
      "名前未登録",
    kana: localizeSampleText(student.kana) ?? student.kana ?? null,
    university: localizeSampleText(student.university) ?? student.university ?? null,
    graduationYear: student.graduation_year
  }));
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
            const countByStatus = countParticipants(eventParticipants);
            return (
              <Card key={event.id} className="border-2">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-xl">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    {event.title}
                    <Badge variant="secondary">{event.event_type}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-4">
                  <div className="grid gap-3 md:grid-cols-4">
                    <InfoCard
                      icon={<CalendarDays className="h-5 w-5 text-primary" />}
                      label="日時"
                      value={formatDateTime(event.starts_at)}
                    />
                    <InfoCard
                      icon={<MapPin className="h-5 w-5 text-primary" />}
                      label="場所"
                      value={event.location ?? "-"}
                    />
                    <InfoCard
                      icon={<Users className="h-5 w-5 text-primary" />}
                      label="参加・申込"
                      value={`${countByStatus.signup}名`}
                    />
                    <InfoCard
                      icon={<UserX className="h-5 w-5 text-destructive" />}
                      label="欠席・キャンセル"
                      value={`${countByStatus.inactive}名`}
                    />
                  </div>

                  {event.description ? <p className="text-sm leading-6">{event.description}</p> : null}

                  <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3 text-sm md:flex-row md:items-center md:justify-between">
                    <div>
                      <span className="font-medium">紐づけアンケート: </span>
                      {event.survey_id ? (
                        <Link
                          className="text-primary underline-offset-2 hover:underline"
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

                  <EventMessageSettingsForm
                    event={event}
                    settingsAvailable={eventsBundle.messageSettingsAvailable}
                  />

                  {eventParticipants.length > 0 ? (
                    <div className="overflow-hidden rounded-md border">
                      <div className="grid grid-cols-[1.3fr_7rem_1.1fr_8rem_1.2fr_12rem] bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
                        <span>氏名</span>
                        <span>卒業年度</span>
                        <span>大学名</span>
                        <span>状態</span>
                        <span>メモ</span>
                        <span>操作</span>
                      </div>
                      {eventParticipants.map((participant: any) => {
                        const student = normalizeJoinedStudent(participant.students);
                        return (
                          <form
                            action={updateEventParticipant}
                            className="grid grid-cols-[1.3fr_7rem_1.1fr_8rem_1.2fr_12rem] items-center gap-2 border-t px-3 py-2 text-sm"
                            key={`${participant.event_id}-${participant.student_id}`}
                          >
                            <input name="event_id" type="hidden" value={participant.event_id} />
                            <input name="student_id" type="hidden" value={participant.student_id} />
                            <Link
                              className="font-semibold text-primary underline-offset-2 hover:underline"
                              href={`/students/${participant.student_id}`}
                            >
                              {localizeSampleText(student?.real_name) ??
                                localizeSampleText(student?.display_name) ??
                                "名前未登録"}
                            </Link>
                            <span>{formatGraduationYear(student?.graduation_year)}</span>
                            <span>{localizeSampleText(student?.university) ?? "-"}</span>
                            <select
                              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                              defaultValue={participant.status}
                              name="status"
                            >
                              {PARTICIPANT_STATUSES.map((status) => (
                                <option key={status}>{status}</option>
                              ))}
                            </select>
                            <Input defaultValue={participant.memo ?? ""} name="memo" placeholder="メモ" />
                            <div className="flex gap-2">
                              <Button size="sm" type="submit" variant="outline">
                                保存
                              </Button>
                              <CancelParticipantButton />
                            </div>
                          </form>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                      参加者はまだ登録されていません。
                    </p>
                  )}

                  <EventParticipantForm
                    eventId={event.id}
                    statuses={PARTICIPANT_STATUSES}
                    students={studentOptions}
                  />
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

async function fetchEvents(supabase: any) {
  const result = await supabase
    .from("recruiting_events")
    .select(EVENT_SELECT_WITH_SETTINGS)
    .order("starts_at", { ascending: false, nullsFirst: false });

  if (!result.error) {
    return {
      events: result.data ?? [],
      messageSettingsAvailable: true
    };
  }

  const fallback = await supabase
    .from("recruiting_events")
    .select(EVENT_SELECT_FALLBACK)
    .order("starts_at", { ascending: false, nullsFirst: false });

  return {
    events: (fallback.data ?? []).map((event: any) => ({
      ...event,
      signup_message_enabled: false,
      signup_message_template: null,
      reminder_enabled: false,
      reminder_message_template: null
    })),
    messageSettingsAvailable: false
  };
}

function InfoCard({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border bg-background p-3 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function CancelParticipantButton() {
  return (
    <button
      formAction={cancelEventParticipant}
      className="inline-flex h-8 items-center justify-center rounded-md border border-destructive/40 px-3 text-sm font-medium text-destructive hover:bg-destructive/10"
      name="cancel"
      type="submit"
    >
      キャンセル
    </button>
  );
}

const PARTICIPANT_STATUSES = ["申込", "参加", "欠席", "キャンセル", "次回案内済み"];

function countParticipants(participants: any[]) {
  const signup = participants.filter((item) => ["申込", "参加"].includes(item.status)).length;
  const inactive = participants.filter((item) => ["欠席", "キャンセル"].includes(item.status)).length;
  return { signup, inactive };
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
