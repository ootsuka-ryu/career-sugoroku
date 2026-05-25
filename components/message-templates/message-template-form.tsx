"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Copy, ImageIcon, Plus, Save, Trash2 } from "lucide-react";
import {
  createMessageTemplate,
  type MessageTemplateActionState
} from "@/app/(dashboard)/message-templates/actions";
import { SurveyMediaPicker } from "@/components/surveys/survey-media-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type FolderOption = {
  id: string;
  name: string;
};

type CarouselAction = {
  type: "text" | "url" | "survey" | "none";
  value: string;
  timing: "now" | "after_reply";
};

type CarouselButton = {
  label: string;
  action: CarouselAction;
};

type CarouselPanel = {
  title: string;
  description: string;
  imageUrl: string;
  buttons: CarouselButton[];
};

const initialState: MessageTemplateActionState = {
  ok: false,
  message: ""
};

const tabs = [
  { value: "text", label: "テキスト" },
  { value: "stamp", label: "スタンプ" },
  { value: "image", label: "画像" },
  { value: "question", label: "質問" },
  { value: "carousel", label: "カルーセル" },
  { value: "location", label: "位置情報" },
  { value: "intro", label: "紹介" },
  { value: "audio", label: "音声" },
  { value: "video", label: "動画" }
] as const;

type TemplateKind = (typeof tabs)[number]["value"];

function createPanel(): CarouselPanel {
  return {
    title: "",
    description: "",
    imageUrl: "",
    buttons: [
      {
        label: "",
        action: { type: "none", value: "", timing: "now" }
      }
    ]
  };
}

