import { pushLineMessage } from "@/lib/line/client";

type NotificationType =
  | "survey_response"
  | "new_friend"
  | "chat_reply"
  | "urgent_ai_action"
  | "ai_urgent";

type SupabaseLike = {
  from: (table: string) => any;
};

type StaffNotificationInput = {
  staffId: string;
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  priority?: "urgent" | "normal" | "info";
};

export async function createStaffNotification(
  supabase: SupabaseLike,
  input: StaffNotificationInput
) {
  const preferenceType = normalizeNotificationType(input.type);
  const [{ data: staff }, { data: preference }] = await Promise.all([
    supabase
      .from("staff_users")
      .select("id, email, name, line_user_id")
      .eq("id", input.staffId)
      .maybeSingle(),
    supabase
      .from("notification_preferences")
      .select("via_line, via_email, is_enabled")
      .eq("staff_id", input.staffId)
      .eq("type", preferenceType)
      .maybeSingle()
  ]);

  if (!staff) return;

  const isEnabled = preference?.is_enabled ?? true;
  const viaLine = preference?.via_line ?? true;
  const viaEmail = preference?.via_email ?? true;
  if (!isEnabled) return;
  if (!viaLine && !viaEmail) return;

  const sentVia = viaLine && viaEmail ? "both" : viaLine ? "line" : "email";

  await supabase.from("notifications").insert({
    staff_id: input.staffId,
    type: preferenceType,
    payload_jsonb: {
      title: input.title,
      body: input.body,
      ...(input.payload ?? {})
    },
    sent_via: sentVia,
    priority: input.priority ?? inferPriority(input.type, input.title, input.body)
  });

  if (viaLine && staff.line_user_id) {
    await pushLineMessage(staff.line_user_id, [
      {
        type: "text",
        text: `${input.title}\n${input.body}`
      }
    ]);
  }

  if (viaEmail && staff.email) {
    await sendEmailNotification({
      to: staff.email,
      subject: input.title,
      text: input.body
    });
  }
}

export async function createNotificationsForStaff(
  supabase: SupabaseLike,
  staffIds: string[],
  input: Omit<StaffNotificationInput, "staffId">
) {
  const uniqueStaffIds = Array.from(new Set(staffIds));
  for (const staffId of uniqueStaffIds) {
    await createStaffNotification(supabase, {
      staffId,
      ...input
    });
  }
}

export async function getNotificationTargetsForStudent(
  supabase: SupabaseLike,
  studentId: string
) {
  const { data: assignees } = await supabase
    .from("student_assignees")
    .select("staff_id")
    .eq("student_id", studentId);

  const staffIds = (assignees ?? []).map((row: { staff_id: string }) => row.staff_id);
  if (staffIds.length > 0) return staffIds;

  const { data: staffUsers } = await supabase
    .from("staff_users")
    .select("id")
    .eq("is_active", true);

  return (staffUsers ?? []).map((row: { id: string }) => row.id);
}

export async function getAdminNotificationTargets(supabase: SupabaseLike) {
  const { data: staffUsers } = await supabase
    .from("staff_users")
    .select("id")
    .eq("role", "admin")
    .eq("is_active", true);

  return (staffUsers ?? []).map((row: { id: string }) => row.id);
}

export function normalizeNotificationType(type: NotificationType) {
  return type === "ai_urgent" ? "urgent_ai_action" : type;
}

function inferPriority(type: NotificationType, title: string, body: string) {
  if (type === "urgent_ai_action" || type === "ai_urgent") return "urgent";
  if (`${title} ${body}`.includes("至急")) return "urgent";
  if (type === "new_friend") return "info";
  return "normal";
}

function getResendFromAddress() {
  return process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
}

async function sendEmailNotification({
  to,
  subject,
  text
}: {
  to: string;
  subject: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.startsWith("your-")) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: getResendFromAddress(),
      to,
      subject,
      text
    })
  });
}
