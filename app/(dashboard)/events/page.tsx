import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { addEventParticipant } from "@/app/(dashboard)/events/actions";
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
    supabase.from("students").select("id, real_name, display_name, university").order("updated_at", { ascending: false }).limit(200),
    supabase.from("event_participants").select("event_id, student_id, status")
  ]);

  const events = eventsResult.data ?? [];
  const surveys = surveysResult.data ?? [];
  const students = studentsResult.data ?? [];
  const participants = participantsResult.data ?? [];

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
                  {event.survey_id ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/surveys?focus=${event.survey_id}`}>紐づけアンケートを見る</Link>
                    </Button>
                  ) : null}
                  <form action={addEventParticipant} className="grid gap-2 md:grid-cols-[1fr_140px_1fr_auto]">
                    <input name="event_id" type="hidden" value={event.id} />
                    <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="student_id">
                      {students.map((student: any) => (
                        <option key={student.id} value={student.id}>
                          {localizeSampleText(student.real_name) ?? localizeSampleText(student.display_name) ?? "名前未登録"} / {localizeSampleText(student.university) ?? "-"}
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
