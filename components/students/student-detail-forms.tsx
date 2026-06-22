"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus, Save, X } from "lucide-react";
import {
  addStudentAction,
  addStudentTag,
  removeStudentTag,
  updateStudentProfile,
  type StudentActionState
} from "@/app/(dashboard)/students/[id]/actions";
import { FolderedTagSelector } from "@/components/tags/foldered-tag-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  localizeKanaText,
  localizeSampleText,
  localizeStatus
} from "@/lib/display/localize";
import { groupTagsByFolder } from "@/lib/tags/group-tags";
import {
  candidateStages,
  declineReasons,
  getCandidateStageLabel,
  getMotivationRankLabel,
  motivationRanks
} from "@/lib/students/options";
import { studentFunnelFlagFields } from "@/lib/recruiting/funnel";
import type { StudentDetail, TagSummary } from "@/lib/students/types";

const initialState: StudentActionState = {
  ok: false,
  message: ""
};

export function StudentProfileForm({ student }: { student: StudentDetail }) {
  const [state, formAction] = useFormState(updateStudentProfile, initialState);
  const formId = getStudentEditFormId(student.id);

  return (
    <form action={formAction} className="space-y-4" id={formId}>
      <input name="student_id" type="hidden" value={student.id} />
      <input name="expected_updated_at" type="hidden" value={student.updated_at} />

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="氏名"
          name="real_name"
          required
          value={localizeSampleText(student.real_name) ?? ""}
        />
        <Field label="カナ" name="kana" value={localizeKanaText(student.kana) ?? ""} />
        <Field label="大学" name="university" value={localizeSampleText(student.university) ?? ""} />
        <Field label="学年" name="grade" value={student.grade ?? ""} />
        <Field
          label="卒業年度"
          name="graduation_year"
          type="number"
          value={student.graduation_year?.toString() ?? ""}
        />
        <SelectField
          label="実習時期"
          name="practical_period"
          value={student.practical_period}
          options={[
            ["P1_2", "1-2期"],
            ["P2_3", "2-3期"],
            ["P3_4", "3-4期"],
            ["undecided", "未定"]
          ]}
        />
        <SelectField
          label="ゴダイへの確度"
          name="motivation_rank"
          value={
            getMotivationRankLabel(student.motivation_rank, student.motivation_level) === "-"
              ? ""
              : getMotivationRankLabel(student.motivation_rank, student.motivation_level)
          }
          options={[
            ["", "未設定"],
            ...motivationRanks.map((rank) => [rank, rank] as [string, string])
          ]}
        />
        <SelectField
          label="候補者ステージ"
          name="candidate_stage"
          value={student.candidate_stage ?? "friend_added"}
          options={candidateStages.map((stage) => [stage.value, stage.label])}
        />
        <SelectField
          label="辞退・離脱理由"
          name="decline_reason"
          value={student.decline_reason ?? ""}
          options={[
            ["", "未設定"],
            ...declineReasons.map((reason) => [reason, reason] as [string, string])
          ]}
        />
        <Field
          label="希望職種"
          name="desired_job_type"
          value={localizeSampleText(student.desired_job_type) ?? ""}
        />
        <Field label="希望エリア" name="desired_area" value={localizeSampleText(student.desired_area) ?? ""} />
        <Field label="電話番号" name="phone" value={student.phone ?? ""} />
        <Field label="メール" name="email" type="email" value={student.email ?? ""} />
        <SelectField
          label="ステータス"
          name="status"
          value={student.status}
          options={[
            [student.status, localizeStatus(student.status) ?? student.status],
            ["active", "対応中"],
            ["urgent", "至急対応"],
            ["archived", "完了"]
          ]}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">備考</Label>
        <Textarea
          className="max-h-44 resize-y"
          defaultValue={localizeSampleText(student.notes) ?? ""}
          id="notes"
          name="notes"
          placeholder="面談メモ、AI要約、注意事項などを記録"
          rows={6}
        />
        <p className="text-xs text-muted-foreground">
          録音のAI要約はここへ自動で追記されます。
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="manual_next_action">ネクストアクション</Label>
        <Textarea
          className="max-h-32 resize-y"
          defaultValue={localizeSampleText(student.manual_next_action) ?? ""}
          id="manual_next_action"
          name="manual_next_action"
          rows={3}
          placeholder="今後行う予定の内容を入力"
        />
        <p className="text-xs text-muted-foreground">
          例：5月25日に説明会の参加確認をLINEで送る
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        現在の進捗: {getCandidateStageLabel(student.candidate_stage)}
      </p>
      <FormMessage state={state} />
    </form>
  );
}

