"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import {
  createRecruitingEvent,
  type EventActionState
} from "@/app/(dashboard)/events/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SurveyOption = {
  id: string;
  title: string | null;
  admin_title: string | null;
};

const initialState: EventActionState = {
  ok: false,
  message: ""
};

const DEFAULT_SIGNUP_MESSAGE =
  "{name}さん、{event}へのお申し込みありがとうございます。\n日時: {date}\n場所: {location}\n当日お会いできるのを楽しみにしています。";

const DEFAULT_REMINDER_MESSAGE =
  "{name}さん、明日は{event}です。\n日時: {date}\n場所: {location}\nお気をつけてお越しください。";

export function EventCreateForm({ surveys }: { surveys: SurveyOption[] }) {
  const [state, formAction] = useFormState(createRecruitingEvent, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="event-title">イベント名</Label>
          <Input id="event-title" name="title" placeholder="イベント名" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="event-type">種別</Label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            id="event-type"
            name="event_type"
            defaultValue="説明会"
          >
            <option>説明会</option>
            <option>店舗見学</option>
            <option>座談会</option>
            <option>インターンシップ</option>
            <option>薬剤師インタビュー</option>
            <option>選考会</option>
            <option>その他</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="event-starts-at">日時</Label>
          <Input id="event-starts-at" name="starts_at" type="datetime-local" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="event-location">場所 / Zoom URL</Label>
          <Input id="event-location" name="location" placeholder="場所 / Zoom URL" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="event-survey">紐づけアンケート</Label>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          id="event-survey"
          name="survey_id"
        >
          <option value="">紐づけアンケートなし</option>
          {surveys.map((survey) => (
            <option key={survey.id} value={survey.id}>
              {survey.admin_title ?? survey.title}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="event-description">イベント内容・注意事項</Label>
          <Textarea
            className="max-h-32 resize-y"
            id="event-description"
            name="description"
            placeholder="イベント内容・注意事項"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="event-next-action">次回案内・フォロー内容</Label>
          <Textarea
            className="max-h-32 resize-y"
            id="event-next-action"
            name="next_action"
            placeholder="次回案内・フォロー内容"
          />
        </div>
      </div>

      <div className="rounded-md border bg-muted/30 p-3">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input name="signup_message_enabled" type="checkbox" />
          申込時に自動メッセージを送信
        </label>
        <Textarea
          className="mt-2 max-h-36 resize-y"
          name="signup_message_template"
          rows={4}
          defaultValue={DEFAULT_SIGNUP_MESSAGE}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          使える差し込み: {"{name}"} {"{event}"} {"{date}"} {"{location}"}
        </p>
      </div>

      <div className="rounded-md border bg-muted/30 p-3">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input name="reminder_enabled" type="checkbox" />
          開催3日以上前の申込者へ前日リマインドを予約
        </label>
        <Textarea
          className="mt-2 max-h-36 resize-y"
          name="reminder_message_template"
          rows={4}
          defaultValue={DEFAULT_REMINDER_MESSAGE}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          前日の10:00に送信予約します。キャンセル・欠席に変更すると予約は止まります。
        </p>
      </div>

      {state.message ? (
        <p
          className={
            state.ok
              ? "rounded-md bg-accent/10 px-3 py-2 text-sm text-accent"
              : "rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
        >
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      <Plus className="mr-2 h-4 w-4" />
      {pending ? "作成中..." : "作成"}
    </Button>
  );
}
