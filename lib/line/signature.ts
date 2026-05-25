import { createHmac, timingSafeEqual } from "crypto";

export function verifyLineSignature(body: string, signature: string | null) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  if (!channelSecret || channelSecret.startsWith("your-")) {
    return {
      ok: process.env.NODE_ENV !== "production",
      reason: "LINE_CHANNEL_SECRET is not configured."
    };
  }

  if (!signature) {
    return { ok: false, reason: "Missing x-line-signature header." };
  }

  const expected = createHmac("sha256", channelSecret).update(body).digest("base64");
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== actualBuffer.length) {
    return { ok: false, reason: "Invalid signature length." };
  }

  return {
    ok: timingSafeEqual(expectedBuffer, actualBuffer),
    reason: "Signature mismatch."
  };
}