export function StudentFunnelFlagForm({ student }: { student: StudentDetail }) {
  const formId = getStudentEditFormId(student.id);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {studentFunnelFlagFields.map((field) => (
          <label
            className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
            key={field.name}
          >
            <input
              className="h-4 w-4"
              defaultChecked={Boolean(student[field.name])}
              form={formId}
              name={field.name}
              type="checkbox"
            />
            {field.label}
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        LINEでやり取りが発生した学生は、自動で「未母集団」が外れ「母集団」に入ります。
      </p>
    </div>
  );
}

export function StudentPageSaveButton({ studentId }: { studentId: string }) {
  return (
    <Button form={getStudentEditFormId(studentId)} type="submit">
      <Save className="mr-2 h-4 w-4" />
      このページの編集内容を保存
    </Button>
  );
}

function getStudentEditFormId(studentId: string) {
  return `student-edit-form-${studentId}`;
}

const interviewMemoTemplate = `希望勤務地：
実習時期：
不安点：
競合企業：
次回約束：
補足メモ：`;

export function StudentActionForm({ studentId }: { studentId: string }) {
  const [state, formAction] = useFormState(addStudentAction, initialState);
  const [body, setBody] = useState("");

  return (
    <form action={formAction} className="space-y-4">
      <input name="student_id" type="hidden" value={studentId} />
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="種別"
          name="action_type"
          value="line"
          options={[
            ["line", "LINE"],
            ["call", "電話"],
            ["zoom", "Zoom"],
            ["email", "メール"],
            ["event", "イベント"],
            ["note", "面談メモ"],
            ["ai", "AI"]
          ]}
        />
        <Field label="実施日時" name="executed_at" type="datetime-local" />
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:items-end">
        <div className="flex-1">
          <Field label="タイトル" name="title" required />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setBody(interviewMemoTemplate)}
        >
          面談メモテンプレートを入れる
        </Button>
      </div>
      <div className="space-y-2">
        <Label htmlFor="body">実施済アクション</Label>
        <Textarea
          className="max-h-36 resize-y"
          id="body"
          name="body"
          rows={4}
          onChange={(event) => setBody(event.target.value)}
          placeholder="すでに実施した内容、学生の反応、次に活かすメモを入力"
          value={body}
        />
      </div>
      <FormMessage state={state} />
      <SubmitButton icon="plus" label="実施済アクションを追加" />
    </form>
  );
}

export function StudentTagManager({
  studentId,
  currentTags,
  allTags
}: {
  studentId: string;
  currentTags: TagSummary[];
  allTags: TagSummary[];
}) {
  const [addState, addAction] = useFormState(addStudentTag, initialState);
  const [removeState, removeAction] = useFormState(removeStudentTag, initialState);
  const [tagIdToAdd, setTagIdToAdd] = useState("");
  const currentTagIds = new Set(currentTags.map((tag) => tag.id));
  const availableTags = allTags.filter((tag) => !currentTagIds.has(tag.id));
  const currentTagFolders = groupTagsByFolder(currentTags);

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-md border bg-background p-2">
        {currentTags.length > 0 ? (
          currentTagFolders.map((folder) => (
            <details className="rounded-md border bg-card" key={folder.id}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-medium">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: folder.color }}
                  />
                  <span className="truncate">{folder.name}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {folder.tags.length}件
                </span>
              </summary>
              <div className="flex max-h-36 flex-wrap gap-2 overflow-auto border-t p-2">
                {folder.tags.map((tag) => (
                  <form action={removeAction} key={tag.id}>
                    <input name="student_id" type="hidden" value={studentId} />
                    <input name="tag_id" type="hidden" value={tag.id} />
                    <Button
                      size="sm"
                      style={{ borderColor: tag.color, color: tag.color }}
                      type="submit"
                      variant="outline"
                    >
                      {localizeSampleText(tag.name)}
                      <X className="ml-2 h-3.5 w-3.5" />
                    </Button>
                  </form>
                ))}
              </div>
            </details>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">タグはまだありません。</p>
        )}
      </div>

      <form action={addAction} className="space-y-3">
        <input name="student_id" type="hidden" value={studentId} />
        <input name="tag_id" type="hidden" value={tagIdToAdd} />
        <FolderedTagSelector
          emptyMessage="追加できるタグがありません。"
          maxHeightClassName="max-h-44"
          onToggle={(tagId) => setTagIdToAdd((current) => (current === tagId ? "" : tagId))}
          selectedTagIds={tagIdToAdd ? [tagIdToAdd] : []}
          tags={availableTags}
        />
        <SubmitButton disabled={!tagIdToAdd || availableTags.length === 0} icon="plus" label="選択したタグを追加" />
      </form>
      <FormMessage state={addState.message ? addState : removeState} />
    </div>
  );
}

function Field({
  label,
  name,
  value,
  type = "text",
  required = false
}: {
  label: string;
  name: string;
  value?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        defaultValue={value}
        id={name}
        name={name}
        required={required}
        type={type}
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  options
}: {
  label: string;
  name: string;
  value: string;
  options: [string, string][];
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        defaultValue={value}
        id={name}
        name={name}
      >
        {options.map(([optionValue, label]) => (
          <option key={`${name}-${optionValue}-${label}`} value={optionValue}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SubmitButton({
  label,
  icon,
  disabled = false
}: {
  label: string;
  icon: "save" | "plus";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const Icon = icon === "save" ? Save : Plus;

  return (
    <Button disabled={pending || disabled} type="submit">
      <Icon className="mr-2 h-4 w-4" />
      {pending ? "保存中..." : label}
    </Button>
  );
}

function FormMessage({ state }: { state: StudentActionState }) {
  if (!state.message) return null;

  return (
    <p
      className={
        state.ok
          ? "rounded-md bg-accent/10 px-3 py-2 text-sm text-accent"
          : "rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
      }
    >
      {state.message}
    </p>
  );
}
