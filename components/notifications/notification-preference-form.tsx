"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  updateNotificationPreference,
  type NotificationActionState
} from "@/app/(dashboard)/notifications/actions";
import { Button } from "@/components/ui/button";

const initialState: NotificationActionState = {
  ok: false,
  message: ""
};

export function NotificationPreferenceForm({
  type,
  label,
  description,
  viaLine,
  viaEmail,
  isEnabled
}: {
  type: string;
  label: string;
  description: string;
  viaLine: boolean;
  viaEmail: boolean;
  isEnabled: boolean;
}) {
  const [state, formAction] = useFormState(updateNotificationPreference, initialState);

  return (
    <form action={formAction} className="rounded-md border bg-card p-4">
      <input name="type" type="hidden" value={type} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-medium">{label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input defaultChecked={isEnabled} name="is_enabled" type="checkbox" />
            通知する
          </label>
          <label className="flex items-center gap-2">
            <input defaultChecked={viaLine} name="via_line" type="checkbox" />
            LINE
          </label>
          <label className="flex items-center gap-2">
            <input defaultChecked={viaEmail} name="via_email" type="checkbox" />
            メール
          </label>
          <PreferenceSubmitButton />
        </div>
      </div>
      {state.message ? (
        <p
          className={
            state.ok
              ? "mt-3 text-sm text-accent"
              : "mt-3 text-sm text-destructive"
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function PreferenceSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} size="sm" type="submit" variant="outline">
      {pending ? "保存中..." : "保存"}
    </Button>
  );
}
