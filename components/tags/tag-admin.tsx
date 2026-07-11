"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Edit3,
  Folder,
  FolderPlus,
  GripVertical,
  Plus,
  Save,
  Search,
  Trash2,
  X
} from "lucide-react";
import {
  createTagFolder,
  deleteTag,
  moveTagsToFolder,
  saveTag,
  type TagActionState
} from "@/app/(dashboard)/tags/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { localizeSampleText } from "@/lib/display/localize";

export type TagItem = {
  id: string;
  name: string;
  color: string;
  created_at?: string | null;
  folder_id?: string | null;
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

const TEXT = {
  newFolder: "\u65b0\u3057\u3044\u30d5\u30a9\u30eb\u30c0",
  newTag: "\u65b0\u3057\u3044\u30bf\u30b0",
  search: "\u691c\u7d22",
  tagName: "\u30bf\u30b0\u540d",
  friendCount: "\u53cb\u3060\u3061\u4eba\u6570",
  createdAt: "\u767b\u9332\u65e5",
  actions: "\u64cd\u4f5c",
  selectVisible: "\u8868\u793a\u4e2d\u306e\u30bf\u30b0\u3092\u3059\u3079\u3066\u9078\u629e",
  noTags: "\u6761\u4ef6\u306b\u5408\u3046\u30bf\u30b0\u304c\u3042\u308a\u307e\u305b\u3093\u3002",
  selected: "\u4ef6\u9078\u629e\u4e2d",
  bulkAction: "\u4e00\u62ec\u64cd\u4f5c",
  chooseBulkAction: "\u4e00\u62ec\u64cd\u4f5c\u3092\u9078\u629e",
  chooseMoveFolder: "\u79fb\u52d5\u5148\u30d5\u30a9\u30eb\u30c0\u3092\u9078\u629e",
  moveToUncategorized: "\u672a\u5206\u985e\u306b\u79fb\u52d5",
  moveSuffix: "\u306b\u79fb\u52d5",
  bulkMoveHint: "\u79fb\u52d5\u5148\u3092\u9078\u3076\u3068\u3001\u9078\u629e\u4e2d\u306e\u30bf\u30b0\u3092\u307e\u3068\u3081\u3066\u79fb\u52d5\u3057\u307e\u3059\u3002",
  moving: "\u79fb\u52d5\u3057\u3066\u3044\u307e\u3059...",
  clearSelection: "\u9078\u629e\u89e3\u9664",
  createFolderTitle: "\u65b0\u3057\u3044\u30d5\u30a9\u30eb\u30c0\u3092\u4f5c\u6210",
  folderName: "\u30d5\u30a9\u30eb\u30c0\u540d",
  folderDescription: "\u8aac\u660e\uff08\u4efb\u610f\uff09",
  close: "\u9589\u3058\u308b",
  createFolder: "\u30d5\u30a9\u30eb\u30c0\u4f5c\u6210",
  creatingFolder: "\u4f5c\u6210\u4e2d...",
  confirmingFolder: "\u4f5c\u6210\u78ba\u8a8d\u4e2d...",
  editTag: "\u30bf\u30b0\u3092\u7de8\u96c6",
  createTag: "\u65b0\u3057\u3044\u30bf\u30b0\u3092\u4f5c\u6210",
  color: "\u8272",
  update: "\u66f4\u65b0",
  create: "\u4f5c\u6210",
  saving: "\u4fdd\u5b58\u4e2d...",
  confirmingSave: "\u4fdd\u5b58\u78ba\u8a8d\u4e2d...",
  edit: "\u7de8\u96c6",
  delete: "\u524a\u9664",
  people: "\u4eba",
  deleteConfirm:
    "\u3053\u306e\u30bf\u30b0\u3092\u524a\u9664\u3057\u307e\u3059\u3002\u5b66\u751f\u3084\u30a2\u30f3\u30b1\u30fc\u30c8\u6761\u4ef6\u304b\u3089\u3082\u5916\u308c\u307e\u3059\u3002\u3088\u308d\u3057\u3044\u3067\u3059\u304b\uff1f"
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
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [pendingFolderId, setPendingFolderId] = useState<string | null>(null);
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    if (pendingFolderId) {
      if (folders.some((folder) => folder.id === pendingFolderId)) {
        setSelectedFolderId(pendingFolderId);
        setPendingFolderId(null);
      }
      return;
    }

    if (!folders.some((folder) => folder.id === selectedFolderId)) {
      setSelectedFolderId(folders[0]?.id ?? "");
    }
  }, [folders, pendingFolderId, selectedFolderId]);

  useEffect(() => {
    setSelectedTagIds([]);
  }, [selectedFolderId]);

  const activeFolder = folders.find((folder) => folder.id === selectedFolderId) ?? folders[0];
  const visibleTags = useMemo(() => {
    const source = activeFolder?.tags ?? [];
    if (!normalizedQuery) return source;

    return source.filter((tag) =>
      (localizeSampleText(tag.name) ?? tag.name).toLowerCase().includes(normalizedQuery)
    );
  }, [activeFolder, normalizedQuery]);

  const selectedTagIdSet = useMemo(() => new Set(selectedTagIds), [selectedTagIds]);
  const visibleTagIds = useMemo(() => visibleTags.map((tag) => tag.id), [visibleTags]);
  const allVisibleSelected =
    visibleTagIds.length > 0 && visibleTagIds.every((tagId) => selectedTagIdSet.has(tagId));
  const someVisibleSelected = visibleTagIds.some((tagId) => selectedTagIdSet.has(tagId));
  const movableFolders = useMemo(
    () => folders.filter((folder) => folder.id !== "uncategorized"),
    [folders]
  );
  const clearSelectedTags = useCallback(() => setSelectedTagIds([]), []);
  const closeFolderForm = useCallback(() => setShowFolderForm(false), []);
  const handleFolderCreated = useCallback((folderId?: string) => {
    if (folderId) {
      setPendingFolderId(folderId);
      setSelectedFolderId(folderId);
    }
    setShowFolderForm(false);
  }, []);

  function toggleTagSelection(tagId: string, checked: boolean) {
    setSelectedTagIds((current) =>
      checked ? Array.from(new Set([...current, tagId])) : current.filter((id) => id !== tagId)
    );
  }

  function toggleVisibleSelection(checked: boolean) {
    setSelectedTagIds((current) => {
      if (checked) return Array.from(new Set([...current, ...visibleTagIds]));
      return current.filter((id) => !visibleTagIds.includes(id));
    });
  }

  function startCreate() {
    setEditing(null);
    setShowFolderForm(false);
    setShowForm(true);
  }

  function startEdit(tag: TagItem) {
    setEditing(tag);
    setShowFolderForm(false);
    setShowForm(true);
  }

  function closeForm() {
    setEditing(null);
    setShowForm(false);
  }

  function startCreateFolder() {
    setShowForm(false);
    setEditing(null);
    setShowFolderForm(true);
  }

  return (
    <div className="grid min-h-[560px] gap-4 lg:grid-cols-[216px_1fr]">
      <aside className="border-r bg-secondary/30">
        <div className="p-3">
          <Button
            className="w-full justify-start"
            onClick={startCreateFolder}
            size="sm"
            type="button"
            variant="outline"
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            {TEXT.newFolder}
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
              {TEXT.newTag}
            </Button>
          </div>
          <div className="relative w-72 max-w-[55vw]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={TEXT.search}
              value={query}
            />
          </div>
        </div>
        <BulkTagFolderMove
          folders={movableFolders}
          onMoved={clearSelectedTags}
          selectedCount={selectedTagIds.length}
          selectedTagIds={selectedTagIds}
        />

        {showFolderForm ? (
          <TagFolderForm onCancel={closeFolderForm} onCreated={handleFolderCreated} />
        ) : null}

        {showForm ? <TagForm editing={editing} onCancel={closeForm} /> : null}

        <div className="overflow-x-auto border bg-white">
          <div className="grid min-w-[640px] grid-cols-[34px_34px_minmax(220px,1fr)_140px_140px_72px] border-b bg-muted/60 px-2 py-2 text-xs font-medium text-muted-foreground">
            <span />
            <input
              aria-label={TEXT.selectVisible}
              checked={allVisibleSelected}
              className="h-4 w-4 rounded border-input"
              onChange={(event) => toggleVisibleSelection(event.target.checked)}
              ref={(element) => {
                if (element) element.indeterminate = someVisibleSelected && !allVisibleSelected;
              }}
              type="checkbox"
            />
            <span>{TEXT.tagName}</span>
            <span>{TEXT.friendCount}</span>
            <span>{TEXT.createdAt}</span>
            <span className="text-right">{TEXT.actions}</span>
          </div>
          <div className="max-h-[64vh] overflow-auto">
            {visibleTags.length > 0 ? (
              visibleTags.map((tag) => (
                <div
                  className={`grid min-w-[640px] grid-cols-[34px_34px_minmax(220px,1fr)_140px_140px_72px] items-center border-b px-2 py-2 text-sm last:border-b-0 hover:bg-secondary/40 ${
                    selectedTagIdSet.has(tag.id) ? "bg-green-50" : ""
                  }`}
                  key={tag.id}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                  <input
                    checked={selectedTagIdSet.has(tag.id)}
                    className="h-4 w-4 rounded border-input"
                    onChange={(event) => toggleTagSelection(tag.id, event.target.checked)}
                    type="checkbox"
                  />
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
                      {tag.student_count}
                      {TEXT.people}
                    </button>
                  </span>
                  <span>{formatDate(tag.created_at)}</span>
                  <div className="flex justify-end gap-1">
                    <Button onClick={() => startEdit(tag)} size="icon" title={TEXT.edit} type="button" variant="ghost">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <DeleteTagButton tagId={tag.id} />
                  </div>
                </div>
              ))
            ) : (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">{TEXT.noTags}</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function BulkTagFolderMove({
  folders,
  selectedTagIds,
  selectedCount,
  onMoved
}: {
  folders: TagFolderGroup[];
  selectedTagIds: string[];
  selectedCount: number;
  onMoved: () => void;
}) {
  const router = useRouter();
  const [formElement, setFormElement] = useState<HTMLFormElement | null>(null);
  const [state, formAction] = useFormState(moveTagsToFolder, initialState);

  useEffect(() => {
    if (state.ok) {
      onMoved();
      router.refresh();
    }
  }, [onMoved, router, state.ok]);

  if (selectedCount === 0) return null;

  return (
    <form
      action={formAction}
      className="sticky top-0 z-30 mb-3 flex flex-wrap items-center gap-3 rounded-md border-2 border-green-600 bg-white px-3 py-3 shadow-lg"
      ref={setFormElement}
    >
      {selectedTagIds.map((tagId) => (
        <input key={tagId} name="tag_ids" type="hidden" value={tagId} />
      ))}
      <div className="flex min-w-[180px] items-center gap-2">
        <span className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-semibold text-white">
          {TEXT.bulkAction}
        </span>
        <p className="text-sm font-semibold text-green-900">
          {selectedCount}
          {TEXT.selected}
        </p>
      </div>
      <p className="max-w-md text-xs text-green-800">{TEXT.bulkMoveHint}</p>
      <select
        aria-label="選択中タグの移動先フォルダ"
        className="h-9 min-w-[280px] rounded-md border border-green-500 bg-white px-3 text-sm font-medium"
        defaultValue=""
        name="folder_id"
        onChange={(event) => {
          if (event.currentTarget.value && formElement) {
            formElement.requestSubmit();
          }
        }}
        disabled={folders.length === 0}
        required
      >
        <option value="" disabled>
          {TEXT.chooseMoveFolder}
        </option>
        <option value="none">{TEXT.moveToUncategorized}</option>
        {folders.map((folder) => (
          <option key={folder.id} value={folder.id}>
            {folder.name}
            {TEXT.moveSuffix}
          </option>
        ))}
      </select>
      {folders.length === 0 ? (
        <p className="text-xs text-destructive">移動先フォルダがまだありません。先に「新しいフォルダ」から作成してください。</p>
      ) : null}
      <Button onClick={onMoved} size="sm" type="button" variant="outline">
        {TEXT.clearSelection}
      </Button>
      <BulkMoveMessage state={state} />
    </form>
  );
}

function BulkMoveMessage({ state }: { state: TagActionState }) {
  const { pending } = useFormStatus();
  if (pending) return <p className="text-xs text-muted-foreground">{TEXT.moving}</p>;
  if (!state.message) return null;
  return <p className={`text-xs ${state.ok ? "text-green-700" : "text-destructive"}`}>{state.message}</p>;
}

function TagFolderForm({
  onCancel,
  onCreated
}: {
  onCancel: () => void;
  onCreated: (folderId?: string) => void;
}) {
  const router = useRouter();
  const [state, action] = useFormState(createTagFolder, initialState);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onCreated(state.folderId);
    }
  }, [onCreated, router, state.folderId, state.ok]);

  return (
    <form action={action} className="mb-3 space-y-2 border border-amber-200 bg-amber-50/40 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <FolderPlus className="h-4 w-4 text-amber-600" />
        {TEXT.createFolderTitle}
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
        <Input name="name" placeholder={TEXT.folderName} required />
        <Input name="description" placeholder={TEXT.folderDescription} />
        <FolderSubmitButton />
        <Button onClick={onCancel} type="button" variant="outline">
          <X className="mr-2 h-4 w-4" />
          {TEXT.close}
        </Button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

function TagForm({
  editing,
  onCancel
}: {
  editing: TagItem | null;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [state, action] = useFormState(saveTag, initialState);
  const [color, setColor] = useState(editing?.color ?? "#0ea5e9");

  useEffect(() => {
    setColor(editing?.color ?? "#0ea5e9");
  }, [editing]);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onCancel();
    }
  }, [onCancel, router, state.ok]);

  return (
    <form
      action={action}
      className="mb-3 space-y-2 border border-green-200 bg-green-50/40 p-3"
      key={editing?.id ?? "new"}
    >
      <input name="tag_id" type="hidden" value={editing?.id ?? ""} />
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Plus className="h-4 w-4 text-green-700" />
        {editing ? TEXT.editTag : TEXT.createTag}
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_160px_auto_auto]">
        <Input
          defaultValue={editing ? localizeSampleText(editing.name) ?? editing.name : ""}
          name="name"
          placeholder={TEXT.tagName}
          required
        />
        <div className="flex gap-2">
          <input
            aria-label={TEXT.color}
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
          {TEXT.close}
        </Button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

