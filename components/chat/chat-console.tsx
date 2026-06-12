"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { ExternalLink, FileText, ImageIcon, NotebookPen, RefreshCw, Send, Video } from "lucide-react";
import {
  recordExternalLineMessage,
  sendChatMessage,
  type ChatActionState
} from "@/app/(dashboard)/chat/actions";
import { SurveyMediaPicker } from "@/components/surveys/survey-media-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { localizeSampleText } from "@/lib/display/localize";
import { formatDateTime } from "@/lib/format";
import {
  buildJapaneseSearchIndex,
  matchesJapaneseSearchQuery
} from "@/lib/search/japanese";
import { getStaffDisplayName } from "@/lib/staff/display";
import type { Json } from "@/lib/supabase/database.types";

export type ChatStudent = {
  id: string;
  real_name: string | null;
  display_name: string | null;
  kana: string | null;
  university: string | null;
  line_user_id: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  tags: Array<{ id: string; name: string; color: string }>;
  assignees: Array<{ id: string; name: string; email: string }>;
};

export type ChatMessage = {
  id: string;
  student_id: string;
  direction: "in" | "out";
  type: string;
  payload: Json;
  status: string;
  sent_at: string;
  staff: { id: string; name: string; email: string } | null;
};

export type ChatSurveyLink = {
  id: string;
  title: string;
  folderId: string | null;
  folderName: string;
  url: string;
};

export type ChatTemplate = {
  id: string;
  title: string;
  body: string;
  kind: string;
  folderId: string | null;
  folderName: string;
};

const initialState: ChatActionState = {
  ok: false,
  message: ""
};

type ComposerTabType = "text" | "image" | "carousel" | "video" | "pdf";

