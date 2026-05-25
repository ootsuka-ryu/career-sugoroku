"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  saveRecruitingMonthlySnapshot,
  type SaveRecruitingSnapshotState
} from "@/app/(dashboard)/dashboard/actions";
import { Button } from "@/components/ui/button";

const initialState: SaveRecruitingSnapshotState = {
  ok: false,
  message: ""
};

export function SaveSnapshotButton({ graduationYear }: { graduationYear: number }) {
  const [state, formAction] = useFormState(saveRecruitingMonthlySnapshot, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input name="graduation_year" type="hidden" value={graduationYear} />
      <SubmitButton />
      {state.message ? (
        <p className={`max-w-64 text-xs ${state.ok ? "text-emerald-700" : "text-destructive"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      {pending ? "保存中..." : "今月データを保存"}
    </Button>
  );
}
