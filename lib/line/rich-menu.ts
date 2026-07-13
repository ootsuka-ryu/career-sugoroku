type RichMenuAreaAction = {
  id?: string;
  type?: "url" | "tel" | "message" | "survey" | "none";
  value?: string;
  xPct?: number;
  yPct?: number;
  widthPct?: number;
  heightPct?: number;
};

type RichMenuLayout = {
  chat_bar_text?: string;
  actions?: RichMenuAreaAction[];
};

type RichMenuRecord = {
  id: string;
  name: string;
  image_url: string | null;
  is_default: boolean;
  target_tag_ids: unknown;
  layout_jsonb: unknown;
  line_rich_menu_id?: string | null;
};

export type RichMenuSyncResult = {
  ok: boolean;
  lineRichMenuId?: string;
  linkedUsers?: number;
  message: string;
};

const LINE_RICH_MENU_SIZE = {
  width: 2500,
  height: 1686
};

export async function syncRichMenuToLine({
  menu,
  baseUrl,
  lineAccessToken,
  supabase
}: {
  menu: RichMenuRecord;
  baseUrl: string;
  lineAccessToken: string | undefined;
  supabase: any;
}): Promise<RichMenuSyncResult> {
  if (!lineAccessToken || lineAccessToken.startsWith("your-")) {
    return {
      ok: false,
      message: "LINE_CHANNEL_ACCESS_TOKEN が設定されていません。"
    };
  }

  if (!menu.image_url) {
    return { ok: false, message: "リッチメニュー画像を選択してください。" };
  }

  const layout = isRecord(menu.layout_jsonb) ? (menu.layout_jsonb as RichMenuLayout) : {};
  const areas = buildLineAreas(
    layout,
    baseUrl,
    process.env.LINE_LIFF_ID ?? process.env.NEXT_PUBLIC_LINE_LIFF_ID
  );
  if (areas.length === 0) {
    return { ok: false, message: "タップ領域のアクションを1つ以上設定してください。" };
  }

  const created = await createLineRichMenu({
    lineAccessToken,
    name: menu.name,
    chatBarText: layout.chat_bar_text || "メニュー",
    areas
  });

  if (!created.ok) return created;

  const image = await fetchRichMenuImage(menu.image_url);
  if (!image.ok) {
    await deleteLineRichMenu(lineAccessToken, created.lineRichMenuId);
    return { ok: false, message: image.message };
  }

  const uploaded = await uploadLineRichMenuImage({
    lineAccessToken,
    lineRichMenuId: created.lineRichMenuId,
    bytes: image.bytes,
    contentType: image.contentType
  });

  if (!uploaded.ok) {
    await deleteLineRichMenu(lineAccessToken, created.lineRichMenuId);
    return uploaded;
  }

  if (menu.line_rich_menu_id) {
    await deleteLineRichMenu(lineAccessToken, menu.line_rich_menu_id);
  }

  const targetTagIds = parseStringArray(menu.target_tag_ids);
  let linkedUsers = 0;
  if (targetTagIds.length > 0) {
    linkedUsers = await linkRichMenuToTaggedStudents({
      lineAccessToken,
      lineRichMenuId: created.lineRichMenuId,
      supabase,
      tagIds: targetTagIds
    });
  } else if (menu.is_default) {
    const defaulted = await setDefaultLineRichMenu(lineAccessToken, created.lineRichMenuId);
    if (!defaulted.ok) return defaulted;
  }

  return {
    ok: true,
    lineRichMenuId: created.lineRichMenuId,
    linkedUsers,
    message:
      targetTagIds.length > 0
        ? `LINEに反映しました。対象タグの${linkedUsers}名に個別リンクしました。`
        : menu.is_default
          ? "LINEに反映し、デフォルトリッチメニューに設定しました。"
          : "LINEに反映しました。デフォルト設定または対象タグがないため、まだ学生には表示されません。"
  };
}

export async function deleteLineRichMenu(lineAccessToken: string | undefined, richMenuId: string | null | undefined) {
  if (!lineAccessToken || !richMenuId) return;
  await fetch(`https://api.line.me/v2/bot/richmenu/${richMenuId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${lineAccessToken}`
    }
  });
}

function buildLineAreas(layout: RichMenuLayout, baseUrl: string, liffId?: string) {
  return (layout.actions ?? [])
    .map((area) => {
      const action = buildLineAction(area, baseUrl, liffId);
      if (!action) return null;

      return {
        bounds: {
          x: toPixel(area.xPct, LINE_RICH_MENU_SIZE.width),
          y: toPixel(area.yPct, LINE_RICH_MENU_SIZE.height),
          width: Math.max(1, toPixel(area.widthPct, LINE_RICH_MENU_SIZE.width)),
          height: Math.max(1, toPixel(area.heightPct, LINE_RICH_MENU_SIZE.height))
        },
        action
      };
    })
    .filter(Boolean);
}