export function ChatConsole({
  students,
  messages,
  surveys,
  templates,
  selectedStudentId,
  draftText = "",
  draftReason = "",
  initialComposerTab = "text",
  initialImageUrl = "",
  initialPdfUrl = "",
  initialPreviewImageUrl = ""
}: {
  students: ChatStudent[];
  messages: ChatMessage[];
  surveys: ChatSurveyLink[];
  templates: ChatTemplate[];
  selectedStudentId: string | null;
  draftText?: string;
  draftReason?: string;
  initialComposerTab?: ComposerTabType;
  initialImageUrl?: string;
  initialPdfUrl?: string;
  initialPreviewImageUrl?: string;
}) {
  const [query, setQuery] = useState("");
  const currentStudentId = selectedStudentId ?? students[0]?.id ?? null;
  const currentStudent = students.find((student) => student.id === currentStudentId);

  const filteredStudents = useMemo(() => {
    const keyword = query.trim();
    if (!keyword) return students;

    return students.filter((student) =>
      matchesJapaneseSearchQuery(
        buildJapaneseSearchIndex([
          student.real_name,
          student.display_name,
          student.kana,
          localizeSampleText(student.university),
          ...student.assignees.map((staff) => getStaffDisplayName(staff)),
          ...student.tags.map((tag) => localizeSampleText(tag.name))
        ]),
        keyword
      )
    );
  }, [query, students]);

  const currentMessages = messages
    .filter((message) => message.student_id === currentStudentId)
    .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime());

  return (
    <div className="grid h-[calc(100vh-8rem)] min-h-0 gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <aside className="rounded-lg border bg-card">
        <div className="border-b p-3">
          <Input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="学生名・大学・タグで検索"
            value={query}
          />
        </div>
        <div className="max-h-[calc(100vh-14rem)] overflow-auto">
          {filteredStudents.map((student) => {
            const active = student.id === currentStudentId;
            return (
              <Link
                className={
                  active
                    ? "block border-b bg-secondary p-3"
                    : "block border-b p-3 transition-colors hover:bg-secondary/60"
                }
                href={`/chat?studentId=${student.id}`}
                key={student.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {localizeSampleText(student.real_name) ||
                        localizeSampleText(student.display_name) ||
                        "名前未登録"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {localizeSampleText(student.university) || "大学未登録"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      担当:{" "}
                      {student.assignees.length > 0
                        ? student.assignees.map((staff) => getStaffDisplayName(staff)).join(" / ")
                        : "未設定"}
                    </p>
                  </div>
                  {!student.line_user_id ? (
                    <Badge variant="outline">LINE未連携</Badge>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {student.tags.slice(0, 3).map((tag) => (
                    <span
                      className="rounded-md px-2 py-0.5 text-xs font-medium text-white"
                      key={tag.id}
                      style={{ backgroundColor: tag.color }}
                    >
                      {localizeSampleText(tag.name)}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </aside>

      <section className="flex min-h-0 overflow-hidden rounded-lg border bg-card">
        {currentStudent ? (
          <div className="flex min-h-0 w-full flex-col">
            <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b p-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {localizeSampleText(currentStudent.real_name) ||
                    localizeSampleText(currentStudent.display_name) ||
                    "名前未登録"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  受信 {formatDateTime(currentStudent.last_inbound_at)} / 送信{" "}
                  {formatDateTime(currentStudent.last_outbound_at)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  担当:{" "}
                  {currentStudent.assignees.length > 0
                    ? currentStudent.assignees.map((staff) => getStaffDisplayName(staff)).join(" / ")
                    : "未設定"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/students/${currentStudent.id}`}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    詳細
                  </Link>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/chat?studentId=${currentStudent.id}`}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    更新
                  </Link>
                </Button>
              </div>
            </header>

            <div className="min-h-[8rem] flex-1 space-y-4 overflow-y-auto bg-secondary/20 p-4">
              {currentMessages.length > 0 ? (
                currentMessages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  まだメッセージはありません。
                </div>
              )}
            </div>

            <ChatComposer
              initialText={draftText}
              initialReason={draftReason}
              initialComposerTab={initialComposerTab}
              initialImageUrl={initialImageUrl}
              initialPdfUrl={initialPdfUrl}
              initialPreviewImageUrl={initialPreviewImageUrl}
              lineUserId={currentStudent.line_user_id}
              studentId={currentStudent.id}
              surveys={surveys}
              templates={templates}
            />
            <ExternalLineLogForm studentId={currentStudent.id} />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            学生データがありません。
          </div>
        )}
      </section>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const outbound = message.direction === "out";

  return (
    <div className={outbound ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          outbound
            ? "max-w-[78%] rounded-lg bg-primary px-4 py-3 text-primary-foreground"
            : "max-w-[78%] rounded-lg border bg-background px-4 py-3"
        }
      >
        <p className="whitespace-pre-wrap text-sm">
          {localizeSampleText(getMessageText(message.payload))}
        </p>
        <div
          className={
            outbound
              ? "mt-2 flex flex-wrap gap-2 text-xs text-primary-foreground/75"
              : "mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground"
          }
        >
          <span>{formatDateTime(message.sent_at)}</span>
          <span>{getMessageStatusLabel(message.status)}</span>
          {message.staff ? <span>{getStaffDisplayName(message.staff)}</span> : null}
        </div>
      </div>
    </div>
  );
}

function ExternalLineLogForm({ studentId }: { studentId: string }) {
  const [state, formAction] = useFormState(
    recordExternalLineMessage,
    initialState
  );

  return (
    <details className="shrink-0 border-t bg-secondary/30">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-secondary/60">
        <NotebookPen className="h-4 w-4 text-primary" />
        公式LINEから直接送った連絡を記録
      </summary>
      <form action={formAction} className="space-y-3 px-4 pb-4">
        <input name="student_id" type="hidden" value={studentId} />
        <div className="grid gap-3 md:grid-cols-[1fr_12rem]">
          <Textarea
            name="text"
            placeholder="公式LINE管理画面から送った内容やメモ"
            required
            rows={2}
          />
          <Input name="sent_at" type="datetime-local" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p
            className={
              state.message
                ? state.ok
                  ? "text-sm text-accent"
                  : "text-sm text-destructive"
                : "text-sm text-muted-foreground"
            }
          >
            {state.message ||
              "ここに記録すると最終送信として扱われ、返信がなければ「返信なし」に出ます。"}
          </p>
          <ExternalLogSubmitButton />
        </div>
      </form>
    </details>
  );
}

function ExternalLogSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} size="sm" type="submit" variant="outline">
      <NotebookPen className="mr-2 h-4 w-4" />
      {pending ? "記録中..." : "外部送信を記録"}
    </Button>
  );
}

function ChatComposer({
  initialText = "",
  initialReason = "",
  initialComposerTab = "text",
  initialImageUrl = "",
  initialPdfUrl = "",
  initialPreviewImageUrl = "",
  lineUserId,
  studentId,
  surveys,
  templates
}: {
  initialText?: string;
  initialReason?: string;
  initialComposerTab?: ComposerTabType;
  initialImageUrl?: string;
  initialPdfUrl?: string;
  initialPreviewImageUrl?: string;
  lineUserId: string | null;
  studentId: string;
  surveys: ChatSurveyLink[];
  templates: ChatTemplate[];
}) {
  const [state, formAction] = useFormState(sendChatMessage, initialState);
  const initialTextWithPdf = buildInitialComposerText(initialText, initialPdfUrl);
  const [tab, setTab] = useState<ComposerTabType>(initialComposerTab);
  const [text, setText] = useState(initialTextWithPdf);
  const [reason, setReason] = useState(initialReason);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [videoUrl, setVideoUrl] = useState("");
  const [previewImageUrl, setPreviewImageUrl] = useState(initialPreviewImageUrl || initialImageUrl);
  const [uploadMessage, setUploadMessage] = useState(initialPdfUrl ? "PDF URLを下書きにセットしました。" : "");
  const [carouselItems, setCarouselItems] = useState([
    { title: "", description: "", imageUrl: "", url: "", buttonLabel: "詳細を見る" },
    { title: "", description: "", imageUrl: "", url: "", buttonLabel: "詳細を見る" },
    { title: "", description: "", imageUrl: "", url: "", buttonLabel: "詳細を見る" }
  ]);

  useEffect(() => {
    setTab(initialComposerTab);
    setText(buildInitialComposerText(initialText, initialPdfUrl));
    setReason(initialReason);
    setImageUrl(initialImageUrl);
    setPreviewImageUrl(initialPreviewImageUrl || initialImageUrl);
    setVideoUrl("");
    setUploadMessage(initialPdfUrl ? "PDF URLを下書きにセットしました。" : "");
  }, [
    initialComposerTab,
    initialImageUrl,
    initialPdfUrl,
    initialPreviewImageUrl,
    initialReason,
    initialText,
    studentId
  ]);

  const groupedSurveys = useMemo(() => {
    const map = new Map<string, ChatSurveyLink[]>();
    for (const survey of surveys) {
      const folder = survey.folderName || "未分類";
      map.set(folder, [...(map.get(folder) ?? []), survey]);
    }
    return Array.from(map.entries());
  }, [surveys]);

  const groupedTemplates = useMemo(() => {
    const map = new Map<string, ChatTemplate[]>();
    for (const template of templates) {
      const folder = template.folderName || "未分類";
      map.set(folder, [...(map.get(folder) ?? []), template]);
    }
    return Array.from(map.entries());
  }, [templates]);

  function insertAtCursor(value: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setText((current) => `${current}${value}`);
      return;
    }

    const start = textarea.selectionStart ?? text.length;
    const end = textarea.selectionEnd ?? text.length;
    const nextText = `${text.slice(0, start)}${value}${text.slice(end)}`;
    setText(nextText);

    window.requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + value.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  function appendSurveyUrl(url: string) {
    if (!url) return;
    insertAtCursor(`アンケートはこちら\n${buildPersonalSurveyUrl(url, lineUserId, studentId)}`);
  }

  function applyCarouselTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;

    try {
      const parsed = JSON.parse(template.body);
      const items = normalizeCarouselTemplate(parsed);
      if (items.length > 0) {
        setCarouselItems(items);
        setTab("carousel");
        setUploadMessage(`${template.title}をカルーセルに読み込みました。`);
        return;
      }
    } catch {
      setText(template.body);
    }
  }

  function updateCarouselItem(
    index: number,
    patch: Partial<(typeof carouselItems)[number]>
  ) {
    setCarouselItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    );
  }

  async function uploadVideo(file: File | undefined) {
    if (!file) return;
    setUploadMessage("動画をアップロード中です...");
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/chat-media", {
        method: "POST",
        body: formData
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "アップロードできませんでした。");
      setVideoUrl(json.media.url);
      setUploadMessage("動画をアップロードしました。");
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "アップロードできませんでした。");
    }
  }

  async function uploadPdf(file: File | undefined) {
    if (!file) return;
    setUploadMessage("PDFをアップロード中です...");

    try {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        throw new Error("PDFファイルを選択してください。");
      }

      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/chat-media", {
        method: "POST",
        body: formData
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "PDFをアップロードできませんでした。");
      }

      const pdfText = `PDFはこちら\n${json.media.url}`;
      insertAtCursor(text.trim() ? `\n${pdfText}` : pdfText);
      setTab("text");
      setUploadMessage("PDFのURLを本文に挿入しました。送信ボタンで相手に送れます。");
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "PDFをアップロードできませんでした。");
    }
  }

  return (
    <form action={formAction} className="flex max-h-[34vh] min-h-[14rem] shrink-0 flex-col border-t bg-card">
      <input name="student_id" type="hidden" value={studentId} />
      <input name="message_kind" type="hidden" value={tab === "pdf" ? "text" : tab} />
      <input name="image_url" type="hidden" value={imageUrl} />
      <input name="video_url" type="hidden" value={videoUrl} />
      <input name="preview_image_url" type="hidden" value={previewImageUrl} />
      <input name="carousel_json" type="hidden" value={JSON.stringify(carouselItems)} />

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b bg-card pb-2">
          <div className="flex flex-wrap gap-1">
            <ComposerTab active={tab === "text"} onClick={() => setTab("text")}>
              テキスト
            </ComposerTab>
            <ComposerTab active={tab === "image"} onClick={() => setTab("image")}>
              画像
            </ComposerTab>
            <ComposerTab active={tab === "carousel"} onClick={() => setTab("carousel")}>
              カルーセル
            </ComposerTab>
            <ComposerTab active={tab === "video"} onClick={() => setTab("video")}>
              動画
            </ComposerTab>
            <ComposerTab active={tab === "pdf"} onClick={() => setTab("pdf")}>
              PDF
            </ComposerTab>
          </div>
          <SubmitButton />
        </div>

      {surveys.length > 0 ? (
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          onChange={(event) => appendSurveyUrl(event.target.value)}
          value=""
        >
          <option value="">回答フォームを挿入</option>
          {groupedSurveys.map(([folderName, items]) => (
            <optgroup key={folderName} label={folderName}>
              {items.map((survey) => (
                <option key={survey.id} value={survey.url}>
                  {survey.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      ) : null}

      {reason ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <p className="font-semibold">AI判断メモ</p>
          <p className="mt-1 whitespace-pre-wrap">{reason}</p>
        </div>
      ) : null}

      <Textarea
        ref={textareaRef}
        name="text"
        placeholder={
          tab === "text"
            ? "LINEで送るメッセージを入力"
            : "必要であれば、画像や動画の前に送る文章を入力"
        }
        rows={3}
        onChange={(event) => setText(event.target.value)}
        value={text}
      />

      {uploadMessage && tab !== "video" && tab !== "pdf" ? (
        <p className="rounded-md border bg-secondary/40 px-3 py-2 text-sm">{uploadMessage}</p>
      ) : null}

      {tab === "image" ? (
        <div className="rounded-md border bg-secondary/30 p-4">
          <div className="mb-3 flex items-center gap-2 font-medium">
            <ImageIcon className="h-4 w-4 text-primary" />
            送信する画像
          </div>
          <SurveyMediaPicker name="unused_image_picker" onChange={setImageUrl} value={imageUrl} />
        </div>
      ) : null}

      {tab === "carousel" ? (
        <div className="space-y-3 rounded-md border bg-secondary/30 p-4">
          <p className="font-medium">カルーセルテンプレート</p>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            onChange={(event) => applyCarouselTemplate(event.target.value)}
            value=""
          >
            <option value="">保存済みカルーセルを選択</option>
            {groupedTemplates.map(([folderName, items]) => (
              <optgroup key={folderName} label={folderName}>
                {items.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="text-sm text-muted-foreground">
            カルーセルは「テンプレート文管理」で作成し、ここでは呼び出して送信します。
          </p>
          <div className="rounded-md bg-background p-3 text-sm">
            選択中: {carouselItems.filter((item) => item.title || item.imageUrl || item.url).length}カード
          </div>
        </div>
      ) : null}

      {tab === "video" ? (
        <div className="space-y-4 rounded-md border bg-secondary/30 p-4">
          <div className="flex items-center gap-2 font-medium">
            <Video className="h-4 w-4 text-primary" />
            送信する動画
          </div>
          <Input
            accept="video/mp4,video/quicktime"
            onChange={(event) => void uploadVideo(event.target.files?.[0])}
            type="file"
          />
          {videoUrl ? (
            <p className="break-all text-xs text-muted-foreground">動画URL: {videoUrl}</p>
          ) : null}
          <div>
            <p className="mb-2 text-sm font-medium">プレビュー画像</p>
            <SurveyMediaPicker
              name="unused_preview_image_picker"
              onChange={setPreviewImageUrl}
              value={previewImageUrl}
            />
          </div>
          {uploadMessage ? (
            <p className="rounded-md bg-background px-3 py-2 text-sm">{uploadMessage}</p>
          ) : null}
        </div>
      ) : null}

        {tab === "pdf" ? (
          <div className="space-y-4 rounded-md border bg-secondary/30 p-4">
            <div className="flex items-center gap-2 font-medium">
              <FileText className="h-4 w-4 text-primary" />
              送付するPDF
            </div>
            <div className="rounded-md border border-dashed bg-background p-4">
              <Input
                accept="application/pdf,.pdf"
                onChange={(event) => void uploadPdf(event.target.files?.[0])}
                type="file"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                PDFは10MBまでアップロードできます。アップロード後、本文に「PDFはこちら」とURLを自動で挿入します。
              </p>
            </div>
            {uploadMessage ? (
              <p className="rounded-md bg-background px-3 py-2 text-sm">{uploadMessage}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t bg-card p-3 shadow-[0_-8px_18px_rgba(15,23,42,0.08)]">
        <p
          className={
            state.message
              ? state.ok
                ? "text-sm text-accent"
                : "text-sm text-destructive"
              : "text-sm text-muted-foreground"
          }
        >
          {state.message || "LINEトークン未設定時は送信記録だけ保存します。"}
        </p>
        <SubmitButton />
      </div>
    </form>
  );
}

function buildInitialComposerText(initialText: string, initialPdfUrl: string) {
  const text = initialText.trim();
  const pdfUrl = initialPdfUrl.trim();
  if (!pdfUrl) return initialText;

  const pdfLine = `PDFはこちら\n${pdfUrl}`;
  return text ? `${text}\n\n${pdfLine}` : pdfLine;
}

function normalizeCarouselTemplate(value: unknown) {
  const rawItems = Array.isArray(value)
    ? value
    : value &&
        typeof value === "object" &&
        "panels" in value &&
        Array.isArray((value as { panels?: unknown }).panels)
      ? (value as { panels: unknown[] }).panels
      : [];

  return rawItems
    .map((item) => {
      if (!item || typeof item !== "object") {
        return {
          title: "",
          description: "",
          imageUrl: "",
          url: "",
          buttonLabel: "詳細を見る",
          buttons: []
        };
      }

      const record = item as Record<string, any>;
      const buttons = Array.isArray(record.buttons)
        ? record.buttons
            .map((button) => {
              const action = button?.action ?? {};
              return {
                label: String(button?.label ?? "詳細を見る").trim(),
                type: String(action.type ?? "url").trim(),
                value: String(action.url ?? action.value ?? "").trim()
              };
            })
            .filter((button) => button.label || button.value)
        : [];
      const firstButton = buttons[0] ?? null;

      return {
        title: String(record.title ?? "").trim(),
        description: String(record.description ?? "").trim(),
        imageUrl: String(record.imageUrl ?? record.image_url ?? "").trim(),
        url: String(record.url ?? firstButton?.value ?? "").trim(),
        buttonLabel: String(record.buttonLabel ?? firstButton?.label ?? "詳細を見る").trim(),
        buttons
      };
    })
    .filter((item) => item.title || item.imageUrl || item.url || item.buttons.length > 0);
}

function ComposerTab({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      className={
        active
          ? "rounded-t-md border border-b-background bg-background px-4 py-2 text-sm font-semibold text-primary"
          : "rounded-t-md border bg-secondary px-4 py-2 text-sm text-muted-foreground hover:bg-background"
      }
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      <Send className="mr-2 h-4 w-4" />
      {pending ? "送信中..." : "送信"}
    </Button>
  );
}

function buildPersonalSurveyUrl(url: string, lineUserId: string | null, studentId: string) {
  try {
    const personalUrl = new URL(url);
    personalUrl.searchParams.set("source", "personal-line");
    if (lineUserId) personalUrl.searchParams.set("lineUserId", lineUserId);
    personalUrl.searchParams.set("studentId", studentId);
    return personalUrl.toString();
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    const params = new URLSearchParams({ source: "personal-line", studentId });
    if (lineUserId) params.set("lineUserId", lineUserId);
    return `${url}${separator}${params.toString()}`;
  }
}

function getMessageText(payload: Json) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "";
  }

  if ("text" in payload && typeof payload.text === "string") {
    const extra =
      "image_url" in payload && payload.image_url
        ? `\n画像: ${payload.image_url}`
        : "video_url" in payload && payload.video_url
          ? `\n動画: ${payload.video_url}`
          : "carousel" in payload && Array.isArray(payload.carousel) && payload.carousel.length > 0
            ? "\nカルーセルを送信しました"
          : "";
    return `${payload.text}${extra}`.trim();
  }

  return JSON.stringify(payload);
}

function getMessageStatusLabel(status: string) {
  const labels: Record<string, string> = {
    sent: "送信済み",
    mock_sent: "記録のみ",
    failed: "送信失敗",
    received: "受信",
    no_line_user_id: "LINE未連携",
    external_line_official: "公式LINE直接送信"
  };

  return labels[status] ?? status;
}
