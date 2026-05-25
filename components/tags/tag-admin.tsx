"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Edit3, Plus, Save, Search, Trash2 } from "lucide-react";
import { deleteTag, saveTag, type TagActionState } from "@/app/(dashboard)/tags/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { localizeSampleText } from "@/lib/display/localize";

type TagItem = {
  id: string;
  name: string;
  color: string;
  student_count: number;
};

const initialState: TagActionState = {
  ok: false,
  message: ""
};

export function TagAdmin({ tags }: { tags: TagItem[] }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<TagItem | null>(null);
  const filteredTags = tags.filter((tag) =>
    (localizeSampleText(tag.name) ?? tag.name)
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <section className="rounded-md border bg-white p-5">
        <h2 className="text-lg font-semibold">
          {editing ? "タグを編集" : "新しいタグ"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          学生の分類、配信対象、アンケート回答後の自動付与に使います。
        </p>
        <TagForm editing={editing} onCancel={() => setEditing(null)} />
      </section>

      <section className="rounded-md border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div>
            <h2 className="font-semibold">タグ一覧</h2>
            <p className="text-sm text-muted-foreground">
              {filteredTags.length} / {tags.length}件を表示
            </p>
          </div>
          <div className="relative min-w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="タグ名で検索"
              value={query}
            />
          </div>
        </div>

        <div className="divide-y">
          {filteredTags.length > 0 ? (
            filteredTags.map((tag) => (
              <div className="grid gap-3 p-4 md:grid-cols-[1fr_8rem_14rem] md:items-center" key={tag.id}>
                <div className="flex items-center gap-3">
                  <span className="h-5 w-5 rounded-full border" style={{ backgroundColor: tag.color }} />
                  <div>
                    <p className="font-medium">{localizeSampleText(tag.name) ?? tag.name}</p>
                    {tag.name !== (localizeSampleText(tag.name) ?? tag.name) ? (
                      <p className="text-xs text-muted-foreground">元の名前: {tag.name}</p>
                    ) : null}
                  </div>
                </div>
                <Badge variant="outline">{tag.student_count}名</Badge>
                <div className="flex gap-2 md:justify-end">
                  <Button onClick={() => setEditing(tag)} size="sm" type="button" variant="outline">
                    <Edit3 className="mr-1.5 h-4 w-4" />
                    編集
                  </Button>
                  <DeleteTagButton tagId={tag.id} />
                </div>
              </div>
            ))
          ) : (
            <p className="p-8 text-center text-sm text-muted-foreground">
              条件に合うタグがありません。
            </p>
          )}
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

  return (
    <form action={action} className="mt-5 space-y-4" key={editing?.id ?? "new"}>
      <input name="tag_id" type="hidden" value={editing?.id ?? ""} />
      <div className="space-y-2">
        <label className="text-sm font-medium">タグ名</label>
        <Input
          defaultValue={editing ? localizeSampleText(editing.name) ?? editing.name : ""}
          name="name"
          placeholder="例：高志望度"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">色</label>
        <div className="flex gap-2">
          <input
            className="h-10 w-16 rounded border"
            name="color"
            onChange={(event) => setColor(event.target.value)}
            type="color"
            value={color}
          />
          <Input readOnly value={color} />
        </div>
      </div>
      <FormMessage state={state} />
      <div className="flex gap-2">
        <SubmitButton editing={Boolean(editing)} />
        {editing ? (
          <Button onClick={onCancel} type="button" variant="outline">
            キャンセル
          </Button>
        ) : null}
      </div>
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
      <Button size="sm" type="submit" variant="ghost">
        <Trash2 className="mr-1.5 h-4 w-4" />
        削除
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
    <p className={state.ok ? "text-sm text-green-700" : "text-sm text-red-700"}>
      {state.message}
    </p>
  );
}
