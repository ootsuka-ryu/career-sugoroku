export type TranscriptionResult = {
  provider: "groq" | "openai" | "mock";
  transcript: string;
};

export async function transcribeAudioFile(file: File): Promise<TranscriptionResult> {
  if (hasRealEnv("GROQ_API_KEY")) {
    const result = await transcribeWithOpenAICompatibleApi({
      endpoint: "https://api.groq.com/openai/v1/audio/transcriptions",
      apiKey: process.env.GROQ_API_KEY!,
      model: "whisper-large-v3-turbo",
      file
    });

    if (result) return { provider: "groq", transcript: result };
  }

  if (hasRealEnv("OPENAI_API_KEY")) {
    const result = await transcribeWithOpenAICompatibleApi({
      endpoint: "https://api.openai.com/v1/audio/transcriptions",
      apiKey: process.env.OPENAI_API_KEY!,
      model: "whisper-1",
      file
    });

    if (result) return { provider: "openai", transcript: result };
  }

  return {
    provider: "mock",
    transcript:
      "文字起こしAPIが未設定です。Cloudflare Workers の Variables and Secrets に GROQ_API_KEY を追加すると自動文字起こしできます。"
  };
}

async function transcribeWithOpenAICompatibleApi({
  endpoint,
  apiKey,
  model,
  file
}: {
  endpoint: string;
  apiKey: string;
  model: string;
  file: File;
}) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("model", model);
  formData.append("language", "ja");
  formData.append("response_format", "json");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: formData
  }).catch(() => null);

  if (!response) return null;

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as { text?: string };
  return json.text ?? null;
}

function hasRealEnv(name: string) {
  const value = process.env[name];
  return Boolean(value && !value.startsWith("your-"));
}
