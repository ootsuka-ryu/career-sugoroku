"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import {
  createRecruitingEvent,
  type EventActionState
} from "@/app/(dashboard)/events/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function EventCreateForm({ surveys }: { surveys: SurveyOption[] }) {
  const [state, formAction] = useFormState(createRecruitingEvent, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <Input name="title" placeholder="イベント名" required />
      <select
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
      <Input name="starts_at" type="datetime-local" />
      <Input name="location" placeholder="場所 / Zoom URL" />
      <select
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        name="survey_id"
      >
        <option value="">紐づけアンケートなし</option>
        {surveys.map((survey) => (
          <option key={survey.id} value={survey.id}>
            {survey.admin_title ?? survey.title}
          </option>
        ))}
      </select>
      <Textarea name="description" placeholder="イベント内容・注意事項" />
      <Textarea name="next_action" placeholder="次回案内・フォロー内容" />

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
