"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Plus,
  Save,
  Search,
  Trash2
} from "lucide-react";
import {
  deleteRichMenu,
  saveRichMenu,
  type RichMenuActionState
} from "@/app/(dashboard)/rich-menus/actions";
import { SurveyMediaPicker } from "@/components/surveys/survey-media-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type TagItem = {
  id: string;
  name: string;
  color: string;
};

type SurveyItem = {
  id: string;
  title: string;
  admin_title: string | null;
};

type RichMenuItem = {
  id: string;
  name: string;
  image_url: string | null;
  is_default: boolean;
  target_tag_ids: unknown;
  layout_jsonb: unknown;
  created_at: string;
  updated_at: string;
};

type ActionType = "url" | "tel" | "message" | "survey" | "none";

type AreaAction = {
  id: string;
  label: string;
  type: ActionType;
  value: string;
};

type TemplateItem = {
  id: string;
  name: string;
  columns: number;
  rows: number;
  areas: Array<{ id: string; x: number; y: number; width: number; height: number }>;
};

type Draft = {
  id?: string;
  name: string;
  imageUrl: string;
  chatBarText: string;
  isDefault: boolean;
  templateId: string;
  targetTagIds: string[];
  actions: AreaAction[];
};

const initialState: RichMenuActionState = {
  ok: false,
  message: ""
};

const templates: TemplateItem[] = [
  makeGridTemplate("grid-2x3", "2 x 3", 3, 2),
  makeGridTemplate("grid-2x2", "2 x 2", 2, 2),
  makeGridTemplate("grid-1x3", "1 x 3", 3, 1),
  makeGridTemplate("grid-1x2", "1 x 2", 2, 1),
  makeGridTemplate("grid-3x3", "3 x 3", 3, 3),
  {
    id: "top-wide-bottom-3",
    name: "上段大 + 下3",
    columns: 3,
    rows: 2,
    areas: [
      { id: "area-1", x: 0, y: 0, width: 3, height: 1 },
      { id: "area-2", x: 0, y: 1, width: 1, height: 1 },
      { id: "area-3", x: 1, y: 1, width: 1, height: 1 },
      { id: "area-4", x: 2, y: 1, width: 1, height: 1 }
    ]
  },
  {
    id: "left-wide-right-2",
    name: "左大 + 右2",
    columns: 3,
    rows: 2,
    areas: [
      { id: "area-1", x: 0, y: 0, width: 2, height: 2 },
      { id: "area-2", x: 2, y: 0, width: 1, height: 1 },
      { id: "area-3", x: 2, y: 1, width: 1, height: 1 }
    ]
  }
];

