export type StudentLineStatus =
  | "line_ready"
  | "waiting_reply"
  | "lstep_only"
  | "line_unlinked";

type StudentLineStatusInput = {
  line_user_id: string | null;
  first_contact_method?: string | null;
  last_inbound_at?: string | null;
  last_outbound_at?: string | null;
};

export function getStudentLineStatus(student: StudentLineStatusInput): {
  status: StudentLineStatus;
  label: string;
  tone: "ok" | "warn" | "muted" | "info";
} {
  if (!student.line_user_id) {
    if (student.first_contact_method?.toLowerCase().includes("lステップ")) {
      return {
        status: "lstep_only",
        label: "Lステップ由来のみ",
        tone: "warn"
      };
    }

    return {
      status: "line_unlinked",
      label: "LINE未連携",
      tone: "muted"
    };
  }

  if (isWaitingReply(student.last_inbound_at, student.last_outbound_at)) {
    return {
      status: "waiting_reply",
      label: "返信待ち",
      tone: "info"
    };
  }

  return {
    status: "line_ready",
    label: "LINE送信可能",
    tone: "ok"
  };
}

function isWaitingReply(inbound: string | null | undefined, outbound: string | null | undefined) {
  if (!outbound) return false;
  if (!inbound) return true;
  return new Date(outbound).getTime() > new Date(inbound).getTime();
}
