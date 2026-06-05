"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Camera, Save, Upload } from "lucide-react";
import {
  updateStudentPhotoPosition,
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
  photoPositionX = 50,
  photoPositionY = 50,
  photoScale = 100,
  photoUrl,
  studentId
}: {
  photoPositionX?: number | null;
  photoPositionY?: number | null;
  photoScale?: number | null;
  photoUrl: string | null;
  studentId: string;
}) {
  const [uploadState, uploadAction] = useFormState(uploadStudentPhoto, initialState);
  const [positionState, positionAction] = useFormState(
    updateStudentPhotoPosition,
    initialState
  );
  const [positionX, setPositionX] = useState(photoPositionX ?? 50);
  const [positionY, setPositionY] = useState(photoPositionY ?? 50);
  const [scale, setScale] = useState(photoScale ?? 100);

  return (
    <div className="space-y-4">
      <div className="relative flex aspect-square max-h-56 w-full items-center justify-center overflow-hidden rounded-md border bg-muted">
        {photoUrl ? (
          <img
            alt="学生の顔写真"
            className="h-full w-full object-cover transition-transform"
            src={photoUrl}
            style={{
              objectPosition: `${positionX}% ${positionY}%`,
              transform: `scale(${scale / 100})`
            }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Camera className="h-10 w-10" />
            <span className="text-sm">顔写真なし</span>
          </div>
        )}
      </div>

      {photoUrl ? (
        <form action={positionAction} className="space-y-3 rounded-md border bg-secondary/40 p-3">
          <input name="student_id" type="hidden" value={studentId} />
          <input name="photo_position_x" type="hidden" value={positionX} />
          <input name="photo_position_y" type="hidden" value={positionY} />
          <input name="photo_scale" type="hidden" value={scale} />
          <PhotoRange
            label="左右"
            max={100}
            min={0}
            onChange={setPositionX}
            value={positionX}
          />
          <PhotoRange
            label="上下"
            max={100}
            min={0}
            onChange={setPositionY}
            value={positionY}
          />
          <PhotoRange
            label="拡大"
            max={200}
            min={100}
            onChange={setScale}
            suffix="%"
            value={scale}
          />
          <PhotoPositionSubmitButton />
          {positionState.message ? (
            <p
              className={`text-sm ${
                positionState.ok ? "text-emerald-700" : "text-destructive"
              }`}
            >
              {positionState.message}
            </p>
          ) : null}
        </form>
      ) : null}

      <form action={uploadAction} className="space-y-3">
        <input name="student_id" type="hidden" value={studentId} />
        <Input accept="image/jpeg,image/png,image/webp" name="photo" type="file" />
        <PhotoUploadSubmitButton />
        {uploadState.message ? (
          <p className={`text-sm ${uploadState.ok ? "text-emerald-700" : "text-destructive"}`}>
            {uploadState.message}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          jpg、png、webp、5MBまでアップロードできます。
        </p>
      </form>
    </div>
  );
}

function PhotoRange({
  label,
  max,
  min,
  onChange,
  suffix = "",
  value
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  suffix?: string;
  value: number;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      <span className="flex items-center justify-between">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {value}
          {suffix}
        </span>
      </span>
      <input
        className="w-full accent-emerald-600"
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        type="range"
        value={value}
      />
    </label>
  );
}

function PhotoPositionSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={pending} type="submit" variant="outline">
      <Save className="mr-2 h-4 w-4" />
      {pending ? "保存中..." : "表示位置を保存"}
    </Button>
  );
}

function PhotoUploadSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={pending} type="submit" variant="outline">
      <Upload className="mr-2 h-4 w-4" />
      {pending ? "アップロード中..." : "顔写真をアップロード"}
    </Button>
  );
}