export function RichMenuAdmin({
  menus,
  tags,
  surveys
}: {
  menus: RichMenuItem[];
  tags: TagItem[];
  surveys: SurveyItem[];
}) {
  const [mode, setMode] = useState<"list" | "form">("list");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Draft>(() => createDraft());
  const [createOpen, setCreateOpen] = useState(false);

  const filteredMenus = menus.filter((menu) =>
    menu.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  function startCreate() {
    setDraft(createDraft());
    setMode("form");
    setCreateOpen(false);
  }

  function startEdit(menu: RichMenuItem) {
    setDraft(toDraft(menu));
    setMode("form");
  }

  if (mode === "form") {
    return (
      <RichMenuForm
        draft={draft}
        menus={menus}
        onBack={() => setMode("list")}
        setDraft={setDraft}
        surveys={surveys}
        tags={tags}
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-md border bg-white">
        <div className="border-b p-3">
          <Button className="w-full" type="button" variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            新しいフォルダ
          </Button>
        </div>
        <button className="flex w-full items-center justify-between bg-amber-50 px-4 py-3 text-sm font-medium">
          <span>📁 未分類</span>
          <span>{menus.length}</span>
        </button>
      </aside>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative">
            <Button
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={() => setCreateOpen((current) => !current)}
              type="button"
            >
              <Plus className="mr-2 h-4 w-4" />
              新しいリッチメニュー
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
            {createOpen ? (
              <div className="absolute left-0 top-11 z-20 w-64 rounded-md border bg-white py-2 shadow-lg">
                <button
                  className="block w-full px-4 py-3 text-left text-sm hover:bg-slate-50"
                  onClick={startCreate}
                  type="button"
                >
                  画像をアップロードして作成
                </button>
                <button
                  className="block w-full px-4 py-3 text-left text-sm hover:bg-slate-50"
                  onClick={startCreate}
                  type="button"
                >
                  テンプレートをベースに作成
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex flex-1 justify-end gap-2">
            <Button type="button" variant="outline">
              ↕ 並び替え
            </Button>
            <div className="relative min-w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="検索"
                value={query}
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-md border bg-white">
          <div className="grid grid-cols-[2rem_1.5fr_1fr_1fr_1fr_1fr] bg-slate-100 px-4 py-3 text-sm font-medium text-slate-600">
            <span></span>
            <span>リッチメニュー名</span>
            <span>メニュー初期状態</span>
            <span>画像</span>
            <span>対象タグ</span>
            <span>操作</span>
          </div>
          {filteredMenus.length > 0 ? (
            filteredMenus.map((menu) => (
              <div
                className="grid grid-cols-[2rem_1.5fr_1fr_1fr_1fr_1fr] items-center border-t px-4 py-3 text-sm"
                key={menu.id}
              >
                <input type="checkbox" />
                <button
                  className="text-left font-medium text-blue-700 underline-offset-2 hover:underline"
                  onClick={() => startEdit(menu)}
                  type="button"
                >
                  {menu.name}
                </button>
                <span>{menu.is_default ? "表示する" : "表示しない"}</span>
                <span>
                  {menu.image_url ? (
                    <img
                      alt={menu.name}
                      className="h-12 w-20 rounded border object-cover"
                      src={menu.image_url}
                    />
                  ) : (
                    "-"
                  )}
                </span>
                <span>{formatTargetTags(menu.target_tag_ids, tags)}</span>
                <div className="flex gap-2">
                  <Button onClick={() => startEdit(menu)} size="sm" type="button" variant="outline">
                    編集
                  </Button>
                  <DeleteMenuButton menuId={menu.id} />
                </div>
              </div>
            ))
          ) : (
            <div className="border-t px-4 py-10 text-center text-sm text-muted-foreground">
              リッチメニューが作成されていません
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function RichMenuForm({
  draft,
  setDraft,
  onBack,
  tags,
  surveys,
  menus
}: {
  draft: Draft;
  setDraft: (updater: Draft | ((current: Draft) => Draft)) => void;
  onBack: () => void;
  tags: TagItem[];
  surveys: SurveyItem[];
  menus: RichMenuItem[];
}) {
  const [state, action] = useFormState(saveRichMenu, initialState);
  const template = templates.find((item) => item.id === draft.templateId) ?? templates[0];
  const layoutJson = useMemo(
    () =>
      JSON.stringify({
        template_id: draft.templateId,
        chat_bar_text: draft.chatBarText,
        actions: draft.actions
      }),
    [draft]
  );

  return (
    <form action={action} className="space-y-6">
      <input name="rich_menu_id" type="hidden" value={draft.id ?? ""} />
      <input name="image_url" type="hidden" value={draft.imageUrl} />
      <input name="layout_json" type="hidden" value={layoutJson} />
      <input name="target_tag_ids_json" type="hidden" value={JSON.stringify(draft.targetTagIds)} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">リッチメニュー登録</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            画像、テンプレート、タップ領域ごとの動きを設定します。
          </p>
        </div>
        <Button onClick={onBack} type="button" variant="outline">
          一覧へ戻る
        </Button>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr_500px]">
        <div className="space-y-6">
          <FieldRow label="画像">
            <SurveyMediaPicker
              name="unused_image_picker"
              onChange={(value) => setDraft((current) => ({ ...current, imageUrl: value }))}
              value={draft.imageUrl}
            />
          </FieldRow>

          <FieldRow label="タイトル" required>
            <Input
              name="name"
              onChange={(event) =>
                setDraft((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="管理画面に表示する名前"
              required
              value={draft.name}
            />
          </FieldRow>

          <FieldRow label="トークルームメニュー" required>
            <Input
              maxLength={14}
              onChange={(event) =>
                setDraft((current) => ({ ...current, chatBarText: event.target.value }))
              }
              placeholder="メニュー"
              value={draft.chatBarText}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              トークルーム下部に表示されるテキストです。14文字以内が目安です。
            </p>
          </FieldRow>

          <FieldRow label="メニューの初期状態">
            <div className="flex gap-5 text-sm">
              <label className="flex items-center gap-2">
                <input
                  checked={!draft.isDefault}
                  name="is_default_radio"
                  onChange={() => setDraft((current) => ({ ...current, isDefault: false }))}
                  type="radio"
                />
                表示しない
              </label>
              <label className="flex items-center gap-2">
                <input
                  checked={draft.isDefault}
                  name="is_default_radio"
                  onChange={() => setDraft((current) => ({ ...current, isDefault: true }))}
                  type="radio"
                />
                表示する
              </label>
            </div>
            {draft.isDefault ? <input name="is_default" type="hidden" value="on" /> : null}
          </FieldRow>

          <FieldRow label="対象タグ">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm",
                    draft.targetTagIds.includes(tag.id)
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "bg-white"
                  )}
                  key={tag.id}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      targetTagIds: current.targetTagIds.includes(tag.id)
                        ? current.targetTagIds.filter((id) => id !== tag.id)
                        : [...current.targetTagIds, tag.id]
                    }))
                  }
                  type="button"
                >
                  {tag.name}
                </button>
              ))}
              {tags.length === 0 ? (
                <p className="text-sm text-muted-foreground">タグがまだありません。</p>
              ) : null}
            </div>
          </FieldRow>

          <FieldRow label="テンプレート">
            <div className="flex flex-wrap gap-3">
              {templates.map((item) => (
                <button
                  className={cn(
                    "rounded border p-2",
                    draft.templateId === item.id ? "border-blue-600 bg-blue-50" : "bg-white"
                  )}
                  key={item.id}
                  onClick={() =>
                    setDraft((current) => normalizeDraftActions({ ...current, templateId: item.id }))
                  }
                  type="button"
                >
                  <MiniTemplate template={item} />
                  <p className="mt-1 text-xs">{item.name}</p>
                </button>
              ))}
            </div>
          </FieldRow>

          <FieldRow label="コンテンツ設定">
            <div className="space-y-3">
              {template.areas.map((area, index) => {
                const currentAction =
                  draft.actions.find((item) => item.id === area.id) ?? createAreaAction(area.id, index);
                return (
                  <AreaActionEditor
                    action={currentAction}
                    index={index}
                    key={area.id}
                    setDraft={setDraft}
                    surveys={surveys}
                  />
                );
              })}
            </div>
          </FieldRow>

          <div className="rounded border bg-slate-50 px-4 py-3 text-sm">
            ※リッチメニューは保存しただけではLINE上の友だちに反映されません。LINE接続後に反映処理を追加します。
          </div>
        </div>

        <aside className="space-y-3">
          <h3 className="font-semibold">プレビュー</h3>
          <div className="rounded border bg-slate-100 p-3">
            <div className="rounded bg-white p-3 shadow-sm">
              <div className="mb-2 rounded-full bg-white px-3 py-2 text-sm shadow">
                トーク画面下にメニューが表示されます
              </div>
              <div className="relative overflow-hidden rounded border bg-slate-200" style={{ aspectRatio: "3 / 2" }}>
                {draft.imageUrl ? (
                  <img alt="リッチメニュープレビュー" className="h-full w-full object-cover" src={draft.imageUrl} />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    メニュー画像を選択してください
                  </div>
                )}
                {template.areas.map((area, index) => (
                  <div
                    className="absolute border-2 border-red-500 bg-red-500/20 text-center text-xs font-semibold text-white"
                    key={area.id}
                    style={{
                      left: `${(area.x / template.columns) * 100}%`,
                      top: `${(area.y / template.rows) * 100}%`,
                      width: `${(area.width / template.columns) * 100}%`,
                      height: `${(area.height / template.rows) * 100}%`
                    }}
                  >
                    {index + 1}
                  </div>
                ))}
              </div>
              <div className="border-x border-b bg-white py-3 text-center text-sm">
                {draft.chatBarText || "メニュー"}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <FormMessage state={state} />
      <div className="sticky bottom-0 -mx-6 flex justify-center border-t bg-white/95 p-4">
        <SubmitButton />
      </div>
    </form>
  );
}

function AreaActionEditor({
  action,
  index,
  setDraft,
  surveys
}: {
  action: AreaAction;
  index: number;
  setDraft: (updater: Draft | ((current: Draft) => Draft)) => void;
  surveys: SurveyItem[];
}) {
  function update(next: Partial<AreaAction>) {
    setDraft((current) => ({
      ...current,
      actions: current.actions.map((item) =>
        item.id === action.id ? { ...item, ...next } : item
      )
    }));
  }

  return (
    <div className="rounded-md border bg-white">
      <div className="flex items-center justify-between bg-slate-100 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">ボタン{index + 1}</span>
          <Badge variant="outline">領域編集</Badge>
        </div>
        <div className="flex gap-1">
          <Button size="sm" type="button" variant="ghost">
            <ChevronUp className="mr-1 h-4 w-4" />
            上へ
          </Button>
          <Button size="sm" type="button" variant="ghost">
            <ChevronDown className="mr-1 h-4 w-4" />
            下へ
          </Button>
          <Button size="sm" type="button" variant="ghost">
            <Copy className="mr-1 h-4 w-4" />
            コピー
          </Button>
          <Button onClick={() => update({ type: "none", value: "" })} size="sm" type="button" variant="ghost">
            <Trash2 className="mr-1 h-4 w-4" />
            削除
          </Button>
        </div>
      </div>
      <div className="space-y-3 p-3">
        <div className="flex flex-wrap gap-4 text-sm">
          {[
            ["url", "URL"],
            ["tel", "TEL"],
            ["message", "ユーザーメッセージ"],
            ["survey", "回答フォーム"],
            ["none", "何もしない"]
          ].map(([value, label]) => (
            <label className="flex items-center gap-1" key={value}>
              <input
                checked={action.type === value}
                onChange={() => update({ type: value as ActionType, value: "" })}
                type="radio"
              />
              {label}
            </label>
          ))}
        </div>

        {action.type === "survey" ? (
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            onChange={(event) => update({ value: event.target.value })}
            value={action.value}
          >
            <option value="">回答フォームを選択</option>
            {surveys.map((survey) => (
              <option key={survey.id} value={survey.id}>
                {survey.admin_title || survey.title}
              </option>
            ))}
          </select>
        ) : action.type !== "none" ? (
          <Input
            onChange={(event) => update({ value: event.target.value })}
            placeholder={getActionPlaceholder(action.type)}
            value={action.value}
          />
        ) : null}
      </div>
    </div>
  );
}

function DeleteMenuButton({ menuId }: { menuId: string }) {
  const [state, action] = useFormState(deleteRichMenu, initialState);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!confirm("このリッチメニューを削除します。よろしいですか？")) {
          event.preventDefault();
        }
      }}
    >
      <input name="rich_menu_id" type="hidden" value={menuId} />
      <Button size="sm" type="submit" variant="ghost">
        <Trash2 className="mr-1 h-4 w-4" />
        削除
      </Button>
      <FormMessage state={state} />
    </form>
  );
}

