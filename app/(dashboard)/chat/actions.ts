"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { pushLineMessage } from "@/lib/line/client";
import { createClient } from "@/lib/supabase/server";
import {
  personalizeSurveyUrl,
  personalizeSurveyUrlsInText
} from "@/lib/surveys/personalized-url";

export type ChatActionState = {
  ok: boolean;
  message: string;
};

const initialState: ChatActionState = {
  ok: false,
  message: ""
};

const sendMessageSchema = z.object({
  student_id: z.string().uuid(),
  message_kind: z.enum(["text", "image", "carousel", "video"]).default("text"),
  text: z.string().trim().max(2000).optional(),
  image_url: z.string().trim().optional(),
  video_url: z.string().trim().optional(),
  preview_image_url: z.string().trim().optional(),
  carousel_json: z.string().trim().optional()
});

const externalLineMessageSchema = z.object({
  student_id: z.string().uuid(),
  text: z.string().trim().min(1, "内容を入力してください。").max(1000),
  sent_at: z.string().optional()
});

type LineCarouselButton = {
  label: string;
  type: string;
  value: string;
};

type LineCarouselItem = {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
  buttonLabel: string;
  buttons: LineCarouselButton[];
};

export async function sendChatMessage(
  _prevState: ChatActionState = initialState,
  formData: FormData
): Promise<ChatActionState> {
  const parsed = sendMessageSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.errors[0]?.message ?? "入力内容を確認してください。"
    };
  }

  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "ログインが必要です。" };
  }

  const { student_id } = parsed.data;
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, line_user_id")
    .eq("id", student_id)
    .single();

  if (studentError || !student) {
    return {
      ok: false,
      message: studentError?.message ?? "学生が見つかりません。"
    };
  }

  const messageKind = parsed.data.message_kind;
  const personalizedInput = personalizeChatInput(parsed.data, student.line_user_id, student.id);
  const lineMessages = buildLineMessages(personalizedInput);
  if (lineMessages.length === 0) {
    return {
      ok: false,
      message: getMissingContentMessage(personalizedInput)
    };
  }

  let status = "mock_sent";
  let resultMessage = "LINEトークン未設定のため、送信記録だけ保存しました。";

  if (student.line_user_id) {
    const lineResult = await pushLineMessage(student.line_user_id, lineMessages);

    if (lineResult.ok && !lineResult.skipped) {
      status = "sent";
      resultMessage = "LINEへ送信しました。";
    } else if (lineResult.ok && lineResult.skipped) {
      status = "mock_sent";
      resultMessage = "LINEトークン未設定のため、送信記録だけ保存しました。";
    } else {
      status = "failed";
      resultMessage = `LINE送信に失敗しました: ${lineResult.reason}`;
    }
  } else {
    status = "no_line_user_id";
    resultMessage = "学生にLINE userIdがないため、送信記録だけ保存しました。";
  }

  const { error: messageError } = await supabase.from("messages").insert({
    student_id,
    direction: "out",
    type: getStoredMessageType(messageKind),
    payload: buildStoredPayload(personalizedInput),
    status,
    sent_at: new Date().toISOString(),
    staff_id: user.id
  });

  if (messageError) {
    return { ok: false, message: messageError.message };
  }

  await markStudentAsPool(supabase, student_id);

  revalidatePath("/chat");
  revalidatePath(`/students/${student_id}`);

  return {
    ok: status !== "failed",
    message: resultMessage
  };
}

function personalizeChatInput(
  input: z.infer<typeof sendMessageSchema>,
  lineUserId: string | null | undefined,
  studentId: string
): z.infer<typeof sendMessageSchema> {
  if (!lineUserId && !studentId) return input;

  return {
    ...input,
    text: personalizeSurveyUrlsInText(input.text ?? "", lineUserId, studentId),
    carousel_json: personalizeCarouselJson(input.carousel_json, lineUserId, studentId)
  };
}

function personalizeCarouselJson(
  value: string | undefined,
  lineUserId: string | null | undefined,
  studentId: string
) {
  if (!value) return value;

  try {
    const items = JSON.parse(value);
    if (!Array.isArray(items)) return value;

    return JSON.stringify(
      items.map((item) => ({
        ...item,
        url: personalizeSurveyUrl(String(item.url ?? ""), lineUserId, studentId)
      }))
    );
  } catch {
    return value;
  }
}

async function markStudentAsPool(supabase: any, studentId: string) {
  const { error } = await supabase
    .from("students")
    .update({
      funnel_uncontacted: false,
      funnel_pool: true
    })
    .eq("id", studentId);

  if (error?.message?.includes("funnel_")) return;
}

