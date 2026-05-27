"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Grid2X2, Save } from "lucide-react";
import {
  createBroadcast,
  type BroadcastActionState
} from "@/app/(dashboard)/broadcasts/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FolderedTagSelector } from "@/components/tags/foldered-tag-selector";
import type { TagSummary } from "@/lib/students/types";

const initialState: BroadcastActionState = {
  ok: false,
  message: ""
};

export function BroadcastForm({
  tags,
  surveys
}: {
  tags: TagSummary[];
  surveys: Array<{ id: string; title: string; url: string }>;
}) {
  const [state, formAction] = useFormState(createBroadcast, initialState);
  const [kind, setKind] = useState<"text" | "grid_flex">("text");
  const [rows, setRows] = useState<2 | 3>(2);
  const cellIndexes = useMemo(
    () => Array.from({ length: rows * 2 }, (_, index) => index + 1),
    [rows]
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">配信タイトル</Label>
          <Input id="title" name="title" placeholder="5月 店舗見学案内" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="scheduled_at">予約日時</Label>
          <Input id="scheduled_at" name="scheduled_at" type="datetime-local" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="broadcast_kind">配信形式</Label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            id="broadcast_kind"
            name="broadcast_kind"
            onChange={(event) => setKind(event.target.value as "text" | "grid_flex")}
            value={kind}
          >
            <option value="text">通常テキスト</option>
            <option value="grid_flex">グリッド型 Flex</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="target_mode">タグ条件</Label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            defaultValue="or"
            id="target_mode"
            name="target_mode"
          >
            <option value="or">OR: いずれかのタグに一致</option>
            <option value="and">AND: すべてのタグに一致</option>
          </select>
        </div>
      </div>

      {kind === "text" ? (
        <div className="space-y-2">
          {surveys.length > 0 ? (
            <>
              <Label htmlFor="survey_url">保管アンケート</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                id="survey_url"
                name="survey_url"
              >
                <option value="">挿入しない</option>
                {surveys.map((survey) => (
                  <option key={survey.id} value={survey.url}>
                    {survey.title}
                  </option>
                ))}
              </select>
            </>
          ) : null}
          <Label htmlFor="text">本文</Label>
          <Textarea
            id="text"
            name="text"
            placeholder="こんにちは。今月の店舗見学日程をご案内します。"
          />
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border bg-secondary/30 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="alt_text">通知文</Label>
              <Input
                defaultValue="イベント情報"
                id="alt_text"
                name="alt_text"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grid_rows">グリッド</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                id="grid_rows"
                name="grid_rows"
                onChange={(event) => setRows(Number(event.target.value) === 3 ? 3 : 2)}
                value={rows}
              >
                <option value={2}>2 x 2</option>
                <option value={3}>3 x 2</option>
              </select>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {cellIndexes.map((index) => (
              <div className="space-y-3 rounded-md border bg-card p-3" key={index}>
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Grid2X2 className="h-4 w-4 text-primary" />
                  セル {index}
                </p>
                <Input name={`cell_${index}_title`} placeholder="カードタイトル" />
                <Input
                  name={`cell_${index}_image_url`}
                  placeholder="画像URL https://..."
                  type="url"
                />
                <Input
                  name={`cell_${index}_detail_url`}
                  placeholder="詳細URL https://..."
                  type="url"
                />
                <Input
                  name={`cell_${index}_apply_url`}
                  placeholder="申込URL https://..."
                  type="url"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <TagCheckboxGroup
          fieldName="target_tag_ids"
          label="配信対象タグ"
          tags={tags}
        />
        <TagCheckboxGroup
          fieldName="excluded_tag_ids"
          label="除外タグ"
          tags={tags}
        />
      </div>

      <NoReplyFollowupFields surveys={surveys} />

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
    </form>
  );
}

function NoReplyFollowupFields({
  surveys
}: {
  surveys: Array<{ id: string; title: string; url: string }>;
}) {
  const dayOptions = [1, 2, 3, 5, 7, 10, 14, 21, 30];

  return (
    <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/70 p-4">
      <div>
        <p className="text-sm font-semibold text-blue-950">返信・回答なし自動追撃</p>
        <p className="mt-1 text-xs text-muted-foreground">
          配信後、条件に当てはまる学生だけへ自動で追加メッセージを送ります。最大4通まで設定できます。
        </p>
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((index) => (
          <div className="rounded-md border bg-background p-3" key={index}>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input name={`followup_enabled_${index}`} type="checkbox" value="yes" />
              {index}通目の追撃を使う
            </label>
            <div className="mt-3 grid gap-3 md:grid-cols-[10rem_10rem_1fr]">
              <div className="space-y-1">
                <Label htmlFor={`followup_delay_days_${index}`}>送るタイミング</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue={index === 1 ? 3 : index === 2 ? 7 : index === 3 ? 14 : 21}
                  id={`followup_delay_days_${index}`}
                  name={`followup_delay_days_${index}`}
                >
                  {dayOptions.map((days) => (
                    <option key={days} value={days}>
                      {days}日後
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`followup_condition_mode_${index}`}>条件の組み合わせ</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue="or"
                  id={`followup_condition_mode_${index}`}
                  name={`followup_condition_mode_${index}`}
                >
                  <option value="or">OR: どちらか一致</option>
                  <option value="and">AND: 両方一致</option>
                </select>
              </div>
              <div className="space-y-2 rounded-md bg-secondary/40 p-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    defaultChecked
                    name={`followup_require_no_reply_${index}`}
                    type="checkbox"
                    value="yes"
                  />
                  返信がない
                </label>
                <div className="grid gap-2 md:grid-cols-[9rem_1fr]">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      name={`followup_require_survey_unanswered_${index}`}
                      type="checkbox"
                      value="yes"
                    />
                    アンケート未回答
                  </label>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    name={`followup_survey_id_${index}`}
                  >
                    <option value="">対象アンケートを選択</option>
                    {surveys.map((survey) => (
                      <option key={survey.id} value={survey.id}>
                        {survey.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <Label htmlFor={`followup_text_${index}`}>条件に合う場合に送る文章</Label>
              <Textarea
                id={`followup_text_${index}`}
                name={`followup_text_${index}`}
                placeholder="先日お送りしたご案内はいかがでしたか？気になる点があればお気軽に返信してください。"
                rows={2}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TagCheckboxGroup({
  label,
  fieldName,
  tags
}: {
  label: string;
  fieldName: string;
  tags: TagSummary[];
}) {
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  function toggleTag(tagId: string) {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId]
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {selectedTagIds.map((tagId) => (
        <input key={tagId} name={fieldName} type="hidden" value={tagId} />
      ))}
      <FolderedTagSelector
        onToggle={toggleTag}
        selectedTagIds={selectedTagIds}
        tags={tags}
      />
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      <Save className="mr-2 h-4 w-4" />
      {pending ? "保存中..." : "下書き/予約を保存"}
    </Button>
  );
}