function FieldRow({
  label,
  required,
  children
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-[14rem_1fr] md:items-start">
      <Label className="pt-2 font-semibold md:text-right">
        {label}
        {required ? (
          <span className="ml-2 rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">
            必須
          </span>
        ) : null}
      </Label>
      <div>{children}</div>
    </div>
  );
}

function MiniTemplate({ template }: { template: TemplateItem }) {
  return (
    <div
      className="grid h-16 w-24 gap-0.5 bg-slate-200 p-1"
      style={{
        gridTemplateColumns: `repeat(${template.columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${template.rows}, minmax(0, 1fr))`
      }}
    >
      {template.areas.map((area, index) => (
        <div
          className={index % 2 === 0 ? "bg-yellow-50" : "bg-sky-100"}
          key={area.id}
          style={{
            gridColumn: `${area.x + 1} / span ${area.width}`,
            gridRow: `${area.y + 1} / span ${area.height}`
          }}
        />
      ))}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button className="min-w-44 bg-green-600 text-white hover:bg-green-700" disabled={pending} type="submit">
      <Save className="mr-2 h-4 w-4" />
      {pending ? "保存中..." : "登録"}
    </Button>
  );
}

function FormMessage({ state }: { state: RichMenuActionState }) {
  if (!state.message) return null;
  return (
    <p
      className={cn(
        "rounded px-3 py-2 text-sm",
        state.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
      )}
    >
      {state.message}
    </p>
  );
}

