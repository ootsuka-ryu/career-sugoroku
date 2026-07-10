"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  FileUp,
  Heading2,
  ListChecks,
  ListFilter,
  Pencil,
  Plus,
  Save,
  Trash2,
  Type
} from "lucide-react";
import {
  addSurveyQuestion,
  addSurveySection,
  deleteSurveyQuestion,
  deleteSurveySection,
  duplicateSurveySection,
  moveSurveyQuestion,
  moveSurveySection,
  updateSurveyQuestion,
  updateSurveySettings,
  type SurveyBuilderState
} from "@/app/(dashboard)/surveys/[id]/builder/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SurveyMediaPicker } from "@/components/surveys/survey-media-picker";
import { TagRulePicker } from "@/components/surveys/tag-rule-picker";
import type { Json } from "@/lib/supabase/database.types";
import type { TagSummary } from "@/lib/students/types";

type FolderItem = {
  id: string;
  name: string;
  description: string | null;
};

type SurveyItem = {
  id: string;
  title: string;
  admin_title: string | null;
  public_title: string | null;
  description: string | null;
  folder_id: string | null;
  is_active: boolean;
  is_visible: boolean;
  one_response_per_student: boolean;
  redirect_url: string | null;
  thank_you_message: string | null;
  custom_css: string | null;
};

type SectionItem = {
  id: string;
  order: number;
  title: string;
  description: string | null;
  is_visible: boolean;
};

type QuestionItem = {
  id: string;
  section_id: string | null;
  order: number;
  type: "heading" | "text" | "radio" | "checkbox" | "select" | "file_upload";
  label: string;
  description: string | null;
  placeholder: string | null;
  validation_type: "none" | "email" | "phone";
  options_jsonb: Json;
  is_required: boolean;
  is_visible: boolean;
  attached_image_url: string | null;
  branch_rules_jsonb: Json;
  settings_jsonb: Json;
  tag_rules: Array<{
    tag: TagSummary | null;
    when_answer_matches_jsonb: Json;
  }>;
};

type QuestionType = QuestionItem["type"];

const initialState: SurveyBuilderState = {
  ok: false,
  message: ""
};

const questionTypeLabels: Record<QuestionType, string> = {
  heading: "見出し",
  text: "記述式",
  radio: "ラジオボタン",
  checkbox: "チェックボックス",
  select: "プルダウン",
  file_upload: "ファイル添付"
};

const validationTypeLabels = {
  none: "入力規則なし",
  email: "メールアドレス",
  phone: "電話番号"
};

const compactInputClass =
  "h-9 rounded border-slate-300 bg-white px-3 text-sm shadow-none focus-visible:ring-1";
const compactTextareaClass =
  "min-h-9 rounded border-slate-300 bg-white px-3 py-2 text-sm shadow-none focus-visible:ring-1";
const compactSelectClass =
  "h-9 rounded border border-slate-300 bg-white px-3 text-sm shadow-none";

const profileTargetOptions = [
  { value: "real_name", label: "氏名" },
  { value: "display_name", label: "システム表示名" },
  { value: "kana", label: "カナ" },
  { value: "university", label: "大学" },
  { value: "graduation_year", label: "卒業年度" },
  { value: "grade", label: "学年" },
  { value: "phone", label: "電話番号" },
  { value: "email", label: "メール" },
  { value: "desired_area", label: "希望エリア" },
  { value: "desired_job_type", label: "希望職種" }
] as const;

type ProfileTargetValue = (typeof profileTargetOptions)[number]["value"];

const questionTypeIcons: Record<QuestionType, ReactNode> = {
  heading: <Heading2 className="h-4 w-4" />,
  text: <Type className="h-4 w-4" />,
  radio: <ListChecks className="h-4 w-4" />,
  checkbox: <ListChecks className="h-4 w-4" />,
  select: <ListFilter className="h-4 w-4" />,
  file_upload: <FileUp className="h-4 w-4" />
};

