import { createStaffNotification } from "@/lib/notifications/service";

type SupabaseLike = any;

export type NextActionSuggestion = {
  priority: number;
  reason: string;
  nextAction: string;
  urgency: "low" | "medium" | "high";
  recommendedChannel: "line" | "phone" | "email" | "zoom" | "event";
  tagCandidates: string[];
};

type StudentForAi = {
  id: string;
  display_name: string | null;
  real_name: string | null;
  university: string | null;
  grade: string | null;
  graduation_year: number | null;
  practical_period: string | null;
  desired_job_type: string | null;
  desired_area: string | null;
  motivation_level: number | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  manual_next_action: string | null;
  status: string;
};

export async function updateStudentNextAction({
  supabase,
  studentId
}: {
  supabase: SupabaseLike;
  studentId: string;
}) {
  const [studentResult, actionsResult, messagesResult, recordingsResult, surveysResult] =
    await Promise.all([
      supabase.from("students").select("*").eq("id", studentId).single(),
      supabase
        .from("student_actions")
        .select("action_type, title, body, executed_at")
        .eq("student_id", studentId)
        .order("executed_at", { ascending: false })
        .limit(8),
      supabase
        .from("messages")
        .select("direction, type, payload, sent_at")
        .eq("student_id", studentId)
        .order("sent_at", { ascending: false })
        .limit(8),
      supabase
        .from("recordings")
        .select("ai_summary, ai_next_action, transcript, recorded_at")
        .eq("student_id", studentId)
        .order("recorded_at", { ascending: false })
        .limit(3),
      supabase
        .from("survey_responses")
        .select("raw_answers_jsonb, submitted_at, surveys(title)")
        .eq("student_id", studentId)
        .order("submitted_at", { ascending: false })
        .limit(5)
    ]);

  if (studentResult.error || !studentResult.data) {
    throw new Error(studentResult.error?.message ?? "Student not found");
  }

  const companyContext = await fetchCompanyContext(supabase);
  const suggestion = await suggestNextActionWithClaude({
    student: studentResult.data as StudentForAi,
    actions: actionsResult.data ?? [],
    messages: messagesResult.data ?? [],
    recordings: recordingsResult.data ?? [],
    surveys: surveysResult.data ?? [],
    companyContext
  });

  await supabase
    .from("students")
    .update({
      ai_next_action: formatNextAction(suggestion),
      status:
        suggestion.urgency === "high"
          ? "urgent_follow_up"
          : studentResult.data.status
    })
    .eq("id", studentId);

  await supabase.from("student_actions").insert({
    student_id: studentId,
    staff_id: null,
    action_type: "ai",
    title: "AI next action suggestion",
    body: [
      `Priority: ${suggestion.priority}`,
      `Urgency: ${suggestion.urgency}`,
      `Channel: ${suggestion.recommendedChannel}`,
      `Reason: ${suggestion.reason}`,
      `Next action: ${suggestion.nextAction}`,
      `Tags: ${suggestion.tagCandidates.join(", ")}`
    ].join("\n"),
    executed_at: new Date().toISOString()
  });

  if (suggestion.urgency === "high") {
    await createUrgentNotifications(supabase, studentId, suggestion);
  }

  return suggestion;
}

