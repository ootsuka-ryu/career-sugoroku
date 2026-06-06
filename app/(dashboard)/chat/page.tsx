import { MessageSquareText } from "lucide-react";
import {
  ChatConsole,
  type ChatMessage,
  type ChatStudent,
  type ChatTemplate,
  type ChatSurveyLink
} from "@/components/chat/chat-console";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function ChatPage({
  searchParams
}: {
  searchParams: {
    studentId?: string;
    draft?: string;
    tab?: string;
    imageUrl?: string;
    pdfUrl?: string;
    previewImageUrl?: string;
  };
}) {
  const supabase = createClient();

  const [studentsResult, messagesResult, surveysResult, templatesResult] = await Promise.all([
    supabase
      .from("students")
      .select(
        `
        id,
        real_name,
        display_name,
        kana,
        university,
        line_user_id,
        last_inbound_at,
        last_outbound_at,
        student_tags(tags(id, name, color)),
        student_assignees(staff_users!student_assignees_staff_id_fkey(id, name, email))
      `
      )
      .order("last_inbound_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("messages")
      .select(
        "id, student_id, direction, type, payload, status, sent_at, staff_users!messages_staff_id_fkey(id, name, email)"
      )
      .order("sent_at", { ascending: false })
      .limit(300),
    (supabase as any)
      .from("surveys")
      .select("id, title, admin_title, public_title, folder_id, survey_folders(id, name)")
      .eq("is_active", true)
      .eq("is_visible", true)
      .order("updated_at", { ascending: false }),
    (supabase as any)
      .from("message_templates")
      .select("id, title, body, kind, folder_id, message_template_folders(id, name)")
      .order("updated_at", { ascending: false })
  ]);

  const students = (studentsResult.data ?? []).map((row: any) => ({
    id: row.id,
    real_name: row.real_name,
    display_name: row.display_name,
    kana: row.kana,
    university: row.university,
    line_user_id: row.line_user_id,
    last_inbound_at: row.last_inbound_at,
    last_outbound_at: row.last_outbound_at,
    tags: (row.student_tags ?? [])
      .map((relation: any) => relation.tags)
      .filter(Boolean),
    assignees: (row.student_assignees ?? [])
      .map((relation: any) => relation.staff_users)
      .filter(Boolean)
  })) as ChatStudent[];

  const messages = (messagesResult.data ?? []).map((row: any) => ({
    id: row.id,
    student_id: row.student_id,
    direction: row.direction,
    type: row.type,
    payload: row.payload,
    status: row.status,
    sent_at: row.sent_at,
    staff: row.staff_users
  })) as ChatMessage[];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const surveys = (surveysResult.data ?? []).map((row: any) => ({
    id: row.id,
    title: row.admin_title || row.public_title || row.title,
    folderId: row.folder_id,
    folderName: row.survey_folders?.name ?? "未分類",
    url: `${baseUrl}/survey/${row.id}`
  })) as ChatSurveyLink[];
  const templateTableMissing =
    templatesResult.error?.message?.includes("message_templates") ||
    templatesResult.error?.message?.includes("schema cache");
  const templates = (templateTableMissing ? [] : templatesResult.data ?? [])
    .filter((row: any) => isCarouselTemplate(row))
    .map((row: any) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      kind: row.kind,
      folderId: row.folder_id,
      folderName: row.message_template_folders?.name ?? "未分類"
    })) as ChatTemplate[];
  const initialComposerTab = getInitialComposerTab(searchParams.tab);

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="accent">Step 4</Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">チャット</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          LINEの受信履歴を見ながら、学生ごとに1:1返信します。
        </p>
      </div>

      {(studentsResult.error || messagesResult.error || surveysResult.error || (templatesResult.error && !templateTableMissing)) && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <MessageSquareText className="h-5 w-5" />
              チャット取得エラー
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-destructive">
            <p>{studentsResult.error?.message}</p>
            <p>{messagesResult.error?.message}</p>
            <p>{surveysResult.error?.message}</p>
            <p>{templatesResult.error?.message}</p>
          </CardContent>
        </Card>
      )}

      <ChatConsole
        initialComposerTab={initialComposerTab}
        initialImageUrl={searchParams.imageUrl ?? ""}
        initialPdfUrl={searchParams.pdfUrl ?? ""}
        initialPreviewImageUrl={searchParams.previewImageUrl ?? ""}
        messages={messages}
        draftText={searchParams.draft ?? ""}
        selectedStudentId={searchParams.studentId ?? null}
        students={students}
        surveys={surveys}
        templates={templates}
      />
    </div>
  );
}

function isCarouselTemplate(row: { kind?: string | null; body?: string | null }) {
  if (row.kind === "carousel" || row.kind === "カルーセル") return true;
  if (!row.body) return false;

  try {
    const parsed = JSON.parse(row.body);
    return Boolean(
      parsed &&
        typeof parsed === "object" &&
        "type" in parsed &&
        (parsed as { type?: unknown }).type === "carousel"
    );
  } catch {
    return false;
  }
}

function getInitialComposerTab(value?: string) {
  if (value === "image" || value === "pdf" || value === "carousel" || value === "video") {
    return value;
  }
  return "text";
}
