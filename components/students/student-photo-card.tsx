"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Camera, Upload } from "lucide-react";
import {
  uploadStudentPhoto,
  type StudentActionState
} from "@/app/(dashboard)/students/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: StudentActionState = {
  ok: false,
  message: ""
};

export function StudentPhotoCard({
  photoUrl,
  studentId
}: {
  photoUrl: string | null;
  studentId: string;
}) {
  const [state, formAction] = useFormState(uploadStudentPhoto, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input name="student_id" type="hidden" value={studentId} />
      <div className="relative flex aspect-square max-h-56 w-full items-center justify-center overflow-hidden rounded-md border bg-muted">
        {photoUrl ? (
          <img
            alt="学生の顔写真"
            className="h-full w-full object-cover"
            src={photoUrl}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Camera className="h-10 w-10" />
            <span className="text-sm">顔写真なし</span>
          </div>
        )}
      </div>
      <Input accept="image/jpeg,image/png,image/webp" name="photo" type="file" />
      <PhotoSubmitButton />
      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-destructive"}`}>
          {state.message}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">jpg、png、webp、5MBまでアップロードできます。</p>
    </form>
  );
}

function PhotoSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={pending} type="submit" variant="outline">
      <Upload className="mr-2 h-4 w-4" />
      {pending ? "アップロード中..." : "顔写真をアップロード"}
    </Button>
  );
}
