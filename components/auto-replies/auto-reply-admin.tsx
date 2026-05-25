"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Edit3, Plus, Save, Search, Trash2 } from "lucide-react";
import {
  deleteAutoReply,
  saveAutoReply,
  type AutoReplyActionState
} from "@/app/(dashboard)/auto-replies/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type AutoReplyItem = {
  id: string;
  trigger_keyword: string;
  match_type: "exact" | "contains" | "regex";
  reply_text: string;
  is_active: boolean;
  updated_at: string;
};

const initialState: AutoReplyActionState = {
  ok: false,
  message: ""
};

const matchLabels = {
  exact: "完全一致",
  contains: "部分一致",
  regex: "正規表現"
};

export function AutoReplyAdmin({ replies }: { replies: AutoReplyItem[] }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AutoReplyItem | null>(null);
  const filteredReplies = replies.filter((reply) => {
    const text = `${reply.trigger_keyword} ${reply.reply_text}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[440px_1fr]">
      <section className="rounded-md border bg-white p-5">
        <h2 className="text-lg font-semibold">
          {editing ? "自動応答を編集" : "新しい自動応答"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          学生から届いたLINEメッセージのキーワードに応じて、自動で返信します。
        </p>
        <AutoReplyForm editing={editing} onCancel={() => setEditing(null)} />
      </section>

      <section className="rounded-md border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div>
            <h2 className="font-semibold">自動応答一覧</h2>
            <p className="text-sm text-muted-foreground">
              {filteredReplies.length} / {replies.length}件を表示
            </p>
          </div>
          <div className="relative min-w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="キーワード・返信文で検索"
              value={query}
            />
          </div>
        </div>

        <div className="divide-y">
          {filteredReplies.length > 0 ? (
            filteredReplies.map((reply) => (
              <div className="grid gap-3 p-4 lg:grid-cols-[1fr_8rem_7rem_12rem] lg:items-center" key={reply.id}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{reply.trigger_keyword}</p>
                    <Badge variant={reply.is_active ? "accent" : "outline"}>
                      {reply.is_active ? "有効" : "停止中"}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {reply.reply_text}
                  </p>
                </div>
                <span className="text-sm">{matchLabels[reply.match_type]}</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(reply.updated_at).toLocaleDateString("ja-JP")}
                </span>
                <div className="flex gap-2 lg:justify-end">
                  <Button onClick={() => setEditing(reply)} size="sm" type="button" variant="outline">
                    <Edit3 className="mr-1.5 h-4 w-4" />
                    編集
                  </Button>
                  <DeleteAutoReplyButton autoReplyId={reply.id} />
                </div>
              </div>
            ))
          ) : (
            <div className="p-10 text-center text-sm text-muted-foreground">
              自動応答がありません。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function AutoReplyForm({
  editing,
  onCancel
}: {
  editing: AutoReplyItem | null;
  onCancel: () => void;
}) {
  const [state, action] = useFormState(saveAutoReply, initialState);

  return (
    <form action={action} className="mt-5 space-y-4" key={editing?.id ?? "new"}>
      <input name="auto_reply_id" type="hidden" value={editing?.id ?? ""} />
      <div className="space-y-2">
        <label className="text-sm font-medium">キーワード</label>
        <Input
          defaultValue={editing?.trigger_keyword ?? ""}
          name="trigger_keyword"
          placeholder="例：店舗見学"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">一致条件</label>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          defaultValue={editing?.match_type ?? "contains"}
          name="match_type"
        >
          <option value="contains">部分一致</option>
          <option value="exact">完全一致</option>
          <option value="regex">正規表現</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">返信文</label>
        <Textarea
          defaultValue={editing?.reply_text ?? ""}
          name="reply_text"
          placeholder="お問い合わせありがとうございます。担当者よりご連絡します。"
          required
          rows={5}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input defaultChecked={editing?.is_active ?? true} name="is_active" type="checkbox" />
        有効にする
      </label>
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

function DeleteAutoReplyButton({ autoReplyId }: { autoReplyId: string }) {
  const [state, action] = useFormState(deleteAutoReply, initialState);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!confirm("この自動応答を削除します。よろしいですか？")) {
          event.preventDefault();
        }
      }}
    >
      <input name="auto_reply_id" type="hidden" value={autoReplyId} />
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

function FormMessage({ state }: { state: AutoReplyActionState }) {
  if (!state.message) return null;
  return (
    <p className={state.ok ? "text-sm text-green-700" : "text-sm text-red-700"}>
      {state.message}
    </p>
  );
}
