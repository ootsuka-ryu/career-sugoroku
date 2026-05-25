"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  markNotificationRead,
  type NotificationActionState
} from "@/app/(dashboard)/notifications/actions";
import { Button } from "@/components/ui/button";

const initialState: NotificationActionState = {
  ok: false,
  message: ""
};

export function NotificationReadButton({ id }: { id: string }) {
  const [, formAction] = useFormState(markNotificationRead, initialState);

  return (
    <form action={formAction}>
      <input name="notification_id" type="hidden" value={id} />
      <ReadSubmitButton />
    </form>
  );
}

function ReadSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} size="sm" type="submit" variant="outline">
      {pending ? "処理中..." : "既読"}
    </Button>
  );
}
