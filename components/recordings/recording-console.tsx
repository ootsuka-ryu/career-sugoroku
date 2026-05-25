"use client";

import { useMemo, useRef, useState } from "react";
import {
  Loader2,
  Mic,
  Play,
  RotateCw,
  Square,
  Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type StudentOption = {
  id: string;
  name: string;
  university: string | null;
};

type RecordingItem = {
  id: string;
  student_id: string;
  source: string;
  audio_url: string;
  duration_sec: number | null;
  transcript: string | null;
  ai_summary: string | null;
  ai_next_action: string | null;
  recorded_at: string | null;
  student: StudentOption | null;
};

export function RecordingConsole({
  students,
  recordings,
  defaultStudentId
}: {
  students: StudentOption[];
  recordings: RecordingItem[];
  defaultStudentId?: string;
}) {
  const [studentId, setStudentId] = useState(defaultStudentId ?? students[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [browserBlob, setBrowserBlob] = useState<Blob | null>(null);
  const [browserUrl, setBrowserUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [processAi, setProcessAi] = useState(true);
  const [status, setStatus] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const selectedAudio = useMemo(() => {
    if (browserBlob) {
      return new File([browserBlob], "browser-recording.webm", {
        type: browserBlob.type || "audio/webm"
      });
    }
    return file;
  }, [browserBlob, file]);

  async function startRecording() {
    setStatus("");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const started = Date.now();
    chunksRef.current = [];
    recorderRef.current = recorder;
    setStartedAt(started);
    setDurationSec(null);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      if (browserUrl) URL.revokeObjectURL(browserUrl);
      setBrowserBlob(blob);
      setBrowserUrl(URL.createObjectURL(blob));
      setDurationSec(Math.max(1, Math.round((Date.now() - started) / 1000)));
      setFile(null);
      setStatus("録音を一時保存しました。アップロードで保存できます。");
    };

    recorder.start();
    setIsRecording(true);
    setStatus("録音中です。");
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setIsRecording(false);
  }

  async function submitRecording() {
    if (!studentId || !selectedAudio) {
      setStatus("学生と音声ファイルを選んでください。");
      return;
    }

    const formData = new FormData();
    formData.set("student_id", studentId);
    formData.set("source", browserBlob ? "browser" : "upload");
    formData.set("duration_sec", String(durationSec ?? ""));
    formData.set("transcript", transcript);
    formData.set("process_ai", String(processAi));
    formData.set("audio", selectedAudio);

    setIsSubmitting(true);
    setStatus("保存中です。AI処理を選んだ場合は少し時間がかかります。");
    const response = await fetch("/api/recordings/upload", {
      method: "POST",
      body: formData
    });
    const result = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setStatus(result.error ?? "保存に失敗しました。");
      return;
    }

    setStatus("保存しました。");
    window.location.reload();
  }

  async function processExisting(recordingId: string) {
    setStatus("AI処理中です。");
    const response = await fetch("/api/recordings/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordingId })
    });
    const result = await response.json();
    if (!response.ok) {
      setStatus(result.error ?? "AI処理に失敗しました。");
      return;
    }
    setStatus("AI処理が完了しました。");
    window.location.reload();
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.42fr_0.58fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            録音を追加
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="student_id">学生</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              id="student_id"
              onChange={(event) => setStudentId(event.target.value)}
              value={studentId}
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                  {student.university ? ` / ${student.university}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              disabled={isRecording || isSubmitting}
              onClick={startRecording}
              type="button"
            >
              <Mic className="mr-2 h-4 w-4" />
              録音開始
            </Button>
            <Button
              disabled={!isRecording}
              onClick={stopRecording}
              type="button"
              variant="outline"
            >
              <Square className="mr-2 h-4 w-4" />
              停止
            </Button>
          </div>

          {browserUrl ? (
            <audio className="w-full" controls src={browserUrl}>
              <track kind="captions" />
            </audio>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="audio">音声ファイル</Label>
            <Input
              accept="audio/*,video/mp4"
              id="audio"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setBrowserBlob(null);
                setBrowserUrl("");
              }}
              type="file"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transcript">文字起こし済みテキスト</Label>
            <Textarea
              id="transcript"
              onChange={(event) => setTranscript(event.target.value)}
              placeholder="Web Speech APIなどで文字起こし済みの場合は貼り付け"
              rows={5}
              value={transcript}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              checked={processAi}
              onChange={(event) => setProcessAi(event.target.checked)}
              type="checkbox"
            />
            保存後にAI要約も作る
          </label>

          <Button
            className="w-full"
            disabled={isSubmitting || !studentId || !selectedAudio}
            onClick={submitRecording}
            type="button"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            アップロード
          </Button>

          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            録音一覧
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recordings.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              録音はまだありません。
            </p>
          ) : (
            recordings.map((recording) => (
              <div className="space-y-3 rounded-md border p-4" key={recording.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {recording.student?.name ?? "学生未設定"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {recording.source} / {formatDateTime(recording.recorded_at)}
                    </p>
                  </div>
                  <Button
                    onClick={() => processExisting(recording.id)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <RotateCw className="mr-2 h-4 w-4" />
                    AI処理
                  </Button>
                </div>
                <audio className="w-full" controls src={recording.audio_url}>
                  <track kind="captions" />
                </audio>
                {recording.ai_summary ? (
                  <div className="rounded-md bg-secondary/50 p-3 text-sm">
                    <p className="font-medium">AI要約</p>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                      {recording.ai_summary}
                    </p>
                  </div>
                ) : null}
                {recording.ai_next_action ? (
                  <div className="rounded-md bg-accent/10 p-3 text-sm">
                    <p className="font-medium">次アクション</p>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                      {recording.ai_next_action}
                    </p>
                  </div>
                ) : null}
                {recording.transcript ? (
                  <details className="text-sm">
                    <summary className="cursor-pointer font-medium">文字起こし</summary>
                    <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                      {recording.transcript}
                    </p>
                  </details>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}