function buildLineAction(area: RichMenuAreaAction, baseUrl: string, liffId?: string) {
  const value = (area.value ?? "").trim();

  if (area.type === "message") {
    return { type: "message", text: value || "問い合わせ" };
  }

  if (area.type === "tel") {
    const normalized = value.replace(/[^\d+]/g, "");
    if (!normalized) return null;
    return { type: "uri", uri: `tel:${normalized}` };
  }

  if (area.type === "survey") {
    if (!value) return null;
    return { type: "uri", uri: buildSurveyUri(value, baseUrl, liffId) };
  }

  if (area.type === "url") {
    if (!/^https?:\/\//i.test(value)) return null;
    return { type: "uri", uri: value };
  }

  return null;
}

function buildSurveyUri(surveyId: string, baseUrl: string, liffId?: string) {
  if (liffId?.trim()) {
    return `https://liff.line.me/${encodeURIComponent(liffId.trim())}/${encodeURIComponent(surveyId)}?source=rich-menu`;
  }

  return `${baseUrl.replace(/\/$/, "")}/survey/${encodeURIComponent(surveyId)}?source=rich-menu`;
}

async function createLineRichMenu({
  lineAccessToken,
  name,
  chatBarText,
  areas
}: {
  lineAccessToken: string;
  name: string;
  chatBarText: string;
  areas: unknown[];
}): Promise<RichMenuSyncResult & { lineRichMenuId: string }> {
  const response = await fetch("https://api.line.me/v2/bot/richmenu", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lineAccessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      size: LINE_RICH_MENU_SIZE,
      selected: true,
      name: name.slice(0, 300),
      chatBarText: (chatBarText || "メニュー").slice(0, 14),
      areas
    })
  });

  if (!response.ok) {
    return {
      ok: false,
      lineRichMenuId: "",
      message: `LINEリッチメニュー作成に失敗しました: ${await response.text()}`
    };
  }

  const body = await response.json() as { richMenuId: string };
  return {
    ok: true,
    lineRichMenuId: body.richMenuId,
    message: "LINEリッチメニューを作成しました。"
  };
}

async function uploadLineRichMenuImage({
  lineAccessToken,
  lineRichMenuId,
  bytes,
  contentType
}: {
  lineAccessToken: string;
  lineRichMenuId: string;
  bytes: ArrayBuffer;
  contentType: string;
}): Promise<RichMenuSyncResult> {
  const response = await fetch(`https://api-data.line.me/v2/bot/richmenu/${lineRichMenuId}/content`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lineAccessToken}`,
      "Content-Type": contentType
    },
    body: bytes
  });

  if (!response.ok) {
    return {
      ok: false,
      message: `LINEへの画像アップロードに失敗しました: ${await response.text()}`
    };
  }

  return { ok: true, message: "画像をアップロードしました。" };
}

async function setDefaultLineRichMenu(
  lineAccessToken: string,
  lineRichMenuId: string
): Promise<RichMenuSyncResult> {
  const response = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${lineRichMenuId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lineAccessToken}`
    }
  });

  if (!response.ok) {
    return {
      ok: false,
      message: `デフォルトリッチメニュー設定に失敗しました: ${await response.text()}`
    };
  }

  return { ok: true, message: "デフォルトリッチメニューに設定しました。" };
}

async function linkRichMenuToTaggedStudents({
  lineAccessToken,
  lineRichMenuId,
  supabase,
  tagIds
}: {
  lineAccessToken: string;
  lineRichMenuId: string;
  supabase: any;
  tagIds: string[];
}) {
  const { data } = await supabase
    .from("student_tags")
    .select("students(line_user_id)")
    .in("tag_id", tagIds);

  const lineUserIds: string[] = Array.from(
    new Set(
      (data ?? [])
        .map((row: any) => normalizeJoined(row.students)?.line_user_id)
        .filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
    )
  );

  let linked = 0;
  for (const lineUserId of lineUserIds) {
    const response = await fetch(
      `https://api.line.me/v2/bot/user/${encodeURIComponent(lineUserId)}/richmenu/${lineRichMenuId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lineAccessToken}`
        }
      }
    );
    if (response.ok) linked += 1;
  }

  return linked;
}

async function fetchRichMenuImage(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    return { ok: false as const, message: `画像を取得できませんでした: ${response.status}` };
  }

  const contentType = response.headers.get("content-type")?.split(";")[0] ?? "";
  if (!["image/jpeg", "image/png"].includes(contentType)) {
    return {
      ok: false as const,
      message: "LINEリッチメニュー画像は jpg または png を選んでください。"
    };
  }

  return {
    ok: true as const,
    bytes: await response.arrayBuffer(),
    contentType
  };
}

function toPixel(value: unknown, size: number) {
  const numberValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.round((numberValue / 100) * size));
}

function parseStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function normalizeJoined(value: any) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