export async function runNextActionBatch({
  supabase,
  limit = 50
}: {
  supabase: SupabaseLike;
  limit?: number;
}) {
  const { data, error } = await supabase
    .from("students")
    .select("id, ai_next_action, last_inbound_at, last_outbound_at, updated_at")
    .neq("status", "archived")
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (error) throw error;

  const results = [];
  for (const student of data ?? []) {
    try {
      const suggestion = await updateStudentNextAction({
        supabase,
        studentId: student.id
      });
      results.push({ studentId: student.id, ok: true, suggestion });
    } catch (error) {
      results.push({
        studentId: student.id,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  return results;
}

async function suggestNextActionWithClaude({
  student,
  actions,
  messages,
  recordings,
  surveys,
  companyContext
}: {
  student: StudentForAi;
  actions: unknown[];
  messages: unknown[];
  recordings: unknown[];
  surveys: unknown[];
  companyContext: string;
}): Promise<NextActionSuggestion> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.startsWith("your-")) {
    return buildMockSuggestion(student);
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5",
      max_tokens: 900,
      system:
        "You are an assistant for Japanese new graduate pharmacist recruiting. Return strict JSON only with keys priority, reason, nextAction, urgency, recommendedChannel, tagCandidates.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  companyContext,
                  student,
                  recentActions: actions,
                  recentMessages: messages,
                  recentRecordings: recordings,
                  recentSurveyResponses: surveys,
                  instruction:
                    "学生の状況から、採用担当者が次に行うべき1つの行動を日本語で提案してください。priorityは1から100で、100が最優先です。"
                },
                null,
                2
              )
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    return {
      priority: 50,
      reason: "Claude APIの呼び出しに失敗しました。APIキーとモデル名を確認してください。",
      nextAction: "AI提案を再実行してください。",
      urgency: "medium",
      recommendedChannel: "line",
      tagCandidates: ["AI確認"]
    };
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content?.find((item) => item.type === "text")?.text ?? "";

  try {
    const parsed = JSON.parse(text) as Partial<NextActionSuggestion>;
    return normalizeSuggestion(parsed, student);
  } catch {
    return {
      priority: 45,
      reason: "Claudeの応答をJSONとして読めませんでした。",
      nextAction: text || "学生詳細を確認し、次の連絡内容を手動で決めてください。",
      urgency: "medium",
      recommendedChannel: "line",
      tagCandidates: ["AI確認"]
    };
  }
}

async function fetchCompanyContext(supabase: SupabaseLike) {
  const { data } = await supabase
    .from("company_resources")
    .select("title, body_markdown")
    .eq("is_ai_context", true)
    .limit(10);

  return (data ?? [])
    .map((resource: { title: string; body_markdown: string }) => {
      return `# ${resource.title}\n${resource.body_markdown}`;
    })
    .join("\n\n");
}

function buildMockSuggestion(student: StudentForAi): NextActionSuggestion {
  const daysFromInbound = daysSince(student.last_inbound_at);
  const daysFromOutbound = daysSince(student.last_outbound_at);
  const waitingReply =
    student.last_outbound_at &&
    (!student.last_inbound_at ||
      new Date(student.last_outbound_at) > new Date(student.last_inbound_at));

  if (waitingReply && (daysFromOutbound ?? 0) >= 7) {
    return {
      priority: 85,
      reason: "こちらから連絡後、7日以上返信がないため、軽いリマインドが必要です。",
      nextAction: "LINEで近況確認と次回イベント案内を短く送ってください。",
      urgency: "high",
      recommendedChannel: "line",
      tagCandidates: ["返信待ち"]
    };
  }

  if ((student.motivation_level ?? 0) >= 4) {
    return {
      priority: 78,
      reason: "志望度が高いため、熱が冷める前に個別接点を作るとよい状態です。",
      nextAction: "担当者からLINEで個別面談または店舗見学の日程候補を送ってください。",
      urgency: "medium",
      recommendedChannel: "line",
      tagCandidates: ["高志望度"]
    };
  }

  if (daysFromInbound === null || daysFromInbound >= 14) {
    return {
      priority: 62,
      reason: "最近の接触が少ないため、関心が薄れる前に接点を作る必要があります。",
      nextAction: "直近イベントの案内を送り、興味のあるテーマを1つ質問してください。",
      urgency: "medium",
      recommendedChannel: "line",
      tagCandidates: ["接触不足"]
    };
  }

  return {
    priority: 40,
    reason: "大きな緊急対応はありません。次の自然な接点を作る段階です。",
    nextAction: "次回の案内配信時に反応を見て、必要なら個別フォローしてください。",
    urgency: "low",
    recommendedChannel: "line",
    tagCandidates: []
  };
}

function normalizeSuggestion(
  parsed: Partial<NextActionSuggestion>,
  student: StudentForAi
): NextActionSuggestion {
  const fallback = buildMockSuggestion(student);
  const urgency = ["low", "medium", "high"].includes(parsed.urgency ?? "")
    ? parsed.urgency
    : fallback.urgency;
  const channel = ["line", "phone", "email", "zoom", "event"].includes(
    parsed.recommendedChannel ?? ""
  )
    ? parsed.recommendedChannel
    : fallback.recommendedChannel;

  return {
    priority:
      typeof parsed.priority === "number"
        ? Math.max(1, Math.min(100, Math.round(parsed.priority)))
        : fallback.priority,
    reason: parsed.reason || fallback.reason,
    nextAction: parsed.nextAction || fallback.nextAction,
    urgency: urgency as NextActionSuggestion["urgency"],
    recommendedChannel: channel as NextActionSuggestion["recommendedChannel"],
    tagCandidates: Array.isArray(parsed.tagCandidates)
      ? parsed.tagCandidates.map(String).slice(0, 6)
      : fallback.tagCandidates
  };
}

function formatNextAction(suggestion: NextActionSuggestion) {
  return [
    `優先度 ${suggestion.priority} / ${suggestion.urgency}`,
    `理由: ${suggestion.reason}`,
    `次アクション: ${suggestion.nextAction}`,
    `推奨連絡手段: ${suggestion.recommendedChannel}`
  ].join("\n");
}

async function createUrgentNotifications(
  supabase: SupabaseLike,
  studentId: string,
  suggestion: NextActionSuggestion
) {
  const { data: assignees } = await supabase
    .from("student_assignees")
    .select("staff_id")
    .eq("student_id", studentId);

  for (const assignee of assignees ?? []) {
    await createStaffNotification(supabase, {
      staffId: assignee.staff_id,
      type: "urgent_ai_action",
      title: "AIが至急対応を検知しました",
      body: `${suggestion.reason}\n次アクション: ${suggestion.nextAction}`,
      payload: {
        student_id: studentId,
        reason: suggestion.reason,
        next_action: suggestion.nextAction
      }
    });
  }
}

function daysSince(value: string | null) {
  if (!value) return null;
  return Math.floor(
    (Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24)
  );
}