function createDraft(): Draft {
  return normalizeDraftActions({
    name: "",
    imageUrl: "",
    chatBarText: "メニュー",
    isDefault: true,
    templateId: templates[0].id,
    targetTagIds: [],
    actions: []
  });
}

function toDraft(menu: RichMenuItem): Draft {
  const layout = isRecord(menu.layout_jsonb) ? menu.layout_jsonb : {};
  const templateId =
    typeof layout.template_id === "string" ? layout.template_id : templates[0].id;
  const actions = Array.isArray(layout.actions) ? (layout.actions as AreaAction[]) : [];

  return normalizeDraftActions({
    id: menu.id,
    name: menu.name,
    imageUrl: menu.image_url ?? "",
    chatBarText: typeof layout.chat_bar_text === "string" ? layout.chat_bar_text : "メニュー",
    isDefault: menu.is_default,
    templateId,
    targetTagIds: Array.isArray(menu.target_tag_ids)
      ? menu.target_tag_ids.filter((id): id is string => typeof id === "string")
      : [],
    actions
  });
}

function normalizeDraftActions(draft: Draft): Draft {
  const template = templates.find((item) => item.id === draft.templateId) ?? templates[0];
  return {
    ...draft,
    actions: template.areas.map((area, index) => {
      const current = draft.actions.find((action) => action.id === area.id);
      return current ?? createAreaAction(area.id, index);
    })
  };
}

function createAreaAction(id: string, index: number): AreaAction {
  return {
    id,
    label: `ボタン${index + 1}`,
    type: "url",
    value: ""
  };
}

function makeGridTemplate(id: string, name: string, columns: number, rows: number): TemplateItem {
  const areas = Array.from({ length: columns * rows }).map((_, index) => ({
    id: `area-${index + 1}`,
    x: index % columns,
    y: Math.floor(index / columns),
    width: 1,
    height: 1
  }));
  return { id, name, columns, rows, areas };
}

function getActionPlaceholder(type: ActionType) {
  if (type === "url") return "https://example.com";
  if (type === "tel") return "090-0000-0000";
  if (type === "message") return "学生が送信するメッセージ";
  return "";
}

function formatTargetTags(value: unknown, tags: TagItem[]) {
  if (!Array.isArray(value) || value.length === 0) return "全員";
  const names = value
    .filter((id): id is string => typeof id === "string")
    .map((id) => tags.find((tag) => tag.id === id)?.name)
    .filter(Boolean);
  return names.length > 0 ? names.join("、") : "全員";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