function buildLineMessages(input: z.infer<typeof sendMessageSchema>) {
  if (input.message_kind === "text") {
    return input.text ? [{ type: "text" as const, text: input.text }] : [];
  }

  if (input.message_kind === "image") {
    if (!input.image_url) return [];
    const messages = [];
    if (input.text) messages.push({ type: "text" as const, text: input.text });
    messages.push({
      type: "image" as const,
      originalContentUrl: input.image_url,
      previewImageUrl: input.image_url
    });
    return messages;
  }

  if (input.message_kind === "video") {
    if (!input.video_url || !input.preview_image_url) return [];
    const messages = [];
    if (input.text) messages.push({ type: "text" as const, text: input.text });
    messages.push({
      type: "video" as const,
      originalContentUrl: input.video_url,
      previewImageUrl: input.preview_image_url
    });
    return messages;
  }

  if (input.message_kind === "carousel") {
    const items = parseCarouselItems(input.carousel_json);
    if (items.length === 0) return [];
    const messages = [];
    if (input.text) messages.push({ type: "text" as const, text: input.text });
    messages.push({
      type: "flex" as const,
      altText: "ご案内",
      contents: {
        type: "carousel",
          contents: items.map((item) => {
            const actions = buildCarouselActions(item);

            return {
              type: "bubble",
              hero: item.imageUrl
                ? {
                    type: "image",
                    url: item.imageUrl,
                    size: "full",
                    aspectRatio: "20:13",
                    aspectMode: "cover"
                  }
                : undefined,
              body: {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "text",
                    text: item.title || "ご案内",
                    weight: "bold",
                    wrap: true
                  },
                  item.description
                    ? {
                        type: "text",
                        text: item.description,
                        size: "sm",
                        color: "#666666",
                        wrap: true,
                        margin: "md"
                      }
                    : undefined
                ].filter(Boolean)
              },
              footer: actions.length > 0
                ? {
                    type: "box",
                    layout: "vertical",
                    spacing: "sm",
                    contents: actions.map((action) => ({
                      type: "button",
                      style: "link",
                      height: "sm",
                      action
                    }))
                  }
                : undefined
            };
          })
      }
    });
    return messages;
  }

  return [];
}

function getMissingContentMessage(input: z.infer<typeof sendMessageSchema>) {
  if (input.message_kind === "image") return "画像を選択してください。";
  if (input.message_kind === "video") return "動画とプレビュー画像を選択してください。";
  if (input.message_kind === "carousel") {
    return "カルーセルのカードを1つ以上入力してください。";
  }
  return "メッセージを入力してください。";
}

function buildStoredPayload(input: z.infer<typeof sendMessageSchema>) {
  return {
    text: input.text ?? "",
    image_url: input.image_url ?? "",
    video_url: input.video_url ?? "",
    preview_image_url: input.preview_image_url ?? "",
    carousel: parseCarouselItems(input.carousel_json)
  };
}

function getStoredMessageType(messageKind: z.infer<typeof sendMessageSchema>["message_kind"]) {
  return messageKind === "carousel" ? "flex" : messageKind;
}

function buildCarouselActions(item: LineCarouselItem) {
  const buttons =
    item.buttons.length > 0
      ? item.buttons
      : item.url
        ? [{ label: item.buttonLabel || "詳細を見る", type: "url", value: item.url }]
        : [];

  return buttons
    .map((button: LineCarouselButton) => buildCarouselAction(button))
    .filter((action): action is NonNullable<ReturnType<typeof buildCarouselAction>> => Boolean(action))
    .slice(0, 4);
}

function buildCarouselAction(button: LineCarouselButton) {
  const label = truncateLineText(button.label || "詳細を見る", 40);
  const value = button.value.trim();
  if (!value) return null;

  if (button.type === "text") {
    return {
      type: "message" as const,
      label,
      text: truncateLineText(value, 300)
    };
  }

  const uri = normalizeCarouselUri(value);
  if (uri) {
    return {
      type: "uri" as const,
      label,
      uri
    };
  }

  return {
    type: "message" as const,
    label,
    text: truncateLineText(value, 300)
  };
}

function normalizeCarouselUri(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return "";
  }
}

function truncateLineText(value: string, maxLength: number) {
  const trimmed = value.trim();
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function parseCarouselItems(value?: string): LineCarouselItem[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        const buttons = Array.isArray(item.buttons)
          ? item.buttons
              .map((button: any) => ({
                label: String(button.label ?? "詳細を見る").trim(),
                type: String(button.type ?? button.action?.type ?? "url").trim(),
                value: String(button.value ?? button.action?.url ?? button.action?.value ?? "").trim()
              }))
              .filter((button: LineCarouselButton) => button.label || button.value)
          : [];

        return {
          title: String(item.title ?? "").trim(),
          description: String(item.description ?? "").trim(),
          imageUrl: String(item.imageUrl ?? "").trim(),
          url: String(item.url ?? "").trim(),
          buttonLabel: String(item.buttonLabel ?? "").trim(),
          buttons
        };
      })
      .filter((item) => item.title || item.imageUrl || item.url || item.buttons.length > 0);
  } catch {
    return [];
  }
}

export async function recordExternalLineMessage(
  _prevState: ChatActionState = initialState,
  formData: FormData
): Promise<ChatActionState> {
  const parsed = externalLineMessageSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.errors[0]?.message ?? "内容を確認してください。"
    };
  }

  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "ログインが必要です。" };
  }

  const sentAt = parsed.data.sent_at
    ? new Date(parsed.data.sent_at).toISOString()
    : new Date().toISOString();

  const { error: messageError } = await supabase.from("messages").insert({
    student_id: parsed.data.student_id,
    direction: "out",
    type: "text",
    payload: {
      text: parsed.data.text,
      source: "line_official_manager"
    },
    status: "external_line_official",
    sent_at: sentAt,
    staff_id: user.id
  });

  if (messageError) {
    return { ok: false, message: messageError.message };
  }

  await supabase.from("student_actions").insert({
    student_id: parsed.data.student_id,
    staff_id: user.id,
    action_type: "line",
    title: "公式LINEから直接送信",
    body: parsed.data.text,
    executed_at: sentAt
  });

  revalidatePath("/chat");
  revalidatePath("/follow-ups");
  revalidatePath("/dashboard");
  revalidatePath(`/students/${parsed.data.student_id}`);

  return {
    ok: true,
    message:
      "公式LINEから直接送った連絡として記録しました。返信がなければピックアップ対象になります。"
  };
}