const elementItems: Array<{ label: string; type: QuestionType; icon: ReactNode }> = [
  { label: "小見出し", type: "heading", icon: <Heading2 className="h-4 w-4" /> },
  { label: "中見出し", type: "heading", icon: <Heading2 className="h-4 w-4" /> },
  { label: "記述式(テキストボックス)", type: "text", icon: <Type className="h-4 w-4" /> },
  { label: "段落(テキストエリア)", type: "text", icon: <Type className="h-4 w-4" /> },
  { label: "チェックボックス", type: "checkbox", icon: <ListChecks className="h-4 w-4" /> },
  { label: "ラジオボタン", type: "radio", icon: <ListChecks className="h-4 w-4" /> },
  { label: "プルダウン", type: "select", icon: <ListFilter className="h-4 w-4" /> },
  { label: "ファイル添付", type: "file_upload", icon: <FileUp className="h-4 w-4" /> },
  { label: "都道府県", type: "select", icon: <ListFilter className="h-4 w-4" /> },
  { label: "日付", type: "text", icon: <Type className="h-4 w-4" /> }
];

const sampleTextMap: Record<string, string> = {
  "Current motivation level": "現在の志望度",
  "Interested topics": "興味のある内容",
  "Questions or concerns": "質問・相談したいこと",
  "Store visit": "店舗見学",
  Training: "研修",
  Benefits: "福利厚生",
  "Community medicine": "地域医療"
};

function toJapaneseSampleText(value: string | null | undefined) {
  if (!value) return "";
  return sampleTextMap[value] ?? value;
}

export function SurveyBuilder({
  survey,
  sections,
  questions,
  tags,
  folders
}: {
  survey: SurveyItem;
  sections: SectionItem[];
  questions: QuestionItem[];
  tags: TagSummary[];
  folders: FolderItem[];
}) {
  const [optionState, optionAction] = useFormState(
    updateSurveySettings,
    initialState
  );
  const [sectionState, sectionAction] = useFormState(
    addSurveySection,
    initialState
  );
  const [tab, setTab] = useState<"options" | "design" | "auto">("options");
  const [basicValues, setBasicValues] = useState({
    adminTitle: survey.admin_title || survey.title,
    folderId: survey.folder_id ?? "",
    publicTitle: survey.public_title || survey.title,
    description: survey.description ?? ""
  });

  function submitOpenQuestionForms() {
    document
      .querySelectorAll<HTMLFormElement>('form[data-survey-question-form="true"]')
      .forEach((form) => form.requestSubmit());
  }

  return (
    <div className="space-y-5">
      <section className="rounded-md border-2 border-slate-300 bg-card p-5">
        <h2 className="mb-5 text-xl font-semibold">回答フォーム登録</h2>
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-[14rem_1fr] md:items-center">
            <Label className="md:text-right">
              <span className="mr-2 rounded bg-destructive px-1.5 py-0.5 text-xs text-destructive-foreground">
                必須
              </span>
              フォーム名(管理用)
            </Label>
            <Input
              className={compactInputClass}
              onChange={(event) =>
                setBasicValues((current) => ({
                  ...current,
                  adminTitle: event.target.value
                }))
              }
              required
              value={basicValues.adminTitle}
            />
            <Label className="md:text-right">フォルダ</Label>
            <select
              className={compactSelectClass}
              onChange={(event) =>
                setBasicValues((current) => ({
                  ...current,
                  folderId: event.target.value
                }))
              }
              value={basicValues.folderId}
            >
              <option value="">未分類</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-md border p-5">
            <div className="grid gap-4 md:grid-cols-[14rem_1fr] md:items-start">
              <Label className="pt-2 md:text-right">タイトル</Label>
              <Input
                className={compactInputClass}
                onChange={(event) =>
                  setBasicValues((current) => ({
                    ...current,
                    publicTitle: event.target.value
                  }))
                }
                required
                value={basicValues.publicTitle}
              />
              <Label className="pt-2 md:text-right">説明</Label>
              <Textarea
                className={compactTextareaClass}
                onChange={(event) =>
                  setBasicValues((current) => ({
                    ...current,
                    description: event.target.value
                  }))
                }
                rows={3}
                value={basicValues.description}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-md border-2 border-sky-300 bg-sky-50/30 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">アンケート内容</h2>
          <form action={sectionAction}>
            <input name="survey_id" type="hidden" value={survey.id} />
            <input name="title" type="hidden" value={`セクション${sections.length + 1}`} />
            <input defaultChecked name="is_visible" type="hidden" value="on" />
            <Button type="submit" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              セクションを追加
            </Button>
          </form>
        </div>
        <FormMessage state={sectionState} />

        <div className="space-y-5">
          {sections.length === 0 && questions.length === 0 ? (
            <SectionEditor
              displayIndex={1}
              questions={[]}
              section={null}
              sections={sections}
              surveyId={survey.id}
              tags={tags}
            />
          ) : null}
          {questions.filter((question) => !question.section_id).length > 0 ? (
            <SectionEditor
              displayIndex={1}
              questions={questions.filter((question) => !question.section_id)}
              section={null}
              sections={sections}
              surveyId={survey.id}
              tags={tags}
            />
          ) : null}
          {sections.map((section, index) => (
            <SectionEditor
              displayIndex={index + 1}
              index={index}
              key={section.id}
              questions={questions.filter((question) => question.section_id === section.id)}
              section={section}
              sectionCount={sections.length}
              sections={sections}
              surveyId={survey.id}
              tags={tags}
            />
          ))}
        </div>
      </section>

      <section className="rounded-md border-2 border-slate-300 bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold">最後にオプションを設定</h2>
        <form action={optionAction} className="space-y-5" onSubmit={submitOpenQuestionForms}>
          <input name="survey_id" type="hidden" value={survey.id} />
          <input name="admin_title" type="hidden" value={basicValues.adminTitle} />
          <input name="public_title" type="hidden" value={basicValues.publicTitle} />
          <input name="description" type="hidden" value={basicValues.description} />
          <input name="folder_id" type="hidden" value={basicValues.folderId} />
          <input name="is_visible" type="hidden" value="on" />

          <Tabs tab={tab} setTab={setTab} />
          <div className="rounded-md border p-5">
            {tab === "options" ? <BuilderOptions survey={survey} /> : null}
            {tab === "design" ? <BuilderDesign survey={survey} /> : null}
            {tab === "auto" ? <BuilderAuto /> : null}
          </div>

          <FormMessage state={optionState} />
          <div className="flex justify-end gap-2">
            <SubmitButton label="保存" icon={<Save className="mr-2 h-4 w-4" />} />
          </div>
        </form>
      </section>
    </div>
  );
}

