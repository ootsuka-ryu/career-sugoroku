"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageIcon, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MediaItem = {
  name: string;
  path: string;
  url: string;
  createdAt: string | null;
  size: number | null;
};

type ImageMode = "none" | "media" | "url";

export function SurveyMediaPicker({
  name,
  defaultValue = "",
  value,
  onChange
}: {
  name: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = isControlled ? value : internalValue;
  const [mode, setMode] = useState<ImageMode>(currentValue ? "media" : "none");
  const [open, setOpen] = useState(false);

  function setImageUrl(nextValue: string) {
    if (!isControlled) setInternalValue(nextValue);
    onChange?.(nextValue);
  }

  function handleModeChange(nextMode: ImageMode) {
    setMode(nextMode);
    if (nextMode === "none") {
      setImageUrl("");
    }
  }

  return (
    <div className="space-y-2">
      <input name={name} type="hidden" value={currentValue ?? ""} />
      <div className="grid gap-2 md:grid-cols-[14rem_1fr]">
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          onChange={(event) => handleModeChange(event.target.value as ImageMode)}
          value={mode}
        >
          <option value="none">使用しない</option>
          <option value="media">登録メディア</option>
          <option value="url">URLで指定</option>
        </select>

        {mode === "media" ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              className="bg-amber-500 text-white hover:bg-amber-600"
              onClick={() => setOpen(true)}
              type="button"
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              画像選択
            </Button>
            {currentValue ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <img
                  alt="選択中の画像"
                  className="h-10 w-10 rounded border object-cover"
                  src={currentValue}
                />
                <span>画像を選択済み</span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">画像は未選択です。</span>
            )}
          </div>
        ) : null}

        {mode === "url" ? (
          <Input
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="https://..."
            value={currentValue ?? ""}
          />
        ) : null}
      </div>

      {open ? (
        <MediaDialog
          onClose={() => setOpen(false)}
          onSelect={(url) => {
            setImageUrl(url);
            setMode("media");
            setOpen(false);
          }}
          selectedUrl={currentValue ?? ""}
        />
      ) : null}
    </div>
  );
}

function MediaDialog({
  onClose,
  onSelect,
  selectedUrl
}: {
  onClose: () => void;
  onSelect: (url: string) => void;
  selectedUrl: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"upload" | "uploaded">("upload");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selected, setSelected] = useState(selectedUrl);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function loadMedia() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/survey-media", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "画像一覧を取得できませんでした。");
      setMedia(json.media ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "画像一覧を取得できませんでした。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tab === "uploaded") {
      void loadMedia();
    }
  }, [tab]);

  async function uploadFile() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setMessage("画像ファイルを選択してください。");
      return;
    }

    setUploading(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/survey-media", {
        method: "POST",
        body: formData
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "アップロードできませんでした。");
      setSelected(json.media.url);
      setTab("uploaded");
      await loadMedia();
      setMessage("アップロードしました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "アップロードできませんでした。");
    } finally {
      setUploading(false);
    }
  }

  const selectedName = useMemo(
    () => media.find((item) => item.url === selected)?.name ?? "",
    [media, selected]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-md bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">画像</h3>
          <button
            className="rounded p-1 text-muted-foreground hover:bg-secondary"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 border-b">
          <button
            className={
              tab === "upload"
                ? "border-b-2 border-accent px-4 py-3 text-sm font-medium"
                : "px-4 py-3 text-sm text-muted-foreground hover:bg-secondary"
            }
            onClick={() => setTab("upload")}
            type="button"
          >
            新規アップロード
          </button>
          <button
            className={
              tab === "uploaded"
                ? "border-b-2 border-accent px-4 py-3 text-sm font-medium"
                : "px-4 py-3 text-sm text-muted-foreground hover:bg-secondary"
            }
            onClick={() => setTab("uploaded")}
            type="button"
          >
            アップロード済み
          </button>
        </div>

        <div className="max-h-[60vh] overflow-auto p-4">
          {tab === "upload" ? (
            <div className="rounded-md border-2 border-dashed p-8 text-center">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-medium">ここにファイルをドロップ</p>
              <p className="mt-1 text-sm text-muted-foreground">または</p>
              <div className="mt-4">
                <Input
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="mx-auto max-w-sm"
                  ref={fileRef}
                  type="file"
                />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                10MBまでの jpg、png、gif、webp をアップロードできます。
              </p>
              <Button
                className="mt-5"
                disabled={uploading}
                onClick={uploadFile}
                type="button"
              >
                {uploading ? "アップロード中..." : "アップロード"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <Label>アップロード済み画像</Label>
                <Button disabled={loading} onClick={loadMedia} type="button" variant="outline">
                  再読み込み
                </Button>
              </div>
              {loading ? (
                <p className="text-sm text-muted-foreground">読み込み中...</p>
              ) : media.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {media.map((item) => (
                    <button
                      className={
                        selected === item.url
                          ? "rounded-md border-2 border-accent p-2 text-left"
                          : "rounded-md border p-2 text-left hover:border-accent"
                      }
                      key={item.path}
                      onClick={() => setSelected(item.url)}
                      type="button"
                    >
                      <img
                        alt={item.name}
                        className="h-28 w-full rounded object-cover"
                        src={item.url}
                      />
                      <p className="mt-2 line-clamp-2 text-sm font-medium">{item.name}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  まだアップロード済み画像がありません。
                </p>
              )}
            </div>
          )}

          {message ? (
            <p className="mt-4 rounded-md bg-secondary px-3 py-2 text-sm">{message}</p>
          ) : null}
          {selectedName ? (
            <p className="mt-3 text-sm text-muted-foreground">
              選択中: {selectedName}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t px-4 py-3">
          <Button onClick={onClose} type="button" variant="outline">
            キャンセル
          </Button>
          <Button disabled={!selected} onClick={() => onSelect(selected)} type="button">
            決定
          </Button>
        </div>
      </div>
    </div>
  );
}
