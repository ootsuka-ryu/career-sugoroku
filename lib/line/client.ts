export type LinePushMessage =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image";
      originalContentUrl: string;
      previewImageUrl: string;
    }
  | {
      type: "video";
      originalContentUrl: string;
      previewImageUrl: string;
    }
  | {
      type: "flex";
      altText: string;
      contents: Record<string, unknown>;
    };

type LineProfile = {
  userId: string;
  displayName?: string;
  pictureUrl?: string;
};

export function hasRealLineToken() {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  return Boolean(token && !token.startsWith("your-"));
}

export async function pushLineMessage(to: string, messages: LinePushMessage[]) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token || token.startsWith("your-")) {
    return {
      ok: true,
      skipped: true,
      reason: "LINE_CHANNEL_ACCESS_TOKEN is not configured."
    };
  }

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ to, messages })
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      ok: false,
      skipped: false,
      reason: body || response.statusText
    };
  }

  return { ok: true, skipped: false, reason: null };
}

export async function getLineProfile(userId: string): Promise<LineProfile | null> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token || token.startsWith("your-")) {
    return null;
  }

  const response = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}
