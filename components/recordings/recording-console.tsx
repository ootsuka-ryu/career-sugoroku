"use client";

import { useMemo, useRef, useState } from "react";
import {
  Loader2,
  Mic,
  Play,
  RotateCw,
  Square,
  Trash2,
  Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StudentCascadePicker } from "@/components/students/student-cascade-picker";

const MAX_RECORDING_UPLOAD_BYTES = 45 * 1024 * 1024;

type StudentOption = {
  id: string;
  name: string;
  kana?: string | null;
  university: string | null;
  graduationYear?: number | null;
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

type DisplayRecordingAi = {
  summary: string;
  nextAction: string;
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
  const [deletingRecordingId, setDeletingRecordingId] = useState("");
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

  const selectedAudioSize = selectedAudio ? formatBytes(selectedAudio.size) : null;

  async function startRecording() {
    setStatus("");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = getSupportedRecordingMimeType();
    const recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: 32000
    });
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
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      const recordedDurationSec = Math.max(1, Math.round((Date.now() - started) / 1000));
      const audioFile = new File([blob], "browser-recording.webm", {
        type: blob.type || "audio/webm"
      });

      if (browserUrl) URL.revokeObjectURL(browserUrl);
      setBrowserBlob(blob);
      setBrowserUrl(URL.createObjectURL(blob));
      setDurationSec(recordedDurationSec);
      setFile(null);
      void uploadRecording(audioFile, "browser", recordedDurationSec);
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

    await uploadRecording(selectedAudio, browserBlob ? "browser" : "upload", durationSec);
  }

  async function uploadRecording(
    audioFile: File,
    source: "browser" | "upload",
    recordingDurationSec: number | null
  ) {
    if (!studentId) {
      setStatus("学生を選んでください。");
      return;
    }

    if (audioFile.size > MAX_RECORDING_UPLOAD_BYTES) {
      setStatus(
        `音声ファイルが大きすぎます。現在 ${formatBytes(audioFile.size)} です。` +
          `保存できる目安は ${formatBytes(MAX_RECORDING_UPLOAD_BYTES)} までなので、録音を短くするか、mp3/m4a/webmに圧縮してからアップロードしてください。`
      );
      return;
    }

    const formData = new FormData();
    formData.set("student_id", studentId);
    formData.set("source", source);
    formData.set("duration_sec", String(recordingDurationSec ?? ""));
    formData.set("transcript", transcript);
    formData.set("process_ai", String(processAi));
    formData.set("audio", audioFile);

    setIsSubmitting(true);
    setStatus("録音を保存中です。AI文字起こし・要約も続けて処理します。");

    try {
      const response = await fetch("/api/recordings/upload", {
        method: "POST",
        body: formData
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(result.error ?? "保存に失敗しました。");
        return;
      }

      setStatus(
        result.aiError
          ? `録音は保存しました。AI処理は未完了です: ${result.aiError}`
          : "録音を保存し、AI処理も完了しました。一覧を更新します。"
      );
      window.setTimeout(() => window.location.reload(), 600);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "保存に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
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

  async function deleteRecording(recordingId: string) {
    if (!confirm("この録音・文字起こし・AI要約を削除します。元に戻せません。よろしいですか？")) {
      return;
    }

    setDeletingRecordingId(recordingId);
    setStatus("録音を削除しています。");

    try {
      const response = await fetch(`/api/recordings/${recordingId}`, {
        method: "DELETE"
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(result.error ?? "録音の削除に失敗しました。");
        return;
      }

      setStatus(
        result.storageWarning
          ? `録音一覧から削除しました。${result.storageWarning}`
          : "録音を削除しました。"
      );
      window.setTimeout(() => window.location.reload(), 400);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "録音の削除に失敗しました。");
    } finally {
      setDeletingRecordingId("");
    }
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
            <StudentCascadePicker
              id="student_id"
              onChange={setStudentId}
              students={students}
              value={studentId}
            />
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

          {selectedAudioSize ? (
            <p className="rounded-md bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">
              選択中の音声サイズ: {selectedAudioSize}
            </p>
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
            音声ファイルを保存
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
            recordings.map((recording) => {
              const aiDisplay = formatRecordingAiForDisplay(recording);

              return (
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
                  <div className="flex items-center gap-2">
                    <Button
                      disabled={deletingRecordingId === recording.id}
                      onClick={() => processExisting(recording.id)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <RotateCw className="mr-2 h-4 w-4" />
                      AI処理
                    </Button>
                    <Button
                      disabled={deletingRecordingId === recording.id}
                      onClick={() => deleteRecording(recording.id)}
                      size="sm"
                      type="button"
                      variant="destructive"
                    >
                      {deletingRecordingId === recording.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      削除
                    </Button>
                  </div>
                </div>
                <audio className="w-full" controls src={recording.audio_url}>
                  <track kind="captions" />
                </audio>
                {aiDisplay.summary ? (
                  <div className="rounded-md bg-secondary/50 p-3 text-sm">
                    <p className="font-medium">AI要約</p>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                      {aiDisplay.summary}
                    </p>
                  </div>
                ) : null}
                {aiDisplay.nextAction ? (
                  <div className="rounded-md bg-accent/10 p-3 text-sm">
                    <p className="font-medium">次アクション</p>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                      {aiDisplay.nextAction}
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
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatRecordingAiForDisplay(recording: RecordingItem): DisplayRecordingAi {
  const parsedSummary = parseRecordingAiJson(recording.ai_summary);
  const parsedNextAction = parseRecordingAiJson(recording.ai_next_action);
  const nextActions = [
    ...(parsedSummary?.nextActions ?? []),
    ...(parsedNextAction?.nextActions ?? [])
  ];

  return {
    summary:
      parsedSummary?.summary ||
      parsedNextAction?.summary ||
      cleanAiPlainText(recording.ai_summary ?? ""),
    nextAction:
      nextActions.join("\n") ||
      cleanAiPlainText(recording.ai_next_action ?? "")
  };
}

function parseRecordingAiJson(value: string | null) {
  if (!value) return null;
  const jsonText = extractJsonObject(value);
  if (!jsonText) return null;

  try {
    const parsed = JSON.parse(jsonText) as {
      summary?: unknown;
      nextActions?: unknown;
      nextAction?: unknown;
    };
    const nextActions = [
      ...normalizeAiNextActions(parsed.nextActions),
      ...normalizeAiNextActions(parsed.nextAction)
    ];

    return {
      summary:
        typeof parsed.summary === "string"
          ? cleanAiPlainText(parsed.summary)
          : "",
      nextActions
    };
  } catch {
    return null;
  }
}

function extractJsonObject(value: string) {
  const text = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/^json\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const firstBrace = text.indexOf("{");
  if (firstBrace < 0) return "";

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = firstBrace; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "\"") {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return text.slice(firstBrace, index + 1);
  }

  return "";
}

function normalizeAiNextActions(value: unknown): string[] {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((item) => {
      if (typeof item === "string") return cleanAiPlainText(item);
      if (!item || typeof item !== "object") return "";
      const entry = item as {
        what?: unknown;
        action?: unknown;
        title?: unknown;
        by?: unknown;
        who?: unknown;
      };
      const what =
        typeof entry.what === "string"
          ? entry.what
          : typeof entry.action === "string"
            ? entry.action
            : typeof entry.title === "string"
              ? entry.title
              : "";
      const by = typeof entry.by === "string" ? entry.by : "";
      const who = typeof entry.who === "string" ? entry.who : "";
      const prefix = [who, by].filter(Boolean).join(" / ");
      return cleanAiPlainText(prefix ? `${prefix}: ${what}` : what);
    })
    .filter(Boolean);
}

function cleanAiPlainText(value: string) {
  const text = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/^json\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return extractJsonObject(text) ? "" : text;
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function getSupportedRecordingMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4"
  ];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const precision = unitIndex === 0 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
}
