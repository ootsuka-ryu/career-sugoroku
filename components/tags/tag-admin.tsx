"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  Edit3,
  Folder,
  GripVertical,
  Plus,
  Save,
  Search,
  Trash2,
  X
} from "lucide-react";
import { deleteTag, saveTag, type TagActionState } from "@/app/(dashboard)/tags/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { localizeSampleText } from "@/lib/display/localize";

export type TagItem = {
  id: string;
  name: string;
  color: string;
  created_at?: string | null;
  student_count: number;
};

export type TagFolderGroup = {
  id: string;
  name: string;
  description: string;
  tags: TagItem[];
};

const initialState: TagActionState = {
  ok: false,
  message: ""
};

export function TagAdmin({
  tags,
  folders
}: {
  tags: TagItem[];
  folders: TagFolderGroup[];
}) {
  const [query, setQuery] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState(folders[0]?.id ?? "");
  const [editing, setEditing] = useState<TagItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    if (!folders.some((folder) => folder.id === selectedFolderId)) {
      setSelectedFolderId(folders[0]?.id ?? "");
    }
  }, [folders, selectedFolderId]);

  const activeFolder = folders.find((folder) => folder.id === selectedFolderId) ?? folders[0];
  const visibleTags = useMemo(() => {
    const source = activeFolder?.tags ?? [];
    if (!normalizedQuery) return source;

    return source.filter((tag) =>
      (localizeSampleText(tag.name) ?? tag.name).toLowerCase().includes(normalizedQuery)
    );
  }, [activeFolder, normalizedQuery]);

  function startCreate() {
    setEditing(null);
    setShowForm(true);
  }

  function startEdit(tag: TagItem) {
    setEditing(tag);
    setShowForm(true);
  }

  function closeForm() {
    setEditing(null);
    setShowForm(false);
  }

  return (
    <div className="grid min-h-[560px] gap-4 lg:grid-cols-[216px_1fr]">
      <aside className="border-r bg-secondary/30">
        <div className="p-3">
          <Button className="w-full justify-start" onClick={startCreate} size="sm" type="button" variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            新しいタグ
          </Button>
        </div>
        <nav className="space-y-0.5 px-2 pb-3">
          {folders.map((folder) => {
            const active = folder.id === activeFolder?.id;
            return (
              <button
                className={
                  active
                    ? "flex w-full items-center gap-2 rounded-md bg-amber-50 px-2 py-2 text-left text-sm font-medium"
                    : "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-background"
                }
                key={folder.id}
                onClick={() => setSelectedFolderId(folder.id)}
                type="button"
              >
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                <Folder className="h-4 w-4 shrink-0 text-amber-500" />
                <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                <span className="text-xs text-muted-foreground">{folder.tags.length}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={startCreate} size="sm" type="button">
              <Plus className="mr-2 h-4 w-4" />
              新しいタグ
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-72 max-w-[55vw]">
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

        {showForm ? <TagForm editing={editing} onCancel={closeForm} /> : null}

        <div className="overflow-x-auto border bg-white">
          <div className="grid min-w-[640px] grid-cols-[34px_34px_minmax(220px,1fr)_140px_140px_72px] border-b bg-muted/60 px-2 py-2 text-xs font-medium text-muted-foreground">
            <span />
            <span />
            <span>タグ名</span>
            <span>友だち人数</span>
            <span>登録日</span>
            <span className="text-right">操作</span>
          </div>
          <div className="max-h-[64vh] overflow-auto">
            {visibleTags.length > 0 ? (
              visibleTags.map((tag) => (
                <div
                  className="grid min-w-[640px] grid-cols-[34px_34px_minmax(220px,1fr)_140px_140px_72px] items-center border-b px-2 py-2 text-sm last:border-b-0 hover:bg-secondary/40"
                  key={tag.id}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                  <input className="h-4 w-4 rounded border-input" type="checkbox" />
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: tag.color }} />
                    <button
                      className="min-w-0 truncate text-left font-medium text-primary hover:underline"
                      onClick={() => startEdit(tag)}
                      type="button"
                    >
                      {localizeSampleText(tag.name) ?? tag.name}
                    </button>
                  </div>
                  <span>
                    <button className="text-primary hover:underline" type="button">
                      {tag.student_count}人
                    </button>
                  </span>
                  <span>{formatDate(tag.created_at)}</span>
                  <div className="flex justify-end gap-1">
                    <Button onClick={() => startEdit(tag)} size="icon" title="編集" type="button" variant="ghost">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <DeleteTagButton tagId={tag.id} />
                  </div>
                </div>
              ))
            ) : (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                条件に合うタグがありません。
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function TagForm({
  editing,
  onCancel
}: {
  editing: TagItem | null;
  onCancel: () => void;
}) {
  const [state, action] = useFormState(saveTag, initialState);
  const [color, setColor] = useState(editing?.color ?? "#0ea5e9");

  useEffect(() => {
    setColor(editing?.color ?? "#0ea5e9");
  }, [editing]);

  return (
    <form
      action={action}
      className="mb-3 grid gap-2 border bg-muted/30 p-3 md:grid-cols-[1fr_160px_auto_auto]"
      key={editing?.id ?? "new"}
    >
      <input name="tag_id" type="hidden" value={editing?.id ?? ""} />
      <Input
        defaultValue={editing ? localizeSampleText(editing.name) ?? editing.name : ""}
        name="name"
        placeholder="タグ名"
        required
      />
      <div className="flex gap-2">
        <input
          className="h-9 w-11 rounded border"
          name="color"
          onChange={(event) => setColor(event.target.value)}
          type="color"
          value={color}
        />
        <Input readOnly value={color} />
      </div>
      <SubmitButton editing={Boolean(editing)} />
      <Button onClick={onCancel} type="button" variant="outline">
        <X className="mr-2 h-4 w-4" />
        閉じる
      </Button>
      <FormMessage state={state} />
    </form>
  );
}

function DeleteTagButton({ tagId }: { tagId: string }) {
  const [state, action] = useFormState(deleteTag, initialState);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!confirm("このタグを削除します。学生やアンケート条件からも外れます。よろしいですか？")) {
          event.preventDefault();
        }
      }}
    >
      <input name="tag_id" type="hidden" value={tagId} />
      <Button size="icon" title="削除" type="submit" variant="ghost">
        <Trash2 className="h-4 w-4" />
      </Button>
      <FormMessage state={state} />
    </form>
  );
}

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} type="submit">
      {editing ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
      {pending ? "保存中..." : editing ? "更新" : "作成"}
    </Button>
  );
}

function FormMessage({ state }: { state: TagActionState }) {
  if (!state.message) return null;
  return (
    <p className={state.ok ? "text-sm text-green-700 md:col-span-4" : "text-sm text-red-700 md:col-span-4"}>
      {state.message}
    </p>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}