export function MessageTemplateForm({ folders }: { folders: FolderOption[] }) {
  const [state, formAction] = useFormState(createMessageTemplate, initialState);
  const [kind, setKind] = useState<TemplateKind>("carousel");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [mediaMemo, setMediaMemo] = useState("");
  const [panels, setPanels] = useState<CarouselPanel[]>([createPanel()]);
  const [selectedPanelIndex, setSelectedPanelIndex] = useState(0);
  const [tapLimit, setTapLimit] = useState("once_all");
  const [limitTextMode, setLimitTextMode] = useState("default_reply");
  const [limitActionMode, setLimitActionMode] = useState("same");
  const [pcAltText, setPcAltText] = useState("");
  const [editingAction, setEditingAction] = useState<{
    panelIndex: number;
    buttonIndex: number;
  } | null>(null);

  const activePanel = panels[selectedPanelIndex] ?? panels[0];

  const hiddenBody = useMemo(() => {
    if (kind === "carousel") {
      return JSON.stringify({
        type: "carousel",
        panels,
        options: {
          tapLimit,
          limitTextMode,
          limitActionMode,
          pcAltText
        }
      });
    }
    if (kind === "image") return JSON.stringify({ type: "image", imageUrl });
    if (["video", "audio", "stamp", "location", "intro", "question"].includes(kind)) {
      return JSON.stringify({ type: kind, memo: mediaMemo || body });
    }
    return body;
  }, [body, imageUrl, kind, limitActionMode, limitTextMode, mediaMemo, panels, pcAltText, tapLimit]);

  function updatePanel(index: number, patch: Partial<CarouselPanel>) {
    setPanels((current) =>
      current.map((panel, panelIndex) =>
        panelIndex === index ? { ...panel, ...patch } : panel
      )
    );
  }

  function updateButton(
    panelIndex: number,
    buttonIndex: number,
    patch: Partial<CarouselButton>
  ) {
    setPanels((current) =>
      current.map((panel, currentPanelIndex) => {
        if (currentPanelIndex !== panelIndex) return panel;
        return {
          ...panel,
          buttons: panel.buttons.map((button, currentButtonIndex) =>
            currentButtonIndex === buttonIndex ? { ...button, ...patch } : button
          )
        };
      })
    );
  }

  function updateAction(
    panelIndex: number,
    buttonIndex: number,
    patch: Partial<CarouselAction>
  ) {
    const button = panels[panelIndex]?.buttons[buttonIndex];
    if (!button) return;
    updateButton(panelIndex, buttonIndex, {
      action: { ...button.action, ...patch }
    });
  }

  function addPanel() {
    setPanels((current) => {
      if (current.length >= 10) return current;
      setSelectedPanelIndex(current.length);
      return [...current, createPanel()];
    });
  }

  function removePanel(index: number) {
    setPanels((current) => {
      if (current.length <= 1) return current;
      const next = current.filter((_, panelIndex) => panelIndex !== index);
      setSelectedPanelIndex(Math.min(index, next.length - 1));
      return next;
    });
  }

  function movePanel(index: number, direction: -1 | 1) {
    setPanels((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      setSelectedPanelIndex(nextIndex);
      return next;
    });
  }

  function addButton() {
    if (!activePanel || activePanel.buttons.length >= 4) return;
    updatePanel(selectedPanelIndex, {
      buttons: [
        ...activePanel.buttons,
        { label: "", action: { type: "none", value: "", timing: "now" } }
      ]
    });
  }

  function removeButton(buttonIndex: number) {
    if (!activePanel || activePanel.buttons.length <= 1) return;
    updatePanel(selectedPanelIndex, {
      buttons: activePanel.buttons.filter((_, index) => index !== buttonIndex)
    });
  }

  const editingButton =
    editingAction !== null
      ? panels[editingAction.panelIndex]?.buttons[editingAction.buttonIndex]
      : null;

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-[360px_230px]">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            テンプレート名 <span className="rounded bg-destructive px-1 py-0.5 text-xs text-white">必須</span>
          </label>
          <Input name="title" placeholder="テンプレート名を入力" required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">フォルダ</label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            name="folder_id"
          >
            <option value="">未分類</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <input name="body" type="hidden" value={hiddenBody} />
      <input name="kind" type="hidden" value={kind} />

      <div className="flex flex-wrap gap-0 border-b">
        {tabs.map((tab) => (
          <button
            className={`min-w-24 rounded-t-md border border-b-0 px-4 py-2 text-sm font-medium ${
              kind === tab.value
                ? "bg-background text-primary"
                : "bg-secondary/50 text-muted-foreground"
            }`}
            key={tab.value}
            onClick={() => setKind(tab.value)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {kind === "carousel" ? (
        <div className="space-y-8">
          <section className="rounded-md border bg-background">
            <div className="border-b bg-muted/50 px-4 py-2 text-sm font-medium">プレビュー</div>
            <div className="flex min-h-44 gap-6 overflow-x-auto p-4">
              {panels.map((panel, index) => (
                <div key={index} className="flex items-start gap-4">
                  <button
                    className={`w-[220px] rounded border bg-background text-left transition ${
                      selectedPanelIndex === index ? "border-green-500 ring-1 ring-green-500" : ""
                    }`}
                    onClick={() => setSelectedPanelIndex(index)}
                    type="button"
                  >
                    <div className="flex items-center justify-between border-b px-3 py-2 text-sm font-medium">
                      <span>パネル #{index + 1}</span>
                      <span className="flex gap-2 text-muted-foreground">
                        <span>←</span>
                        <span>→</span>
                        <Copy className="h-4 w-4" />
                        <Trash2 className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="aspect-[1.51] bg-muted">
                      {panel.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" className="h-full w-full object-cover" src={panel.imageUrl} />
                      ) : null}
                    </div>
                    <div className="space-y-1 p-3">
                      <p className="truncate text-sm font-semibold text-muted-foreground">
                        {panel.title || "タイトル"}
                      </p>
                      <p className="line-clamp-2 min-h-8 text-xs text-destructive">
                        {panel.description || "本文[必須]"}
                      </p>
                      <div className="border-t pt-3 text-center text-xs text-muted-foreground">
                        {panel.buttons[0]?.label || "選択肢1"}
                      </div>
                    </div>
                  </button>
                  {index === panels.length - 1 ? (
                    <button
                      className="mt-20 text-sm font-medium text-green-600"
                      disabled={panels.length >= 10}
                      onClick={addPanel}
                      type="button"
                    >
                      + パネルを追加
                      <span className="mt-4 block text-muted-foreground">
                        ({panels.length} / 10)
                      </span>
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          {activePanel ? (
            <section className="space-y-6">
              <h3 className="text-xl font-semibold">パネル #{selectedPanelIndex + 1}</h3>
              <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
                <div className="space-y-6">
                  <FieldBlock label="タイトル">
                    <Input
                      maxLength={40}
                      onChange={(event) =>
                        updatePanel(selectedPanelIndex, { title: event.target.value })
                      }
                      value={activePanel.title}
                    />
                    <p className="text-right text-xs text-muted-foreground">
                      {activePanel.title.length}/40
                    </p>
                  </FieldBlock>

                  <FieldBlock
                    label={
                      <>
                        本文 <span className="rounded bg-destructive px-1 py-0.5 text-xs text-white">必須</span>
                      </>
                    }
                  >
                    <Textarea
                      maxLength={60}
                      onChange={(event) =>
                        updatePanel(selectedPanelIndex, { description: event.target.value })
                      }
                      rows={3}
                      value={activePanel.description}
                    />
                    <p className="text-right text-xs text-muted-foreground">
                      {activePanel.description.length}/60
                    </p>
                    <p className="text-xs text-muted-foreground">
                      文字数が多い場合や改行を含む場合、端末によって末尾がカットされることがあります。
                    </p>
                  </FieldBlock>
                </div>

                <FieldBlock label="画像">
                  <SurveyMediaPicker
                    name={`template_carousel_image_${selectedPanelIndex}`}
                    onChange={(value) =>
                      updatePanel(selectedPanelIndex, { imageUrl: value })
                    }
                    value={activePanel.imageUrl}
                  />
                  <p className="text-xs text-muted-foreground">
                    画像サイズは横1024px、縦678px前後を推奨します。
                  </p>
                </FieldBlock>
              </div>

              <section className="space-y-3">
                <p className="font-medium">選択肢</p>
                <div className="space-y-3 rounded-md border border-green-500 p-4">
                  {activePanel.buttons.map((button, buttonIndex) => (
                    <div className="grid gap-4 md:grid-cols-[340px_230px_1fr_auto]" key={buttonIndex}>
                      <FieldBlock
                        label={
                          <>
                            選択肢名 <span className="rounded bg-destructive px-1 py-0.5 text-xs text-white">必須</span>
                          </>
                        }
                      >
                        <Input
                          maxLength={20}
                          onChange={(event) =>
                            updateButton(selectedPanelIndex, buttonIndex, {
                              label: event.target.value
                            })
                          }
                          value={button.label}
                        />
                        <p className="text-xs text-muted-foreground">
                          {button.label.length}/20
                        </p>
                      </FieldBlock>
                      <FieldBlock label="動作">
                        <select
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          onChange={(event) =>
                            updateAction(selectedPanelIndex, buttonIndex, {
                              type: event.target.value as CarouselAction["type"]
                            })
                          }
                          value={button.action.type}
                        >
                          <option value="none">アクション未設定</option>
                          <option value="text">アクション実行</option>
                          <option value="url">URLを開く</option>
                          <option value="survey">回答フォーム</option>
                        </select>
                      </FieldBlock>
                      <div className="rounded-md bg-muted/60 p-4">
                        <Button
                          onClick={() =>
                            setEditingAction({ panelIndex: selectedPanelIndex, buttonIndex })
                          }
                          type="button"
                          className="bg-amber-500 text-white hover:bg-amber-600"
                        >
                          アクション設定
                        </Button>
                        {button.action.type === "none" ? (
                          <p className="mt-3 rounded bg-amber-50 px-3 py-2 text-xs text-amber-700">
                            アクションが未設定です。押されたときに何も起きません。
                          </p>
                        ) : (
                          <p className="mt-3 text-xs text-muted-foreground">
                            {getActionSummary(button.action)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-start gap-2 pt-8">
                        <button onClick={() => removeButton(buttonIndex)} type="button">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  className="w-full rounded bg-green-50 py-2 text-sm font-medium text-green-700"
                  onClick={addButton}
                  type="button"
                >
                  + 選択肢を追加
                </button>
                <p className="text-center text-sm text-muted-foreground">
                  ({activePanel.buttons.length} / 4)
                </p>
              </section>

              <section className="space-y-6 border-t pt-6">
                <h3 className="text-xl font-semibold">オプション</h3>
                <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
                  <FieldBlock label="選択肢のタップ回数制限">
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      onChange={(event) => setTapLimit(event.target.value)}
                      value={tapLimit}
                    >
                      <option value="once_all">カルーセル全体で1回のみ</option>
                      <option value="unlimited">回数制限なし</option>
                      <option value="once_each">選択肢ごとに1回のみ</option>
                    </select>
                  </FieldBlock>
                  <div className="rounded border border-green-500 p-4 text-center text-green-700">
                    {tapLimit === "once_all" ? "カルーセル全体で1回のみ" : "回数制限なし"}
                    <div className="mx-auto mt-3 h-28 w-44 bg-muted" />
                  </div>
                </div>

                <div className="grid gap-6 border-t pt-5 md:grid-cols-2">
                  <div className="space-y-3">
                    <p className="text-sm font-medium">タップ回数制限を超えた時の設定</p>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        checked={limitActionMode === "same"}
                        onChange={() => setLimitActionMode("same")}
                        type="radio"
                      />
                      全選択肢で同じ設定を使う
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        checked={limitActionMode === "each"}
                        onChange={() => setLimitActionMode("each")}
                        type="radio"
                      />
                      選択肢ごとに決める
                    </label>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-medium">タップ回数制限を超えた時のテキスト返信</p>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        checked={limitTextMode === "default_reply"}
                        onChange={() => setLimitTextMode("default_reply")}
                        type="radio"
                      />
                      既定の返信をする
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        checked={limitTextMode === "no_reply"}
                        onChange={() => setLimitTextMode("no_reply")}
                        type="radio"
                      />
                      既定の返信をしない
                    </label>
                    <Button className="bg-amber-500 text-white hover:bg-amber-600" type="button">
                      アクション設定
                    </Button>
                  </div>
                </div>

                <FieldBlock label="PC版・通知欄での代替テキスト">
                  <Textarea
                    onChange={(event) => setPcAltText(event.target.value)}
                    placeholder="[LINEアプリよりご覧下さい]"
                    rows={3}
                    value={pcAltText}
                  />
                </FieldBlock>
              </section>
            </section>
          ) : null}
        </div>
      ) : kind === "text" ? (
        <Textarea
          onChange={(event) => setBody(event.target.value)}
          placeholder="本文を入力"
          rows={9}
          value={body}
        />
      ) : kind === "image" ? (
        <div className="rounded-md border bg-secondary/30 p-4">
          <p className="mb-3 font-medium">画像テンプレート</p>
          <SurveyMediaPicker name="template_image" onChange={setImageUrl} value={imageUrl} />
        </div>
      ) : (
        <div className="rounded-md border bg-secondary/30 p-4">
          <p className="mb-3 font-medium">{tabs.find((tab) => tab.value === kind)?.label}</p>
          <Input
            onChange={(event) => setMediaMemo(event.target.value)}
            placeholder="内容メモまたはアップロード予定メモ"
            value={mediaMemo}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            この種類の実送信処理はLINE連携後に接続します。
          </p>
        </div>
      )}

      {state.message ? (
        <p
          className={
            state.ok
              ? "rounded-md bg-accent/10 px-3 py-2 text-sm text-accent"
              : "rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
        >
          {state.message}
        </p>
      ) : null}

      <SubmitButton />

      {editingAction !== null && editingButton ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-md bg-background shadow-xl">
            <div className="flex items-center justify-between border-b p-4">
              <p className="text-lg font-semibold">アクション設定</p>
              <button onClick={() => setEditingAction(null)} type="button">×</button>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid gap-3 md:grid-cols-[180px_1fr] md:items-center">
                <label className="text-sm font-medium">行う動作</label>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  onChange={(event) =>
                    updateAction(editingAction.panelIndex, editingAction.buttonIndex, {
                      type: event.target.value as CarouselAction["type"]
                    })
                  }
                  value={editingButton.action.type}
                >
                  <option value="text">テキスト送信</option>
                  <option value="url">URLを開く</option>
                  <option value="survey">回答フォーム</option>
                  <option value="none">何もしない</option>
                </select>
              </div>
              <div className="grid gap-3 md:grid-cols-[180px_1fr]">
                <label className="text-sm font-medium">内容</label>
                <Textarea
                  onChange={(event) =>
                    updateAction(editingAction.panelIndex, editingAction.buttonIndex, {
                      value: event.target.value
                    })
                  }
                  placeholder="送信する文章、またはURLを入力"
                  rows={6}
                  value={editingButton.action.value}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-[180px_1fr] md:items-center">
                <label className="text-sm font-medium">送信タイミング</label>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  onChange={(event) =>
                    updateAction(editingAction.panelIndex, editingAction.buttonIndex, {
                      timing: event.target.value as CarouselAction["timing"]
                    })
                  }
                  value={editingButton.action.timing}
                >
                  <option value="now">すぐに送信する</option>
                  <option value="after_reply">返信後に送信する</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end border-t p-4">
              <Button onClick={() => setEditingAction(null)} type="button">
                この条件で決定する
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function FieldBlock({
  label,
  children
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      {children}
    </div>
  );
}

function getActionSummary(action: CarouselAction) {
  if (action.type === "url") return `URLを開く: ${action.value || "未入力"}`;
  if (action.type === "survey") return `回答フォーム: ${action.value || "未入力"}`;
  if (action.type === "text") return `テキスト送信: ${action.value || "未入力"}`;
  return "アクション未設定";
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      <Save className="mr-2 h-4 w-4" />
      {pending ? "保存中..." : "保存"}
    </Button>
  );
}
