export type RecordingSummary = {
  summary: string;
  nextActions: string[];
  tagCandidates: string[];
  urgent: boolean;
};

export async function summarizeRecordingWithClaude({
  transcript,
  companyContext
}: {
  transcript: string;
  companyContext: string;
}): Promise<RecordingSummary> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.startsWith("your-")) {
    return {
      summary:
        "Claude API is not configured yet. This is a placeholder summary for the uploaded recording.",
      nextActions: [
        "面談内容を確認する",
        "学生の希望条件をプロフィールに反映する",
        "次回連絡日を設定する"
      ],
      tagCandidates: ["Needs Review"],
      urgent: false
    };
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 900,
      system:
        "You summarize Japanese pharmacist recruiting interviews. Return strict JSON with keys summary, nextActions, tagCandidates, urgent.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Company context:\n${companyContext || "(none)"}\n\nTranscript:\n${transcript}`
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    return {
      summary: "Claude summarization failed. Please retry after checking the API key.",
      nextActions: ["要約を再実行する"],
      tagCandidates: [],
      urgent: false
    };
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content?.find((item) => item.type === "text")?.text ?? "";

  try {
    const parsed = JSON.parse(text) as RecordingSummary;
    return {
      summary: parsed.summary ?? "",
      nextActions: Array.isArray(parsed.nextActions) ? parsed.nextActions : [],
      tagCandidates: Array.isArray(parsed.tagCandidates) ? parsed.tagCandidates : [],
      urgent: Boolean(parsed.urgent)
    };
  } catch {
    return {
      summary: text || "Claude returned an empty response.",
      nextActions: [],
      tagCandidates: [],
      urgent: false
    };
  }
}
