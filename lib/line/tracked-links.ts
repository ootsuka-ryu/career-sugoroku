const DEFAULT_APP_BASE_URL = "https://pharmacy-student-line-crm.ootsuka-r.workers.dev";
const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;
const TRAILING_PUNCTUATION_PATTERN = /[。、，,.!?！？）)\]】]+$/;

type TrackingContext = {
  studentId?: string | null;
  lineUserId?: string | null;
  label?: string | null;
  source?: string | null;
};

export function trackUrlForLineClick(rawUrl: string, context: TrackingContext = {}) {
  const normalized = normalizeHttpUrl(rawUrl);
  if (!normalized) return rawUrl;
  if (isTrackedClickUrl(normalized)) return normalized;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_BASE_URL;
  const trackingUrl = new URL("/api/line/track-click", baseUrl);
  trackingUrl.searchParams.set("u", normalized);

  if (context.studentId) trackingUrl.searchParams.set("studentId", context.studentId);
  if (context.lineUserId) trackingUrl.searchParams.set("lineUserId", context.lineUserId);
  if (context.source) trackingUrl.searchParams.set("source", context.source);
  trackingUrl.searchParams.set("label", truncateLabel(context.label || inferLinkLabel(normalized)));

  return trackingUrl.toString();
}

export function trackUrlsInTextForLineClicks(text: string, context: TrackingContext = {}) {
  if (!text) return text;

  return text.replace(URL_PATTERN, (match) => {
    const { url, trailing } = splitTrailingPunctuation(match);
    return `${trackUrlForLineClick(url, context)}${trailing}`;
  });
}

function normalizeHttpUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function isTrackedClickUrl(url: string) {
  try {
    return new URL(url).pathname === "/api/line/track-click";
  } catch {
    return false;
  }
}

function splitTrailingPunctuation(value: string) {
  const match = value.match(TRAILING_PUNCTUATION_PATTERN);
  if (!match) return { url: value, trailing: "" };

  return {
    url: value.slice(0, -match[0].length),
    trailing: match[0]
  };
}

function inferLinkLabel(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith("/survey/")) return "回答フォーム";
    return parsed.hostname.replace(/^www\./, "") || "リンク";
  } catch {
    return "リンク";
  }
}

function truncateLabel(label: string) {
  const trimmed = label.trim();
  return trimmed.length > 80 ? trimmed.slice(0, 80) : trimmed || "リンク";
}
