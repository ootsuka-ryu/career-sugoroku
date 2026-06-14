import { createHmac, timingSafeEqual } from "crypto";

export function verifyLineSignature(body: string, signature: string | null) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  if (!channelSecret || channelSecret.startsWith("your-")) {
    return {
      ok: process.env.NODE_ENV !== "production",
      reason:
        "LINE_CHANNEL_SECRET が未設定です。Cloudflare Workers の Variables and Secrets に本番用のChannel secretを登録してください。"
    };
  }

  if (!signature) {
    return {
      ok: false,
      reason: "x-line-signatureヘッダーがありません。LINEからのWebhookではない可能性があります。"
    };
  }

  const expected = createHmac("sha256", channelSecret).update(body).digest("base64");
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== actualBuffer.length) {
    return { ok: false, reason: "LINE署名の長さが一致しません。" };
  }

  return {
    ok: timingSafeEqual(expectedBuffer, actualBuffer),
    reason: "LINE署名が一致しません。Channel secretまたはWebhook送信元を確認してください。"
  };
}
