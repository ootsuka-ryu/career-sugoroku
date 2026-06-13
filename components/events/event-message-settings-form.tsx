"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  updateEventMessageSettings,
  type EventActionState
} from "@/app/(dashboard)/events/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type EventMessageSettingsFormProps = {
  event: {
    id: string;
    signup_message_enabled?: boolean | null;
    signup_message_template?: string | null;
    reminder_enabled?: boolean | null;
    reminder_message_template?: string | null;
  };
  settingsAvailable: boolean;
};

const initialState: EventActionState = {
  ok: false,
  message: ""
};

export function EventMessageSettingsForm({
  event,
  settingsAvailable
}: EventMessageSettingsFormProps) {
  const [state, formAction] = useFormState(updateEventMessageSettings, initialState);

  return (
    <form action={formAction} className="space-y-3 rounded-md border bg-muted/20 p-3">
      <input name="event_id" type="hidden" value={event.id} />
      <div className="grid gap-3 lg:grid-cols-2">
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              defaultChecked={Boolean(event.signup_message_enabled)}
              disabled={!settingsAvailable}
              name="signup_message_enabled"
              type="checkbox"
            />
            申込時メッセージ
          </label>
          <Textarea
            className="mt-2"
            defaultValue={event.signup_message_template ?? ""}
            disabled={!settingsAvailable}
            name="signup_message_template"
            placeholder="{name}さん、{event}へのお申し込みありがとうございます。"
            rows={3}
          />
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              defaultChecked={Boolean(event.reminder_enabled)}
              disabled={!settingsAvailable}
              name="reminder_enabled"
              type="checkbox"
            />
            前日リマインド
          </label>
          <Textarea
            className="mt-2"
            defaultValue={event.reminder_message_template ?? ""}
            disabled={!settingsAvailable}
            name="reminder_message_template"
            placeholder="{name}さん、明日は{event}です。"
            rows={3}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton disabled={!settingsAvailable} />
        <p className="text-xs text-muted-foreground">
          差し込み: {"{name}"} {"{event}"} {"{date}"} {"{location}"}
        </p>
      </div>
      {!settingsAvailable ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Supabaseで 20_pending_feature_setup.sql を実行すると設定できます。
        </p>
      ) : null}
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
    </form>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={disabled || pending} size="sm" type="submit" variant="outline">
      {pending ? "保存中..." : "自動送信設定を保存"}
    </Button>
  );
}