function DeleteTagButton({ tagId }: { tagId: string }) {
  const router = useRouter();
  const [state, action] = useFormState(deleteTag, initialState);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [router, state.ok]);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!confirm(TEXT.deleteConfirm)) {
          event.preventDefault();
        }
      }}
    >
      <input name="tag_id" type="hidden" value={tagId} />
      <Button size="icon" title={TEXT.delete} type="submit" variant="ghost">
        <Trash2 className="h-4 w-4" />
      </Button>
      <FormMessage state={state} />
    </form>
  );
}

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (!pending) {
      setIsSlow(false);
      return;
    }
    const timer = window.setTimeout(() => setIsSlow(true), 8000);
    return () => window.clearTimeout(timer);
  }, [pending]);

  return (
    <Button disabled={pending} type="submit">
      {editing ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
      {pending ? (isSlow ? TEXT.confirmingSave : TEXT.saving) : editing ? TEXT.update : TEXT.create}
    </Button>
  );
}

function FolderSubmitButton() {
  const { pending } = useFormStatus();
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (!pending) {
      setIsSlow(false);
      return;
    }
    const timer = window.setTimeout(() => setIsSlow(true), 8000);
    return () => window.clearTimeout(timer);
  }, [pending]);

  return (
    <Button disabled={pending} type="submit">
      <FolderPlus className="mr-2 h-4 w-4" />
      {pending ? (isSlow ? TEXT.confirmingFolder : TEXT.creatingFolder) : TEXT.createFolder}
    </Button>
  );
}

function FormMessage({ state }: { state: TagActionState }) {
  if (!state.message) return null;
  return <p className={state.ok ? "text-sm text-green-700 md:col-span-4" : "text-sm text-red-700 md:col-span-4"}>{state.message}</p>;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}
