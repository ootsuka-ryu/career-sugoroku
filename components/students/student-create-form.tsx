"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Save } from "lucide-react";
import { createStudent, type CreateStudentState } from "@/app/(dashboard)/students/new/actions";
import { FolderedTagSelector } from "@/components/tags/foldered-tag-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motivationRanks } from "@/lib/students/options";

type StaffItem = {
  id: string;
  name: string;
  email: string;
};

type TagItem = {
  id: string;
  name: string;
  color: string;
};

const initialState: CreateStudentState = {
  ok: false,
  message: ""
};

export function StudentCreateForm({
  staffUsers,
  tags
}: {
  staffUsers: StaffItem[];
  tags: TagItem[];
}) {
  const [state, action] = useFormState(createStudent, initialState);
  const [staffIds, setStaffIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);

  return (
    <form action={action} className="space-y-6">
      <input name="staff_ids" type="hidden" value={staffIds.join(",")} />
      <input name="tag_ids" type="hidden" value={tagIds.join(",")} />

      <section className="rounded-md border bg-white p-5">
        <h2 className="text-lg font-semibold">基本情報</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="氏名" required>
            <Input name="real_name" placeholder="例：山田 花子" required />
          </Field>
          <Field label="フリガナ">
            <Input name="kana" placeholder="例：ヤマダ ハナコ" />
          </Field>
          <Field label="LINE表示名">
            <Input name="display_name" placeholder="未入力なら氏名を使います" />
          </Field>
          <Field label="大学">
            <Input name="university" placeholder="例：東京薬科大学" />
          </Field>
          <Field label="学年">
            <Input name="grade" placeholder="例：5年" />
          </Field>
          <Field label="卒業年度">
            <Input name="graduation_year" placeholder="例：2027" type="number" />
          </Field>
          <Field label="実習時期">
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" name="practical_period">
              <option value="undecided">未定</option>
              <option value="P1_2">1-2期</option>
              <option value="P2_3">2-3期</option>
              <option value="P3_4">3-4期</option>
            </select>
          </Field>
          <Field label="志望度">
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" name="motivation_rank">
              <option value="">未設定</option>
              {motivationRanks.map((rank) => (
                <option key={rank} value={rank}>{rank}</option>
              ))}
            </select>
          </Field>
          <Field label="電話番号">
            <Input name="phone" placeholder="例：090-0000-0000" />
          </Field>
          <Field label="メール">
            <Input name="email" placeholder="example@example.com" type="email" />
          </Field>
          <Field label="希望職種">
            <Input name="desired_job_type" placeholder="例：調剤薬局" />
          </Field>
          <Field label="希望エリア">
            <Input name="desired_area" placeholder="例：東京、神奈川" />
          </Field>
          <Field label="初回接点">
            <Input name="first_contact_method" placeholder="例：合同説明会" />
          </Field>
          <Field label="ステータス">
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" name="status">
              <option value="active">対応中</option>
              <option value="waiting_reply">返信待ち</option>
              <option value="interviewing">面談中</option>
              <option value="offered">内定</option>
              <option value="closed">終了</option>
            </select>
          </Field>
        </div>
        <Field className="mt-4" label="次アクション">
          <Textarea name="manual_next_action" placeholder="例：3日後に店舗見学の日程確認を送る" />
        </Field>
      </section>

      <section className="rounded-md border bg-white p-5">
        <h2 className="text-lg font-semibold">担当者・タグ</h2>
        <div className="mt-4 space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium">担当者</p>
            <div className="flex flex-wrap gap-2">
              {staffUsers.map((staff) => (
                <TogglePill
                  active={staffIds.includes(staff.id)}
                  key={staff.id}
                  label={staff.name}
                  onClick={() =>
                    setStaffIds((current) =>
                      current.includes(staff.id)
                        ? current.filter((id) => id !== staff.id)
                        : [...current, staff.id]
                    )
                  }
                />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">タグ</p>
            <FolderedTagSelector
              maxHeightClassName="max-h-56"
              onToggle={(tagId) =>
                setTagIds((current) =>
                  current.includes(tagId)
                    ? current.filter((id) => id !== tagId)
                    : [...current, tagId]
                )
              }
              selectedTagIds={tagIds}
              tags={tags}
            />
          </div>
        </div>
      </section>

      {state.message ? (
        <p className={state.ok ? "text-sm text-green-700" : "text-sm text-red-700"}>
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  className,
  children
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={className}>
      <span className="mb-1 flex items-center gap-2 text-sm font-medium">
        {label}
        {required ? (
          <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">
            必須
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

function TogglePill({
  active,
  label,
  color,
  onClick
}: {
  active: boolean;
  label: string;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      className={
        active
          ? "rounded-full border border-blue-500 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700"
          : "rounded-full border bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
      }
      onClick={onClick}
      type="button"
    >
      {color ? (
        <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      ) : null}
      {label}
    </button>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} type="submit">
      <Save className="mr-2 h-4 w-4" />
      {pending ? "登録中..." : "学生を登録"}
    </Button>
  );
}