function SectionEditor({
  section,
  questions,
  surveyId,
  index = 0,
  sectionCount = 1,
  displayIndex,
  sections,
  tags
}: {
  section: SectionItem | null;
  questions: QuestionItem[];
  surveyId: string;
  index?: number;
  sectionCount?: number;
  displayIndex: number;
  sections: SectionItem[];
  tags: TagSummary[];
}) {
  const [questionState, questionAction] = useFormState(
    addSurveyQuestion,
    initialState
  );
  const [duplicateState, duplicateAction] = useFormState(
    duplicateSurveySection,
    initialState
  );
  const [moveState, moveAction] = useFormState(moveSurveySection, initialState);
  const [deleteState, deleteAction] = useFormState(deleteSurveySection, initialState);
  const [selectedType, setSelectedType] = useState<QuestionType>("text");
  const selectedLabel = questionTypeLabels[selectedType];

  return (
    <div className="rounded-md border border-slate-300 bg-white p-4 shadow-sm">
      <div className="border-l-4 border-slate-400 pl-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-medium">セクション{displayIndex}</h3>
          <div className="flex flex-wrap gap-2">
            <form action={duplicateAction}>
              <input name="survey_id" type="hidden" value={surveyId} />
              <input name="section_id" type="hidden" value={section?.id ?? ""} />
              <Button disabled={!section} size="sm" type="submit" variant="outline">
                <Copy className="mr-2 h-4 w-4" />
                セクション複製
              </Button>
            </form>
            <form action={moveAction}>
              <input name="survey_id" type="hidden" value={surveyId} />
              <input name="section_id" type="hidden" value={section?.id ?? ""} />
              <input name="direction" type="hidden" value="up" />
              <Button disabled={!section || index === 0} size="sm" type="submit" variant="outline">
                <ChevronUp className="mr-2 h-4 w-4" />
                上へ移動
              </Button>
            </form>
            <form action={moveAction}>
              <input name="survey_id" type="hidden" value={surveyId} />
              <input name="section_id" type="hidden" value={section?.id ?? ""} />
              <input name="direction" type="hidden" value="down" />
              <Button
                disabled={!section || index === sectionCount - 1}
                size="sm"
                type="submit"
                variant="outline"
              >
                <ChevronDown className="mr-2 h-4 w-4" />
                下へ移動
              </Button>
            </form>
            <form
              action={deleteAction}
              onSubmit={(event) => {
                if (!confirm("このセクションと中の設問を削除します。よろしいですか？")) {
                  event.preventDefault();
                }
              }}
            >
              <input name="survey_id" type="hidden" value={surveyId} />
              <input name="section_id" type="hidden" value={section?.id ?? ""} />
              <Button
                className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={!section}
                size="sm"
                type="submit"
                variant="outline"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                セクション削除
              </Button>
            </form>
          </div>
        </div>

        <FormMessage
          state={
            duplicateState.message
              ? duplicateState
              : moveState.message
                ? moveState
                : deleteState
          }
        />

        {questions.length > 0 ? (
          <div className="mt-5 space-y-3">
          {questions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                questionCount={questions.length}
                sections={sections}
                surveyId={surveyId}
                tags={tags}
              />
            ))}
          </div>
        ) : (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            下のボタンから、質問や見出しを追加してください。
          </p>
        )}

        <ElementPalette selectedType={selectedType} setSelectedType={setSelectedType} />

        <form
          action={questionAction}
          className="mt-5 rounded-md border-2 border-emerald-400 bg-emerald-50 p-4 shadow-sm"
        >
          <input name="survey_id" type="hidden" value={surveyId} />
          <input name="section_id" type="hidden" value={section?.id ?? ""} />
          <input name="type" type="hidden" value={selectedType} />
          <QuestionEditFields
            heading={`新しい${selectedLabel}を追加`}
            questionType={selectedType}
            sections={sections}
            tags={tags}
          />
          <div className="mt-4 flex justify-end">
            <Button type="submit">
              <Plus className="mr-2 h-4 w-4" />
              追加
            </Button>
          </div>
          <FormMessage state={questionState} />
        </form>
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  questionCount,
  surveyId,
  sections,
  tags
}: {
  question: QuestionItem;
  questionCount: number;
  surveyId: string;
  sections: SectionItem[];
  tags: TagSummary[];
}) {
  const [saveState, saveAction] = useFormState(updateSurveyQuestion, initialState);
  const [deleteState, deleteAction] = useFormState(deleteSurveyQuestion, initialState);
  const [moveState, moveAction] = useFormState(moveSurveyQuestion, initialState);
  const [isOpen, setIsOpen] = useState(false);
  const hasBranchRules =
    Array.isArray(question.branch_rules_jsonb) && question.branch_rules_jsonb.length > 0;
  const displayLabel = toJapaneseSampleText(question.label) || `無題の質問${question.order}`;

  return (
    <div className="overflow-hidden rounded border border-slate-300 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3 py-2">
        <button
          className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-left"
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          <span className="truncate font-medium">{displayLabel}</span>
          <span className="text-xs text-muted-foreground">
            {questionTypeLabels[question.type]}
          </span>
          {question.is_required ? (
            <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs font-semibold text-white">
              必須
            </span>
          ) : null}
          {hasBranchRules ? (
            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-700">
              セクション移動設定済み
            </span>
          ) : null}
        </button>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            onClick={() => setIsOpen((current) => !current)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Pencil className="mr-1.5 h-4 w-4" />
            編集
          </Button>
          <form action={moveAction}>
            <input name="survey_id" type="hidden" value={surveyId} />
            <input name="question_id" type="hidden" value={question.id} />
            <input name="section_id" type="hidden" value={question.section_id ?? ""} />
            <input name="direction" type="hidden" value="up" />
            <Button disabled={questionCount <= 1} size="sm" type="submit" variant="ghost">
              <ChevronUp className="mr-1.5 h-4 w-4" />
              上へ
            </Button>
          </form>
          <form action={moveAction}>
            <input name="survey_id" type="hidden" value={surveyId} />
            <input name="question_id" type="hidden" value={question.id} />
            <input name="section_id" type="hidden" value={question.section_id ?? ""} />
            <input name="direction" type="hidden" value="down" />
            <Button disabled={questionCount <= 1} size="sm" type="submit" variant="ghost">
              <ChevronDown className="mr-1.5 h-4 w-4" />
              下へ
            </Button>
          </form>
          <form
            action={deleteAction}
            onSubmit={(event) => {
              if (!confirm("この設問を削除します。よろしいですか？")) {
                event.preventDefault();
              }
            }}
          >
            <input name="survey_id" type="hidden" value={surveyId} />
            <input name="question_id" type="hidden" value={question.id} />
            <Button size="sm" type="submit" variant="ghost">
              <Trash2 className="mr-1.5 h-4 w-4" />
              削除
            </Button>
          </form>
        </div>
      </div>

      {isOpen ? (
        <form
          action={saveAction}
          className="border-t border-slate-200 p-3"
          data-survey-question-form="true"
        >
          <input name="survey_id" type="hidden" value={surveyId} />
          <input name="question_id" type="hidden" value={question.id} />
          <input name="section_id" type="hidden" value={question.section_id ?? ""} />
          <input name="type" type="hidden" value={question.type} />
          <QuestionEditFields
            defaultQuestion={question}
            heading="項目を編集"
            questionType={question.type}
            sections={sections}
            tags={tags}
          />
          <FormMessage
            state={
              saveState.message
                ? saveState
                : deleteState.message
                  ? deleteState
                  : moveState
            }
          />
        </form>
      ) : (
        <FormMessage state={deleteState.message ? deleteState : moveState} />
      )}
    </div>
  );
}

function QuestionEditFields({
  questionType,
  heading,
  defaultQuestion,
  sections,
  tags
}: {
  questionType: QuestionType;
  heading: string;
  defaultQuestion?: QuestionItem;
  sections: SectionItem[];
  tags: TagSummary[];
}) {
  const options = Array.isArray(defaultQuestion?.options_jsonb)
    ? defaultQuestion.options_jsonb.map((option) => toJapaneseSampleText(String(option))).join("\n")
    : "";
  const needsOptions =
    questionType === "radio" || questionType === "checkbox" || questionType === "select";
  const isHeading = questionType === "heading";
  const isNewQuestion = heading.startsWith("新しい");
  const profileTargets = getProfileTargets(defaultQuestion?.settings_jsonb);

  return (
    <div>
      <div
        className={
          isNewQuestion
            ? "mb-4 flex items-center gap-2 rounded bg-emerald-100 px-3 py-2"
            : "mb-4 flex items-center gap-2"
        }
      >
        {questionTypeIcons[questionType]}
        <h4 className="font-medium">{heading}</h4>
        <Badge variant="outline">{questionTypeLabels[questionType]}</Badge>
      </div>

      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-[9rem_1fr_auto] md:items-center">
          <Label className="md:text-right">
            {isHeading ? "見出し" : "項目名"}
          </Label>
          <Input
            className={compactInputClass}
            defaultValue={toJapaneseSampleText(defaultQuestion?.label)}
            name="label"
            placeholder={isHeading ? "例：ご希望について" : "例：参加したいイベント"}
            required
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              defaultChecked={defaultQuestion?.is_visible === false}
              name="is_hidden_dummy"
              type="checkbox"
              onChange={(event) => {
                const hidden = event.currentTarget.form?.elements.namedItem("is_visible_hidden");
                if (hidden instanceof HTMLInputElement) {
                  hidden.value = event.currentTarget.checked ? "off" : "on";
                }
              }}
            />
            項目名を隠す
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-[9rem_1fr] md:items-start">
          <Label className="pt-2 md:text-right">説明文</Label>
          <div>
            <Textarea
              className={compactTextareaClass}
              defaultValue={toJapaneseSampleText(defaultQuestion?.description)}
              name="description"
              rows={isHeading ? 3 : 2}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              回答入力欄の下に表示されます。
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[9rem_1fr] md:items-start">
          <Label className="pt-2 md:text-right">画像</Label>
          <SurveyMediaPicker
            defaultValue={defaultQuestion?.attached_image_url ?? ""}
            name="attached_image_url"
          />
        </div>

        {questionType === "text" ? (
          <>
            <div className="grid gap-3 md:grid-cols-[9rem_1fr] md:items-center">
              <Label className="md:text-right">プレースホルダ</Label>
              <Input
                className={compactInputClass}
                defaultValue={defaultQuestion?.placeholder ?? ""}
                name="placeholder"
                placeholder="入力欄に薄く表示する例文"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-[9rem_1fr] md:items-center">
              <Label className="md:text-right">入力規則</Label>
              <select
                className={compactSelectClass}
                defaultValue={defaultQuestion?.validation_type ?? "none"}
                name="validation_type"
              >
                <option value="none">{validationTypeLabels.none}</option>
                <option value="email">{validationTypeLabels.email}</option>
                <option value="phone">{validationTypeLabels.phone}</option>
              </select>
            </div>
          </>
        ) : (
          <>
            <input name="placeholder" type="hidden" value="" />
            <input name="validation_type" type="hidden" value="none" />
          </>
        )}

        {!isHeading ? (
          <div className="grid gap-3 md:grid-cols-[9rem_1fr] md:items-start">
            <Label className="pt-2 md:text-right">回答の登録先</Label>
            <ProfileTargetPicker defaultValue={profileTargets} />
          </div>
        ) : (
          <input name="profile_targets_text" type="hidden" value="" />
        )}

        {needsOptions ? (
          <div className="grid gap-3 md:grid-cols-[9rem_1fr] md:items-start">
            <Label className="pt-2 md:text-right">選択肢</Label>
            <div className="space-y-2">
              <ChoiceListEditor
                branchRules={defaultQuestion?.branch_rules_jsonb}
                defaultValue={options}
                name="options_text"
                sections={sections}
                tagRules={defaultQuestion?.tag_rules ?? []}
                tags={tags}
              />
            </div>
          </div>
        ) : (
          <input name="options_text" type="hidden" value="" />
        )}

        {!needsOptions ? <input name="branch_rules_text" type="hidden" value="" /> : null}
        {!needsOptions ? <input name="tag_rules_text" type="hidden" value="" /> : null}
        <input
          name="is_visible"
          type="hidden"
          value={defaultQuestion?.is_visible === false ? "off" : "on"}
          id="is_visible_hidden"
        />

        <div className="border-t pt-4">
          <div className="flex flex-wrap justify-end gap-8 text-sm">
            {!isHeading ? (
              <label className="flex items-center gap-2">
                <input defaultChecked={defaultQuestion?.is_required} name="is_required" type="checkbox" />
                必須
              </label>
            ) : (
              <input name="is_required" type="hidden" value="off" />
            )}
            <label className="flex items-center gap-2">
              <input
                defaultChecked={defaultQuestion?.is_visible === false}
                name="is_visible_checkbox"
                type="checkbox"
                onChange={(event) => {
                  const hidden = event.currentTarget.form?.elements.namedItem("is_visible_hidden");
                  if (hidden instanceof HTMLInputElement) {
                    hidden.value = event.currentTarget.checked ? "off" : "on";
                  }
                }}
              />
              非表示
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function getProfileTargets(settings: Json | undefined | null): ProfileTargetValue[] {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return [];

  const record = settings as { profileTargets?: unknown; profile_targets?: unknown };
  const raw = record.profileTargets ?? record.profile_targets;
  if (!Array.isArray(raw)) return [];

  const allowed = new Set(profileTargetOptions.map((option) => option.value));
  return raw.filter(
    (value): value is ProfileTargetValue =>
      typeof value === "string" && allowed.has(value as ProfileTargetValue)
  );
}

function ProfileTargetPicker({ defaultValue }: { defaultValue: ProfileTargetValue[] }) {
  const [selected, setSelected] = useState<ProfileTargetValue[]>(defaultValue);

  const toggle = (value: ProfileTargetValue) => {
    setSelected((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  };

  return (
    <div className="rounded border bg-muted/30 p-3">
      <input name="profile_targets_text" type="hidden" value={selected.join("\n")} />
      {selected.length > 0 ? (
        <div className="mb-2 overflow-hidden rounded border bg-background">
          {selected.map((value) => {
            const option = profileTargetOptions.find((item) => item.value === value);
            return (
              <div
                className="flex items-center justify-between gap-3 border-b px-3 py-2 last:border-b-0"
                key={value}
              >
                <span className="text-sm font-medium">{option?.label ?? value}</span>
                <Button onClick={() => toggle(value)} size="sm" type="button" variant="outline">
                  削除
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mb-2 text-sm text-muted-foreground">登録先は未設定です。</p>
      )}
      <div className="flex flex-wrap gap-2">
        {profileTargetOptions.map((option) => (
          <Button
            disabled={selected.includes(option.value)}
            key={option.value}
            onClick={() => toggle(option.value)}
            size="sm"
            type="button"
            variant="outline"
          >
            + {option.label}
          </Button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        選んだ項目は、回答送信時に学生情報へ上書き反映されます。
      </p>
    </div>
  );
}

function ElementPalette({
  selectedType,
  setSelectedType
}: {
  selectedType: QuestionType;
  setSelectedType: (type: QuestionType) => void;
}) {
  return (
    <div className="mt-5">
      <p className="mb-3 text-center text-sm text-muted-foreground">
        フォームに追加する要素を選んでください。
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {elementItems.map((item) => (
          <Button
            key={item.label}
            onClick={() => setSelectedType(item.type)}
            size="sm"
            type="button"
            variant={selectedType === item.type ? "default" : "outline"}
          >
            {item.icon}
            <span className="ml-2">{item.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

function ChoiceListEditor({
  name,
  defaultValue,
  tags,
  sections,
  tagRules,
  branchRules
}: {
  name: string;
  defaultValue: string;
  tags: TagSummary[];
  sections: SectionItem[];
  tagRules: QuestionItem["tag_rules"];
  branchRules?: Json;
}) {
  const [choices, setChoices] = useState(() => {
    const parsed = defaultValue.split(/\r?\n/).filter(Boolean);
    const branches = Array.isArray(branchRules)
      ? (branchRules as Array<{ answer?: string; targetSectionId?: string }>)
      : [];

    return (parsed.length > 0 ? parsed : ["選択肢1"]).map((label) => {
      const tagRule = tagRules.find((rule) => {
        const matcher = rule.when_answer_matches_jsonb;
        return (
          matcher &&
          typeof matcher === "object" &&
          !Array.isArray(matcher) &&
          "equals" in matcher &&
          matcher.equals === label
        );
      });
      const branchRule = branches.find((rule) => rule.answer === label);

      return {
        label,
        tagId: tagRule?.tag?.id ?? "",
        targetSectionId: branchRule?.targetSectionId ?? ""
      };
    });
  });

  const optionsText = choices.map((choice) => choice.label.trim()).filter(Boolean).join("\n");
  const tagRulesText = choices
    .filter((choice) => choice.label.trim() && choice.tagId)
    .map((choice) => `${choice.label.trim()}=>${choice.tagId}`)
    .join("\n");
  const branchRulesText = choices
    .filter((choice) => choice.label.trim() && choice.targetSectionId)
    .map((choice) => `${choice.label.trim()}=>${choice.targetSectionId}`)
    .join("\n");

  function updateChoice(
    index: number,
    nextValue: Partial<{ label: string; tagId: string; targetSectionId: string }>
  ) {
    setChoices((current) =>
      current.map((choice, choiceIndex) =>
        choiceIndex === index ? { ...choice, ...nextValue } : choice
      )
    );
  }

  function addChoice(label = `選択肢${choices.length + 1}`) {
    setChoices((current) => [...current, { label, tagId: "", targetSectionId: "" }]);
  }

  function duplicateChoice(index: number) {
    setChoices((current) => [
      ...current.slice(0, index + 1),
      { ...current[index], label: `${current[index]?.label || `選択肢${index + 1}`} のコピー` },
      ...current.slice(index + 1)
    ]);
  }

  function moveChoice(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= choices.length) return;
    setChoices((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function deleteChoice(index: number) {
    if (choices.length <= 1) return;
    setChoices((current) => current.filter((_, choiceIndex) => choiceIndex !== index));
  }

  function replaceChoicesWithTagFolder(folderTags: TagSummary[]) {
    if (folderTags.length === 0) return;
    setChoices(
      folderTags.map((tag) => ({
        label: tag.name,
        tagId: tag.id,
        targetSectionId: ""
      }))
    );
  }

  return (
    <div className="rounded border bg-muted/20 p-3">
      <input name={name} type="hidden" value={optionsText} />
      <input name="tag_rules_text" type="hidden" value={tagRulesText} />
      <input name="branch_rules_text" type="hidden" value={branchRulesText} />
      <div className="space-y-3">
        {choices.map((choice, index) => (
          <div className="rounded border bg-background p-3" key={index}>
            <div className="grid gap-2 md:grid-cols-[5rem_1fr_auto] md:items-center">
              <span className="rounded bg-secondary px-2 py-1 text-center text-sm">
                選択肢{index + 1}
              </span>
              <Input
                className={compactInputClass}
                onChange={(event) => updateChoice(index, { label: event.target.value })}
                value={choice.label}
              />
              <div className="flex flex-wrap gap-1">
                <Button onClick={() => duplicateChoice(index)} size="sm" type="button" variant="ghost">
                  複製
                </Button>
                <Button onClick={() => moveChoice(index, -1)} size="sm" type="button" variant="ghost">
                  上へ
                </Button>
                <Button onClick={() => moveChoice(index, 1)} size="sm" type="button" variant="ghost">
                  下へ
                </Button>
                <Button
                  disabled={choices.length <= 1}
                  onClick={() => deleteChoice(index)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  削除
                </Button>
              </div>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-[8rem_1fr] md:items-start">
              <Label className="md:text-right">選択時に付けるタグ</Label>
              <TagRulePicker
                onChange={(nextValue) => updateChoice(index, { tagId: nextValue })}
                onFolderSelect={(folder) => replaceChoicesWithTagFolder(folder.tags)}
                tags={tags}
                value={choice.tagId}
              />
              <Label className="md:text-right">次に進むセクション</Label>
              <select
                className={compactSelectClass}
                onChange={(event) => updateChoice(index, { targetSectionId: event.target.value })}
                value={choice.targetSectionId}
              >
                <option value=""></option>
                {sections.map((section, sectionIndex) => (
                  <option key={section.id} value={section.id}>
                    セクション{sectionIndex + 1}: {section.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <Button onClick={() => addChoice()} type="button" variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          選択肢を追加
        </Button>
        <Button onClick={() => addChoice("その他")} type="button" variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          「その他」を追加
        </Button>
      </div>
    </div>
  );
}

function Tabs({
  tab,
  setTab
}: {
  tab: "options" | "design" | "auto";
  setTab: (tab: "options" | "design" | "auto") => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      <TabButton active={tab === "options"} onClick={() => setTab("options")}>
        オプション
      </TabButton>
      <TabButton active={tab === "design"} onClick={() => setTab("design")}>
        カラー/デザイン設定
      </TabButton>
      <TabButton active={tab === "auto"} onClick={() => setTab("auto")}>
        自動入力設定
      </TabButton>
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button onClick={onClick} type="button" variant={active ? "default" : "outline"}>
      {children}
    </Button>
  );
}

function BuilderOptions({ survey }: { survey: SurveyItem }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-[14rem_1fr] md:items-center">
        <Label className="md:text-right">進むボタンテキスト</Label>
        <Input defaultValue="進む" />
        <Label className="md:text-right">送信ボタンテキスト</Label>
        <Input defaultValue="送信" />
        <Label className="md:text-right">確認テキスト</Label>
        <Textarea defaultValue="送信してよろしいですか？" />
        <Label className="md:text-right">回答後の文章</Label>
        <Textarea
          defaultValue={survey.thank_you_message ?? ""}
          name="thank_you_message"
        />
        <Label className="md:text-right">回答後に移動するURL</Label>
        <Input defaultValue={survey.redirect_url ?? ""} name="redirect_url" />
      </div>
      <div className="grid gap-3 md:grid-cols-[14rem_1fr]">
        <div />
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input name="one_response_per_student" type="hidden" value="off" />
            <input
              defaultChecked={survey.one_response_per_student}
              name="one_response_per_student"
              type="checkbox"
            />
            1人1回だけ回答できるようにする
          </label>
          <label className="flex items-center gap-2">
            <input name="is_active" type="hidden" value="off" />
            <input defaultChecked={survey.is_active} name="is_active" type="checkbox" />
            公開する
          </label>
        </div>
      </div>
    </div>
  );
}

function BuilderDesign({ survey }: { survey: SurveyItem }) {
  return (
    <div className="space-y-5">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" />
        カスタムデザインを使用
      </label>
      <div className="grid gap-4 md:grid-cols-3">
        <ColorField label="ボタンカラー" value="#2196f3" />
        <ColorField label="背景カラー" value="#c5cae9" />
        <ColorField label="フォーム背景カラー" value="#fdfdfc" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="ヘッダー画像URL">
          <Input />
        </Field>
        <Field label="背景画像URL">
          <Input />
        </Field>
      </div>
      <Field label="カスタムCSS">
        <Textarea
          defaultValue={survey.custom_css ?? ""}
          name="custom_css"
          placeholder="body { background-color: #FFFFFF; }"
          rows={5}
        />
      </Field>
    </div>
  );
}

function BuilderAuto() {
  return (
    <div className="grid gap-4 md:grid-cols-[14rem_1fr] md:items-center">
      <Label className="md:text-right">LINE ID自動紐付け</Label>
      <p className="text-sm text-muted-foreground">
        配布URLに lineUserId が付いている場合、回答者を自動で判定します。
      </p>
      <Label className="md:text-right">メール/電話の自動反映</Label>
      <p className="text-sm text-muted-foreground">
        入力規則をメールアドレスまたは電話番号にした項目は、回答後に学生情報へ自動追記します。
      </p>
    </div>
  );
}

function ColorField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input className="h-10 w-14" defaultValue={value} type="color" />
        <Input defaultValue={value} />
      </div>
    </div>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SubmitButton({
  label,
  icon
}: {
  label: string;
  icon?: ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} type="submit">
      {icon}
      {pending ? "保存中..." : label}
    </Button>
  );
}

function FormMessage({ state }: { state: SurveyBuilderState }) {
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
