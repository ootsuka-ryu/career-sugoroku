const ABSOLUTE_SURVEY_URL_PATTERN =
  /https?:\/\/[^\s<>"']*\/survey\/[0-9a-fA-F-]{36}[^\s<>"'）)。、]*/g;
const RELATIVE_SURVEY_URL_PATTERN =
  /(^|[\s(（])((?:\/survey\/[0-9a-fA-F-]{36})[^\s<>"'）)。、]*)/g;

export function personalizeSurveyUrlsInText(text: string, lineUserId: string | null | undefined) {
  if (!text || !lineUserId) return text;

  const withAbsoluteUrls = text.replace(ABSOLUTE_SURVEY_URL_PATTERN, (url) =>
    personalizeSurveyUrl(url, lineUserId)
  );

  return withAbsoluteUrls.replace(RELATIVE_SURVEY_URL_PATTERN, (match, prefix, url) => {
    return `${prefix}${personalizeSurveyUrl(url, lineUserId)}`;
  });
}

export function personalizeSurveyUrl(rawUrl: string, lineUserId: string | null | undefined) {
  if (!rawUrl || !lineUserId) return rawUrl;

  try {
    const isAbsolute = /^https?:\/\//i.test(rawUrl);
    const url = new URL(rawUrl, "https://local.invalid");

    if (!url.pathname.startsWith("/survey/")) return rawUrl;

    url.searchParams.set("source", "personal-line");
    url.searchParams.set("lineUserId", lineUserId);

    return isAbsolute ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return rawUrl;
  }
}
