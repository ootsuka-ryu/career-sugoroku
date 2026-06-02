"use client";

import { useFormState, useFormStatus } from "react-dom";
import { FolderPlus } from "lucide-react";
import {
  createTemplateFolder,
  type MessageTemplateActionState
} from "@/app/(dashboard)/message-templates/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const initialState: MessageTemplateActionState = {
  ok: false,
  message: ""
};

export function TemplateFolderForm() {
  const [state, action] = useFormState(createTemplateFolder, initialState);

  return (
    <form action={action} className="space-y-2">
      <Input name="name" placeholder="新しいフォルダ" />
      <SubmitButton />
      {state.message ? (
        <p
          className={cn(
            "rounded px-3 py-2 text-xs",
            state.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          )}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button className="w-full" disabled={pending} type="submit" variant="outline">
      <FolderPlus className="mr-2 h-4 w-4" />
      {pending ? "作成中..." : "フォルダ作成"}
    </Button>
  );
}
