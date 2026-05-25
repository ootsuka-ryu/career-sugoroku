export type LineWebhookPayload = {
  destination?: string;
  events?: LineWebhookEvent[];
};

export type LineWebhookEvent = {
  type: "message" | "follow" | "unfollow" | "postback" | string;
  timestamp: number;
  source?: {
    type: "user" | "group" | "room";
    userId?: string;
  };
  replyToken?: string;
  message?: {
    id?: string;
    type: string;
    text?: string;
    [key: string]: unknown;
  };
  postback?: {
    data: string;
    params?: Record<string, string>;
  };
};

export function lineMessageTypeToDbType(type: string) {
  if (
    [
      "text",
      "image",
      "sticker",
      "file",
      "audio",
      "video",
      "location"
    ].includes(type)
  ) {
    return type;
  }

  return "unknown";
}
