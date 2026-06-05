"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  FileUp,
  Folder,
  FolderPlus,
  GripVertical,
  Heading2,
  ListChecks,
  ListFilter,
  MoreVertical,
  Plus,
  Power,
  Search,
  Send,
  Trash2,
  Type
} from "lucide-react";
import {
  createSurvey,
  createSurveyFolder,
  moveSurveysToFolder,
  toggleSurveyActive,
  type SurveyActionState
} from "@/app/(dashboard)/surveys/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SurveyMediaPicker } from "@/components/surveys/survey-media-picker";
import { TagRulePicker } from "@/components/surveys/tag-rule-picker";
import { localizeSampleText } from "@/lib/display/localize";
import type { TagSummary } from "@/lib/students/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { getStaffDisplayName } from "@/lib/staff/display";

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
  created_at: string;
  updated_at: string;
  last_response_at: string | null;
  last_activity_at: string;
  staff: { id: string; name: string; email: string } | null;
  folder: FolderItem | null;
  sections: Array<{
    id: string;
    order: number;
    title: string;
    description: string | null;
    is_visible: boolean;
  }>;
  questions: Array<{
    id: string;
    section_id: string | null;
    order: number;
    type: DraftQuestionType;
    label: string;
    description: string | null;
    placeholder: string | null;
    validation_type: "none" | "email" | "phone";
    options_jsonb: unknown;
    is_required: boolean;
    is_visible: boolean;
    attached_image_url: string | null;
    branch_rules_jsonb: unknown;
    survey_question_tags?: Array<{
      tag_id: string;
      when_answer_matches_jsonb: unknown;
      tags?: {
        id: string;
        name: string;
        color: string;
      } | null;
    }>;
  }>;
  question_count: number;
  response_count: number;
};

type DraftQuestionType = "heading" | "text" | "radio" | "checkbox" | "select" | "file_upload";

type DraftQuestion = {
  id: string;
  type: DraftQuestionType;
  label: string;
  description: string;
  placeholder: string;
  validation_type: "none" | "email" | "phone";
  options_text: string;
  is_required: boolean;
  is_visible: boolean;
  attached_image_url: string;
  branch_rules_text: string;
  tag_rules_text: string;
};

type DraftSection = {
  id: string;
  title: string;
  description: string;
  questions: DraftQuestion[];
};

type CreateDefaults = {
  admin_title: string;
  public_title: string;
  description: string;
  folder_id: string;
  is_active: boolean;
  is_visible: boolean;
  one_response_per_student: boolean;
  redirect_url: string;
  thank_you_message: string;
  custom_css: string;
};

const emptyCreateDefaults: CreateDefaults = {
  admin_title: "",
  public_title: "",
  description: "",
  folder_id: "",
  is_active: false,
  is_visible: true,
  one_response_per_student: false,
  redirect_url: "",
  thank_you_message: "",
  custom_css: ""
};

const initialState: SurveyActionState = {
  ok: false,
  message: ""
};

const questionTypeLabels: Record<DraftQuestionType, string> = {
  heading: "見出し",
  text: "記述式",
  radio: "ラジオボタン",
  checkbox: "チェックボックス",
  select: "プルダウン",
  file_upload: "ファイル添付"
};

const questionTypeIcons: Record<DraftQuestionType, ReactNode> = {
  heading: <Heading2 className="h-4 w-4" />,
  text: <Type className="h-4 w-4" />,
  radio: <ListChecks className="h-4 w-4" />,
  checkbox: <ListChecks className="h-4 w-4" />,
  select: <ListFilter className="h-4 w-4" />,
  file_upload: <FileUp className="h-4 w-4" />
};

const paletteItems: Array<{ label: string; type: DraftQuestionType; icon: ReactNode }> = [
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

function createInitialSection(): DraftSection {
  return {
    id: crypto.randomUUID(),
    title: "セクション1",
    description: "",
    questions: []
  };
}

function optionsToText(value: unknown) {
  return Array.isArray(value) ? value.map(String).join("\n") : "";
}

function branchRulesToText(value: unknown) {
  if (!Array.isArray(value)) return "";
  return value
    .map((rule) => {
      if (!rule || typeof rule !== "object") return "";
      const item = rule as { answer?: unknown; targetSectionId?: unknown };
      return item.answer && item.targetSectionId
        ? `${String(item.answer)}=>${String(item.targetSectionId)}`
        : "";
    })
    .filter(Boolean)
    .join("\n");
}

function tagRulesToText(rules?: SurveyItem["questions"][number]["survey_question_tags"]) {
  return (rules ?? [])
    .map((rule) => {
      const matcher = rule.when_answer_matches_jsonb;
      if (!matcher || typeof matcher !== "object" || Array.isArray(matcher)) return "";
      const equals = (matcher as { equals?: unknown }).equals;
      return equals && rule.tag_id ? `${String(equals)}=>${rule.tag_id}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

function buildDraftFromSurvey(survey: SurveyItem): DraftSection[] {
  const sourceSections =
    survey.sections.length > 0
      ? survey.sections
      : [{ id: crypto.randomUUID(), order: 1, title: "セクション1", description: "", is_visible: true }];

  const draftSections = sourceSections.map((section, index) => ({
    id: section.id,
    title: section.title || `セクション${index + 1}`,
    description: section.description ?? "",
    questions: [] as DraftQuestion[]
  }));

  for (const question of survey.questions) {
    const sectionIndex = question.section_id
      ? draftSections.findIndex((section) => section.id === question.section_id)
      : 0;
    const targetSection = draftSections[Math.max(sectionIndex, 0)];
    if (!targetSection) continue;

    targetSection.questions.push({
      id: crypto.randomUUID(),
      type: question.type,
      label: question.label,
      description: question.description ?? "",
      placeholder: question.placeholder ?? "",
      validation_type: question.validation_type ?? "none",
      options_text: optionsToText(question.options_jsonb),
      is_required: question.is_required === true,
      is_visible: question.is_visible !== false,
      attached_image_url: question.attached_image_url ?? "",
      branch_rules_text: branchRulesToText(question.branch_rules_jsonb),
      tag_rules_text: tagRulesToText(question.survey_question_tags)
    });
  }

  return draftSections;
}

export function SurveyAdmin({
  surveys,
  folders,
  tags
}: {
  surveys: SurveyItem[];
  folders: FolderItem[];
  tags: TagSummary[];
}) {
  const [state, formAction] = useFormState(createSurvey, initialState);
  const [folderState, folderAction] = useFormState(
    createSurveyFolder,
    initialState
  );
  const [folderId, setFolderId] = useState("all");
  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [tab, setTab] = useState<"options" | "design" | "auto">("options");
  const [responseSurvey, setResponseSurvey] = useState<SurveyItem | null>(null);
  const [selectedSurveyIds, setSelectedSurveyIds] = useState<string[]>([]);
  const [createDefaults, setCreateDefaults] = useState<CreateDefaults>(emptyCreateDefaults);
  const [createFormKey, setCreateFormKey] = useState("new");
  const [draftSections, setDraftSections] = useState<DraftSection[]>([
    createInitialSection()
  ]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const survey of surveys) {
      map.set(survey.folder_id ?? "none", (map.get(survey.folder_id ?? "none") ?? 0) + 1);
    }
    return map;
  }, [surveys]);

  const filteredSurveys = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return surveys.filter((survey) => {
      const folderMatched =
        folderId === "all" ||
        (folderId === "none" && !survey.folder_id) ||
        survey.folder_id === folderId;
      if (!folderMatched) return false;
      if (!keyword) return true;
      return [
        survey.admin_title,
        survey.public_title,
        survey.title,
        survey.description,
        survey.folder?.name
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [folderId, query, surveys]);

  const draftPayload = useMemo(
    () =>
      JSON.stringify({
        sections: draftSections
      }),
    [draftSections]
  );
  const selectedSurveyIdSet = useMemo(() => new Set(selectedSurveyIds), [selectedSurveyIds]);

  useEffect(() => {
    setSelectedSurveyIds((current) =>
      current.filter((surveyId) => surveys.some((survey) => survey.id === surveyId))
    );
  }, [surveys]);

  function toggleSurveySelection(surveyId: string, checked: boolean) {
    setSelectedSurveyIds((current) => {
      if (checked) return current.includes(surveyId) ? current : [...current, surveyId];
      return current.filter((id) => id !== surveyId);
    });
  }

  function toggleVisibleSurveySelection(checked: boolean) {
    const visibleIds = filteredSurveys.map((survey) => survey.id);
    setSelectedSurveyIds((current) => {
      if (checked) return Array.from(new Set([...current, ...visibleIds]));
      return current.filter((surveyId) => !visibleIds.includes(surveyId));
    });
  }

  function resetCreateForm() {
    setIsCreating(false);
    setCreateDefaults(emptyCreateDefaults);
    setCreateFormKey(`new-${Date.now()}`);
    setDraftSections([createInitialSection()]);
  }

  function startNewSurvey() {
    setCreateDefaults(emptyCreateDefaults);
    setCreateFormKey(`new-${Date.now()}`);
    setDraftSections([createInitialSection()]);
    setIsCreating(true);
  }

  function startCopySurvey(survey: SurveyItem) {
    setCreateDefaults({
      admin_title: `${survey.admin_title || survey.title} のコピー`,
      public_title: survey.public_title || survey.title,
      description: survey.description ?? "",
      folder_id: survey.folder_id ?? "",
      is_active: false,
      is_visible: survey.is_visible !== false,
      one_response_per_student: survey.one_response_per_student,
      redirect_url: survey.redirect_url ?? "",
      thank_you_message: survey.thank_you_message ?? "",
      custom_css: survey.custom_css ?? ""
    });
    setCreateFormKey(`copy-${survey.id}-${Date.now()}`);
    setDraftSections(buildDraftFromSurvey(survey));
    setIsCreating(true);
    setTab("options");
  }

  function addSection() {
    setDraftSections((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        title: `セクション${current.length + 1}`,
        description: "",
        questions: []
      }
    ]);
  }

  function duplicateSection(sectionId: string) {
    setDraftSections((current) => {
      const index = current.findIndex((section) => section.id === sectionId);
      if (index < 0) return current;
      const source = current[index];
      const copy: DraftSection = {
        ...source,
        id: crypto.randomUUID(),
        title: `${source.title} のコピー`,
        questions: source.questions.map((question) => ({
          ...question,
          id: crypto.randomUUID()
        }))
      };
      return [...current.slice(0, index + 1), copy, ...current.slice(index + 1)];
    });
  }

  function moveSection(sectionId: string, direction: -1 | 1) {
    setDraftSections((current) => {
      const index = current.findIndex((section) => section.id === sectionId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function addQuestion(sectionId: string, type: DraftQuestionType, label: string) {
    setDraftSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          questions: [
            ...section.questions,
            {
              id: crypto.randomUUID(),
              type,
              label,
              description: "",
              placeholder: "",
              validation_type: "none",
              options_text:
                type === "radio" || type === "checkbox" || type === "select"
                  ? "選択肢1\n選択肢2"
                  : "",
              is_required: false,
              is_visible: true,
              attached_image_url: "",
              branch_rules_text: "",
              tag_rules_text: ""
            }
          ]
        };
      })
    );
  }

  function updateQuestion(
    sectionId: string,
    questionId: string,
    patch: Partial<DraftQuestion>
  ) {
    setDraftSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              questions: section.questions.map((question) =>
                question.id === questionId ? { ...question, ...patch } : question
              )
            }
          : section
      )
    );
  }

  function deleteQuestion(sectionId: string, questionId: string) {
    setDraftSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              questions: section.questions.filter((question) => question.id !== questionId)
            }
          : section
      )
    );
  }

  function moveQuestion(sectionId: string, questionId: string, direction: -1 | 1) {
    setDraftSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) return section;
        const index = section.questions.findIndex((question) => question.id === questionId);
        const nextIndex = index + direction;
        if (index < 0 || nextIndex < 0 || nextIndex >= section.questions.length) return section;
        const questions = [...section.questions];
        [questions[index], questions[nextIndex]] = [questions[nextIndex], questions[index]];
        return { ...section, questions };
      })
    );
  }

  function selectFolder(nextFolderId: string) {
    setFolderId(nextFolderId);
    setIsCreating(false);
  }

  return (
    <div className="grid min-h-[calc(100vh-12rem)] gap-4 lg:grid-cols-[16rem_1fr]">
      <aside className="rounded-md border bg-card">
        <div className="border-b p-3">
          <form action={folderAction} className="space-y-2">
            <Input name="name" placeholder="新しいフォルダ" />
            <Input className="hidden" name="description" />
            <Button className="w-full" size="sm" type="submit" variant="outline">
              <FolderPlus className="mr-2 h-4 w-4" />
              フォルダ作成
            </Button>
            <FormMessage state={folderState} />
          </form>
        </div>
        <nav className="p-2">
          <FolderButton
            active={folderId === "all"}
            count={surveys.length}
            label="すべて"
            onClick={() => selectFolder("all")}
          />
          <FolderButton
            active={folderId === "none"}
            count={counts.get("none") ?? 0}
            label="未分類"
            onClick={() => selectFolder("none")}
          />
          {folders.map((folder) => (
            <FolderButton
              active={folderId === folder.id}
              count={counts.get(folder.id) ?? 0}
              key={folder.id}
              label={folder.name}
              onClick={() => selectFolder(folder.id)}
            />
          ))}
        </nav>
      </aside>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button onClick={startNewSurvey} type="button">
              <Plus className="mr-2 h-4 w-4" />
              新しい回答フォーム
            </Button>
            <BulkSurveyFolderMove
              folders={folders}
              onMoved={() => setSelectedSurveyIds([])}
              selectedCount={selectedSurveyIds.length}
              selectedSurveyIds={selectedSurveyIds}
            />
          </div>
          <div className="flex flex-1 gap-2 md:max-w-xl">
            <Button size="sm" type="button" variant="outline">
              <ListFilter className="mr-2 h-4 w-4" />
              並び替え
            </Button>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="検索"
                value={query}
              />
            </div>
          </div>
        </div>

        {isCreating ? (
        <section className="rounded-md border-2 border-slate-300 bg-card p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">回答フォーム登録</h2>
              <Button onClick={resetCreateForm} type="button" variant="outline">
                一覧に戻る
              </Button>
            </div>
            <form action={formAction} className="space-y-6" key={createFormKey}>
              <input name="draft_payload" type="hidden" value={draftPayload} />
              <div className="grid gap-4 md:grid-cols-[12rem_1fr] md:items-center">
                <Label className="md:text-right">
                  <span className="mr-2 rounded bg-destructive px-1.5 py-0.5 text-xs text-destructive-foreground">
                    必須
                  </span>
                  フォーム名(管理用)
                </Label>
                <Input defaultValue={createDefaults.admin_title} name="admin_title" required />
                <Label className="md:text-right">フォルダ</Label>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue={createDefaults.folder_id}
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

              <div className="rounded-md border-2 border-sky-300 bg-sky-50/30 p-5">
                <div className="grid gap-4 md:grid-cols-[12rem_1fr] md:items-start">
                  <Label className="pt-2 md:text-right">タイトル</Label>
                  <Input defaultValue={createDefaults.public_title} name="public_title" required />
                  <Label className="pt-2 md:text-right">説明</Label>
                  <Textarea defaultValue={createDefaults.description} name="description" rows={3} />
                </div>

                <div className="my-5 border-t" />

                <div className="space-y-5">
                  {draftSections.map((section, index) => (
                    <DraftSectionEditor
                      addQuestion={addQuestion}
                      duplicateSection={duplicateSection}
                      displayIndex={index + 1}
                      index={index}
                      key={section.id}
                      moveSection={moveSection}
                      onDeleteQuestion={deleteQuestion}
                      onMoveQuestion={moveQuestion}
                      onUpdateQuestion={updateQuestion}
                      section={section}
                      sectionCount={draftSections.length}
                      tags={tags}
                    />
                  ))}
                </div>

                <Button className="mt-5 w-full" onClick={addSection} type="button" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  セクションを追加
                </Button>
              </div>

              <Tabs tab={tab} setTab={setTab} />
              <div className="rounded-md border-2 border-slate-300 p-5">
                {tab === "options" ? <CreateOptions defaults={createDefaults} /> : null}
                {tab === "design" ? <DesignOptions defaults={createDefaults} /> : null}
                {tab === "auto" ? <AutoInputOptions /> : null}
              </div>

              <FormMessage state={state} />
              <div className="sticky bottom-0 z-10 flex justify-end gap-2 border-t bg-background/95 p-3">
                <Button onClick={resetCreateForm} type="button" variant="outline">
                  キャンセル
                </Button>
                <SubmitButton label="保存" />
              </div>
            </form>
          </section>
        ) : (
          <SurveyTable
            onCopySurvey={startCopySurvey}
            onViewResponses={setResponseSurvey}
            onSelectAllVisible={toggleVisibleSurveySelection}
            onToggleSelection={toggleSurveySelection}
            selectedSurveyIds={selectedSurveyIdSet}
            surveys={filteredSurveys}
          />
        )}
      </section>
      {responseSurvey ? (
        <ResponseResultsModal
          onClose={() => setResponseSurvey(null)}
          survey={responseSurvey}
        />
      ) : null}
    </div>
  );
}

function DraftSectionEditor({
  section,
  index,
  sectionCount,
  displayIndex,
  tags,
  addQuestion,
  duplicateSection,
  moveSection,
  onDeleteQuestion,
  onMoveQuestion,
  onUpdateQuestion
}: {
  section: DraftSection;
  index: number;
  sectionCount: number;
  displayIndex: number;
  tags: TagSummary[];
  addQuestion: (sectionId: string, type: DraftQuestionType, label: string) => void;
  duplicateSection: (sectionId: string) => void;
  moveSection: (sectionId: string, direction: -1 | 1) => void;
  onDeleteQuestion: (sectionId: string, questionId: string) => void;
  onMoveQuestion: (sectionId: string, questionId: string, direction: -1 | 1) => void;
  onUpdateQuestion: (
    sectionId: string,
    questionId: string,
    patch: Partial<DraftQuestion>
  ) => void;
}) {
  return (
    <div className="rounded-md border-2 border-blue-300 bg-blue-50/50 p-4">
      <div className="border-l-4 border-blue-500 pl-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-medium">セクション{displayIndex}</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => duplicateSection(section.id)}
            size="sm"
            type="button"
            variant="outline"
          >
            <Copy className="mr-2 h-4 w-4" />
            セクション複製
          </Button>
          <Button
            disabled={index === 0}
            onClick={() => moveSection(section.id, -1)}
            size="sm"
            type="button"
            variant="outline"
          >
            <ChevronUp className="mr-2 h-4 w-4" />
            上へ移動
          </Button>
          <Button
            disabled={index === sectionCount - 1}
            onClick={() => moveSection(section.id, 1)}
            size="sm"
            type="button"
            variant="outline"
          >
            <ChevronDown className="mr-2 h-4 w-4" />
            下へ移動
          </Button>
        </div>
      </div>

      {section.questions.length > 0 ? (
        <div className="mt-5 space-y-3">
          {section.questions.map((question) => (
            <DraftQuestionEditor
              key={question.id}
              onDelete={() => onDeleteQuestion(section.id, question.id)}
              onMove={(direction) => onMoveQuestion(section.id, question.id, direction)}
              onUpdate={(patch) => onUpdateQuestion(section.id, question.id, patch)}
              question={question}
              questionCount={section.questions.length}
              tags={tags}
            />
          ))}
        </div>
      ) : (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          下のボタンを押すと、このセクションに質問が追加されます。
        </p>
      )}

      <ElementPalette onAdd={(type, label) => addQuestion(section.id, type, label)} />
      </div>
    </div>
  );
}

function DraftQuestionEditor({
  question,
  questionCount,
  tags,
  onUpdate,
  onMove,
  onDelete
}: {
  question: DraftQuestion;
  questionCount: number;
  tags: TagSummary[];
  onUpdate: (patch: Partial<DraftQuestion>) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  const needsOptions = question.type === "radio" || question.type === "checkbox" || question.type === "select";
  const isHeading = question.type === "heading";

  return (
    <div className="rounded-md border-2 border-sky-200 bg-sky-50/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-200 bg-sky-100 px-4 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{question.label}</span>
          <span className="text-xs text-muted-foreground">{questionTypeLabels[question.type]}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button disabled={questionCount <= 1} onClick={() => onMove(-1)} size="sm" type="button" variant="outline">
            <ChevronUp className="mr-2 h-4 w-4" />
            上へ
          </Button>
          <Button disabled={questionCount <= 1} onClick={() => onMove(1)} size="sm" type="button" variant="outline">
            <ChevronDown className="mr-2 h-4 w-4" />
            下へ
          </Button>
          <Button onClick={onDelete} size="sm" type="button" variant="ghost">
            <Trash2 className="mr-2 h-4 w-4" />
            削除
          </Button>
        </div>
      </div>
      <div className="space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-[9rem_1fr_auto] md:items-center">
          <Label className="md:text-right">{isHeading ? "見出し" : "項目名"}</Label>
          <Input
            onChange={(event) => onUpdate({ label: event.target.value })}
            value={question.label}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              checked={!question.is_visible}
              onChange={(event) => onUpdate({ is_visible: !event.target.checked })}
              type="checkbox"
            />
            非表示
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-[9rem_1fr] md:items-start">
          <Label className="pt-2 md:text-right">説明文</Label>
          <Textarea
            onChange={(event) => onUpdate({ description: event.target.value })}
            rows={isHeading ? 4 : 2}
            value={question.description}
          />
        </div>

        {question.type === "text" ? (
          <>
            <div className="grid gap-3 md:grid-cols-[9rem_1fr] md:items-center">
              <Label className="md:text-right">プレースホルダ</Label>
              <Input
                onChange={(event) => onUpdate({ placeholder: event.target.value })}
                value={question.placeholder}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-[9rem_1fr] md:items-center">
              <Label className="md:text-right">入力規則</Label>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                onChange={(event) =>
                  onUpdate({ validation_type: event.target.value as DraftQuestion["validation_type"] })
                }
                value={question.validation_type}
              >
                <option value="none">入力規則なし</option>
                <option value="email">メールアドレス</option>
                <option value="phone">電話番号</option>
              </select>
            </div>
          </>
        ) : null}

        {needsOptions ? (
          <div className="grid gap-3 md:grid-cols-[9rem_1fr] md:items-start">
            <Label className="pt-2 md:text-right">選択肢</Label>
            <ChoiceListEditor
              onChange={(nextValue, nextTagRules) =>
                onUpdate({
                  options_text: nextValue,
                  tag_rules_text: nextTagRules ?? question.tag_rules_text
                })
              }
              tagRulesText={question.tag_rules_text}
              tags={tags}
              value={question.options_text}
            />
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-[9rem_1fr] md:items-start">
          <Label className="pt-2 md:text-right">画像</Label>
          <SurveyMediaPicker
            name={`draft_image_${question.id}`}
            onChange={(nextValue) => onUpdate({ attached_image_url: nextValue })}
            value={question.attached_image_url}
          />
        </div>

        {!isHeading ? (
          <div className="flex justify-end gap-8 border-t pt-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                checked={question.is_required}
                onChange={(event) => onUpdate({ is_required: event.target.checked })}
                type="checkbox"
              />
              必須
            </label>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ElementPalette({
  onAdd
}: {
  onAdd: (type: DraftQuestionType, label: string) => void;
}) {
  return (
    <div className="mt-4">
      <p className="mb-3 text-center text-sm text-muted-foreground">
        フォームに追加する要素を選んでください。
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {paletteItems.map((item) => (
          <Button
            key={item.label}
            onClick={() => onAdd(item.type, item.label)}
            size="sm"
            type="button"
            variant="outline"
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
  value,
  tagRulesText,
  tags,
  onChange
}: {
  value: string;
  tagRulesText: string;
  tags: TagSummary[];
  onChange: (value: string, tagRulesText?: string) => void;
}) {
  const tagRules = useMemo(() => parseTagRuleText(tagRulesText), [tagRulesText]);
  const choices = value
    .split(/\r?\n/)
    .filter((choice, index, array) => choice || index < array.length - 1)
    .map((label) => ({ label, tagId: tagRules.get(label.trim()) ?? "" }));
  const normalizedChoices =
    choices.length > 0 ? choices : [{ label: "選択肢1", tagId: "" }];

  function updateChoices(nextChoices: Array<{ label: string; tagId: string }>) {
    const nextOptionsText = nextChoices.map((choice) => choice.label).join("\n");
    const nextTagRulesText = nextChoices
      .filter((choice) => choice.label.trim() && choice.tagId)
      .map((choice) => `${choice.label.trim()}=>${choice.tagId}`)
      .join("\n");
    onChange(nextOptionsText, nextTagRulesText);
  }

  function updateChoice(index: number, patch: Partial<{ label: string; tagId: string }>) {
    updateChoices(
      normalizedChoices.map((choice, choiceIndex) =>
        choiceIndex === index ? { ...choice, ...patch } : choice
      )
    );
  }

  function addChoice(label = `選択肢${normalizedChoices.length + 1}`) {
    updateChoices([...normalizedChoices, { label, tagId: "" }]);
  }

  function duplicateChoice(index: number) {
    const source = normalizedChoices[index] || { label: `選択肢${index + 1}`, tagId: "" };
    updateChoices([
      ...normalizedChoices.slice(0, index + 1),
      { label: `${source.label} のコピー`, tagId: source.tagId },
      ...normalizedChoices.slice(index + 1)
    ]);
  }

  function moveChoice(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= normalizedChoices.length) return;
    const nextChoices = [...normalizedChoices];
    [nextChoices[index], nextChoices[nextIndex]] = [nextChoices[nextIndex], nextChoices[index]];
    updateChoices(nextChoices);
  }

  function deleteChoice(index: number) {
    if (normalizedChoices.length <= 1) return;
    updateChoices(normalizedChoices.filter((_, choiceIndex) => choiceIndex !== index));
  }

  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="space-y-3">
        {normalizedChoices.map((choice, index) => (
          <div className="rounded-md border bg-background p-3" key={`${index}-${choice.label}`}>
            <div className="grid gap-2 md:grid-cols-[5rem_1fr_auto] md:items-center">
              <span className="rounded bg-secondary px-2 py-1 text-center text-sm">
                選択肢{index + 1}
              </span>
              <Input
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
                  disabled={normalizedChoices.length <= 1}
                  onClick={() => deleteChoice(index)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  削除
                </Button>
              </div>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-[5rem_1fr] md:items-start">
              <Label className="pt-2 text-sm text-muted-foreground md:text-right">タグ</Label>
              <TagRulePicker
                onChange={(nextValue) => updateChoice(index, { tagId: nextValue })}
                tags={tags}
                value={choice.tagId}
              />
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

function parseTagRuleText(value: string) {
  const map = new Map<string, string>();
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [answer, tagId] = line.split("=>").map((part) => part.trim());
      if (answer && tagId) map.set(answer, tagId);
    });
  return map;
}

function FolderButton({
  active,
  label,
  count,
  onClick
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      className={
        active
          ? "flex w-full items-center gap-2 rounded-md bg-amber-50 px-2 py-2 text-left text-sm font-medium"
          : "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-secondary"
      }
      onClick={onClick}
      type="button"
    >
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <Folder className="h-4 w-4 text-amber-500" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="text-xs text-muted-foreground">{count}</span>
    </button>
  );
}

function BulkSurveyFolderMove({
  folders,
  selectedSurveyIds,
  selectedCount,
  onMoved
}: {
  folders: FolderItem[];
  selectedSurveyIds: string[];
  selectedCount: number;
  onMoved: () => void;
}) {
  const [state, formAction] = useFormState(moveSurveysToFolder, initialState);

  useEffect(() => {
    if (state.ok) onMoved();
  }, [onMoved, state.ok]);

  if (selectedCount === 0) return null;

  return (
    <form action={formAction} className="flex flex-col gap-1 sm:min-w-64">
      {selectedSurveyIds.map((surveyId) => (
        <input key={surveyId} name="survey_ids" type="hidden" value={surveyId} />
      ))}
      <select
        className="h-10 rounded-md border border-green-600 bg-background px-3 text-sm font-medium text-green-800"
        defaultValue=""
        name="folder_id"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        <option value="" disabled>
          {selectedCount}件をフォルダへ移動
        </option>
        <option value="none">未分類へ移動</option>
        {folders.map((folder) => (
          <option key={folder.id} value={folder.id}>
            {folder.name}へ移動
          </option>
        ))}
      </select>
      <BulkMoveMessage state={state} />
    </form>
  );
}

function BulkMoveMessage({ state }: { state: SurveyActionState }) {
  const { pending } = useFormStatus();
  if (pending) return <p className="text-xs text-muted-foreground">移動しています...</p>;
  if (!state.message) return null;
  return (
    <p className={`text-xs ${state.ok ? "text-green-700" : "text-destructive"}`}>
      {state.message}
    </p>
  );
}

function SurveyTable({
  surveys,
  onViewResponses,
  onCopySurvey,
  selectedSurveyIds,
  onToggleSelection,
  onSelectAllVisible
}: {
  surveys: SurveyItem[];
  onViewResponses: (survey: SurveyItem) => void;
  onCopySurvey: (survey: SurveyItem) => void;
  selectedSurveyIds: Set<string>;
  onToggleSelection: (surveyId: string, checked: boolean) => void;
  onSelectAllVisible: (checked: boolean) => void;
}) {
  const allVisibleSelected =
    surveys.length > 0 && surveys.every((survey) => selectedSurveyIds.has(survey.id));
  const someVisibleSelected = surveys.some((survey) => selectedSurveyIds.has(survey.id));

  return (
    <section className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/60">
            <TableHead className="w-10">
              <input
                aria-label="表示中の回答フォームをすべて選択"
                checked={allVisibleSelected}
                ref={(element) => {
                  if (element) element.indeterminate = someVisibleSelected && !allVisibleSelected;
                }}
                onChange={(event) => onSelectAllVisible(event.target.checked)}
                type="checkbox"
              />
            </TableHead>
            <TableHead>フォーム名</TableHead>
            <TableHead>フォルダ</TableHead>
            <TableHead>回答/設問</TableHead>
            <TableHead>登録日</TableHead>
            <TableHead>公開状態</TableHead>
            <TableHead className="w-[22rem]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {surveys.length > 0 ? (
            surveys.map((survey) => (
              <SurveyRow
                key={survey.id}
                onCopySurvey={() => onCopySurvey(survey)}
                onSelectedChange={(checked) => onToggleSelection(survey.id, checked)}
                onViewResponses={() => onViewResponses(survey)}
                selected={selectedSurveyIds.has(survey.id)}
                survey={survey}
              />
            ))
          ) : (
            <TableRow>
              <TableCell className="h-32 text-center text-muted-foreground" colSpan={7}>
                回答フォームが作成されていません。
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </section>
  );
}

function SurveyRow({
  survey,
  onViewResponses,
  onCopySurvey,
  selected,
  onSelectedChange
}: {
  survey: SurveyItem;
  onViewResponses: () => void;
  onCopySurvey: () => void;
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
}) {
  const [state, formAction] = useFormState(toggleSurveyActive, initialState);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });
  const [copyMessage, setCopyMessage] = useState("");
  const isPublic = survey.is_active && survey.is_visible !== false;
  const publicPath = `/survey/${survey.id}`;
  const publicUrl =
    typeof window === "undefined" ? publicPath : `${location.origin}${publicPath}`;
  const personalLineUrl =
    typeof window === "undefined"
      ? `${publicPath}?source=personal-line`
      : `${location.origin}${publicPath}?source=personal-line`;

  function openMenu(event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 192;
    const menuHeight = 260;
    const left = Math.min(
      Math.max(12, rect.right - menuWidth),
      window.innerWidth - menuWidth - 12
    );
    const hasSpaceBelow = rect.bottom + menuHeight + 12 < window.innerHeight;
    const top = hasSpaceBelow
      ? rect.bottom + 8
      : Math.max(12, rect.top - menuHeight - 8);

    setMenuPosition({ left, top });
    setMenuOpen((open) => !open);
  }

  async function copyUrl(url: string, message: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      setCopyMessage(message);
      window.setTimeout(() => setCopyMessage(""), 2500);
    } catch {
      window.prompt("コピーできない場合は、このURLを選択してコピーしてください。", url);
    }
  }

  return (
    <TableRow className={selected ? "bg-green-50" : undefined}>
      <TableCell>
        <input
          aria-label={`${survey.admin_title || survey.title}を選択`}
          checked={selected}
          onChange={(event) => onSelectedChange(event.target.checked)}
          type="checkbox"
        />
      </TableCell>
      <TableCell>
        <Link
          className="font-medium text-accent underline-offset-2 hover:underline"
          href={`/surveys/${survey.id}/builder`}
        >
          {survey.admin_title || survey.title}
        </Link>
        <p className="text-xs text-muted-foreground">
          学生向け: {survey.public_title || survey.title}
        </p>
      </TableCell>
      <TableCell>{survey.folder?.name ?? "未分類"}</TableCell>
      <TableCell>
        <div className="space-y-1">
          <button
            className="font-medium text-accent underline-offset-2 hover:underline"
            onClick={onViewResponses}
            type="button"
          >
            {survey.response_count}回答
          </button>
          {survey.response_count > 0 ? (
            <div>
              <Button onClick={onViewResponses} size="sm" type="button" variant="outline">
                回答結果
              </Button>
            </div>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <p>{formatDateTime(survey.created_at)}</p>
        <p className="text-xs text-muted-foreground">
          {survey.staff ? getStaffDisplayName(survey.staff) : "-"}
        </p>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          <Badge variant={isPublic ? "accent" : "secondary"}>
            {isPublic ? "公開中" : "非公開"}
          </Badge>
          {!survey.is_visible ? <Badge variant="outline">非表示</Badge> : null}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href={`/surveys/${survey.id}/builder`}>
              <Plus className="mr-2 h-4 w-4" />
              質問を編集
            </Link>
          </Button>
          <Button
            onClick={onCopySurvey}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Copy className="mr-2 h-4 w-4" />
            コピー作成
          </Button>
          <Button
            onClick={() => void copyUrl(personalLineUrl, "個人LINE用URLをコピーしました")}
            size="sm"
            type="button"
            variant="outline"
          >
            <Copy className="mr-2 h-4 w-4" />
            個人LINE用URL
          </Button>
          <form action={formAction}>
            <input name="survey_id" type="hidden" value={survey.id} />
            <input
              name="next_active"
              type="hidden"
              value={isPublic ? "false" : "true"}
            />
            <ToggleButton active={isPublic} />
          </form>
          <div className="relative">
            <Button
              onClick={openMenu}
              size="sm"
              type="button"
              variant="ghost"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            {menuOpen ? (
              <div
                className="fixed z-50 w-48 rounded-md border bg-background p-1 shadow-xl"
                style={{ left: menuPosition.left, top: menuPosition.top }}
              >
                <button
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-secondary"
                  onClick={() => {
                    onCopySurvey();
                    setMenuOpen(false);
                  }}
                  type="button"
                >
                  <Copy className="h-4 w-4" />
                  コピー作成
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-secondary"
                  onClick={() => {
                    void copyUrl(personalLineUrl, "個人LINE用URLをコピーしました");
                    setMenuOpen(false);
                  }}
                  type="button"
                >
                  <Copy className="h-4 w-4" />
                  個人LINE用URL
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-secondary"
                  onClick={() => {
                    alert("テスト送信はLINE連携設定後に利用できます。");
                    setMenuOpen(false);
                  }}
                  type="button"
                >
                  <Send className="h-4 w-4" />
                  テスト送信
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-secondary"
                  onClick={() => setMenuOpen(false)}
                  type="button"
                >
                  <Power className="h-4 w-4" />
                  公開設定
                </button>
                <Link
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-secondary"
                  href={`/surveys/${survey.id}/builder`}
                  onClick={() => setMenuOpen(false)}
                >
                  <ExternalLink className="h-4 w-4" />
                  詳細を確認
                </Link>
                <button
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-destructive hover:bg-secondary"
                  onClick={() => {
                    alert("削除機能は誤操作防止の確認画面を追加してから有効化します。");
                    setMenuOpen(false);
                  }}
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                  削除
                </button>
              </div>
            ) : null}
          </div>
        </div>
        {copyMessage ? (
          <p className="mt-2 text-xs font-medium text-accent">{copyMessage}</p>
        ) : null}
        <FormMessage state={state} />
      </TableCell>
    </TableRow>
  );
}

type SurveyResponseRow = {
  id: string;
  submitted_at: string;
  raw_answers_jsonb: Record<string, unknown>;
  respondent_name: string | null;
  respondent_line_user_id: string | null;
  needs_manual_merge: boolean | null;
  students: {
    id: string;
    real_name: string | null;
    display_name: string | null;
    university: string | null;
    phone: string | null;
    email: string | null;
    line_user_id: string | null;
    photo_url?: string | null;
  } | null;
};

type StudentSearchResult = {
  id: string;
  real_name: string | null;
  display_name: string | null;
  kana: string | null;
  university: string | null;
  phone: string | null;
  email: string | null;
  line_user_id: string | null;
  photo_url?: string | null;
};

function ResponseResultsModal({
  survey,
  onClose
}: {
  survey: SurveyItem;
  onClose: () => void;
}) {
  const [responses, setResponses] = useState<SurveyResponseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [linkingResponseId, setLinkingResponseId] = useState<string | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentSearchResults, setStudentSearchResults] = useState<StudentSearchResult[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);
  const [linkMessage, setLinkMessage] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);

  async function loadResponses() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/survey-responses?survey_id=${survey.id}`, {
        cache: "no-store"
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "回答結果を取得できませんでした。");
      setResponses(json.responses ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "回答結果を取得できませんでした。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {

    void loadResponses();
  }, [survey.id]);

  async function searchStudents(query = studentSearchQuery) {
    const trimmedQuery = query.trim();
    setStudentSearchQuery(query);
    setSelectedStudent(null);
    setLinkMessage("");

    if (!trimmedQuery) {
      setStudentSearchResults([]);
      return;
    }

    setLinkLoading(true);
    try {
      const response = await fetch(
        `/api/survey-responses/student-search?q=${encodeURIComponent(trimmedQuery)}`,
        { cache: "no-store" }
      );
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "学生を検索できませんでした。");
      setStudentSearchResults(json.students ?? []);
    } catch (error) {
      setLinkMessage(error instanceof Error ? error.message : "学生を検索できませんでした。");
    } finally {
      setLinkLoading(false);
    }
  }

  function startLinking(response: SurveyResponseRow, answerRows: Array<{ label: string; value: unknown }>) {
    const name = getRespondentName(response, answerRows);
    setLinkingResponseId(response.id);
    setStudentSearchQuery(name === "未紐付け回答" ? "" : name);
    setStudentSearchResults([]);
    setSelectedStudent(null);
    setLinkMessage("");
  }

  async function linkResponseToStudent(responseId: string, student: StudentSearchResult) {
    setLinkLoading(true);
    setLinkMessage("");
    try {
      const response = await fetch("/api/survey-responses/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response_id: responseId, student_id: student.id })
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "回答を学生に登録できませんでした。");
      setLinkingResponseId(null);
      setStudentSearchQuery("");
      setStudentSearchResults([]);
      setSelectedStudent(null);
      await loadResponses();
    } catch (error) {
      setLinkMessage(error instanceof Error ? error.message : "回答を学生に登録できませんでした。");
    } finally {
      setLinkLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-md bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold">回答結果</h3>
            <p className="text-sm text-muted-foreground">
              {survey.admin_title || survey.title}
            </p>
          </div>
          <Button onClick={onClose} type="button" variant="outline">
            閉じる
          </Button>
        </div>

        <div className="max-h-[70vh] overflow-auto p-5">
          {loading ? (
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          ) : message ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {message}
            </p>
          ) : responses.length > 0 ? (
            <div className="space-y-5">
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p className="font-medium">回答数</p>
                <p className="mt-1">{responses.length}件</p>
              </div>
              {responses.map((response, index) => {
                const answerRows = getReadableAnswerRows(response, survey.questions);
                const respondentName = getRespondentName(response, answerRows);
                const university = getRespondentUniversity(response, answerRows);
                const changes = getResponseChanges(answerRows, survey.questions, respondentName);

                return (
                  <div className="rounded-md border bg-card" key={response.id}>
                    <div className="grid gap-4 border-b bg-muted/30 p-4 md:grid-cols-[12rem_1fr]">
                      <div>
                        <p className="text-xs text-muted-foreground">回答者</p>
                        {response.students?.id ? (
                          <Link
                            className="font-semibold text-primary hover:underline"
                            href={`/students/${response.students.id}`}
                          >
                            {localizeSampleText(respondentName) || respondentName}
                          </Link>
                        ) : (
                          <p className="font-semibold">
                            {localizeSampleText(respondentName) || respondentName}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {response.students ? "学生情報と紐付け済み" : "未紐付け"}
                        </p>
                        {!response.students?.id ? (
                          <Button
                            className="mt-3"
                            onClick={() => startLinking(response, answerRows)}
                            size="sm"
                            type="button"
                          >
                            友だちの回答として登録する
                          </Button>
                        ) : null}
                      </div>
                      <div className="grid gap-3 text-sm md:grid-cols-3">
                        <div>
                          <p className="text-xs text-muted-foreground">回答番号</p>
                          <p>{index + 1}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">大学</p>
                          <p>{localizeSampleText(university) || university}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">回答日時</p>
                          <p>{formatDateTime(response.submitted_at)}</p>
                        </div>
                      </div>
                    </div>

                    {!response.students?.id && linkingResponseId === response.id ? (
                      <div className="border-b bg-emerald-50/40 p-4">
                        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                          <div className="rounded-md border bg-background p-3">
                            <h4 className="font-semibold">回答を登録する友だちを検索</h4>
                            <div className="mt-3 flex gap-2">
                              <Input
                                onChange={(event) => setStudentSearchQuery(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key !== "Enter") return;
                                  event.preventDefault();
                                  void searchStudents();
                                }}
                                placeholder="氏名・ふりがな・大学・電話・メールで検索"
                                value={studentSearchQuery}
                              />
                              <Button disabled={linkLoading} onClick={() => searchStudents()} type="button">
                                検索
                              </Button>
                            </div>
                            <div className="mt-3 overflow-hidden rounded-md border">
                              {studentSearchResults.length > 0 ? (
                                studentSearchResults.map((student) => (
                                  <button
                                    className={
                                      selectedStudent?.id === student.id
                                        ? "flex w-full items-center gap-3 border-b bg-primary/10 px-3 py-2 text-left last:border-b-0"
                                        : "flex w-full items-center gap-3 border-b px-3 py-2 text-left hover:bg-muted/50 last:border-b-0"
                                    }
                                    key={student.id}
                                    onClick={() => setSelectedStudent(student)}
                                    type="button"
                                  >
                                    {student.photo_url ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        alt=""
                                        className="h-10 w-10 rounded-full object-cover"
                                        src={student.photo_url}
                                      />
                                    ) : (
                                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                                        {(student.real_name || student.display_name || "?").slice(0, 1)}
                                      </span>
                                    )}
                                    <span>
                                      <span className="block font-medium">
                                        {student.real_name || student.display_name || "名前未登録"}
                                      </span>
                                      <span className="block text-xs text-muted-foreground">
                                        {[student.kana, student.university, student.phone, student.email]
                                          .filter(Boolean)
                                          .join(" / ") || "補足情報なし"}
                                      </span>
                                    </span>
                                  </button>
                                ))
                              ) : (
                                <p className="p-3 text-sm text-muted-foreground">
                                  検索すると候補がここに表示されます。
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="rounded-md border bg-background p-3">
                            <h4 className="font-semibold">登録内容の確認</h4>
                            {selectedStudent ? (
                              <div className="mt-3 space-y-3">
                                <p className="text-sm">
                                  <span className="font-semibold">
                                    {selectedStudent.real_name || selectedStudent.display_name || "名前未登録"}
                                  </span>
                                  さんの回答として登録します。
                                </p>
                                <div className="rounded-md bg-muted/40 p-3 text-sm">
                                  <p>大学: {selectedStudent.university || "-"}</p>
                                  <p>電話: {selectedStudent.phone || "-"}</p>
                                  <p>メール: {selectedStudent.email || "-"}</p>
                                </div>
                                <Button
                                  className="w-full"
                                  disabled={linkLoading}
                                  onClick={() => linkResponseToStudent(response.id, selectedStudent)}
                                  type="button"
                                >
                                  {selectedStudent.real_name || selectedStudent.display_name || "この学生"}の回答として登録する
                                </Button>
                              </div>
                            ) : (
                              <p className="mt-3 text-sm text-muted-foreground">
                                検索結果から学生を選択してください。
                              </p>
                            )}
                            {linkMessage ? (
                              <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                {linkMessage}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-4 p-4 xl:grid-cols-[1fr_20rem]">
                      <div>
                        <h4 className="mb-3 font-semibold">フォームの回答</h4>
                        <div className="overflow-hidden rounded-md border">
                          {answerRows.length > 0 ? (
                            answerRows.map((row) => (
                              <div
                                className="grid border-b last:border-b-0 md:grid-cols-[18rem_1fr]"
                                key={row.key}
                              >
                                <div className="bg-muted/40 px-3 py-2 text-sm font-medium">
                                  {row.label}
                                </div>
                                <div className="whitespace-pre-wrap px-3 py-2 text-sm">
                                  {formatAnswerValue(row.value)}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="p-3 text-sm text-muted-foreground">回答内容がありません。</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="mb-3 font-semibold">このフォームによる変更</h4>
                        <div className="overflow-hidden rounded-md border">
                          {changes.length > 0 ? (
                            changes.map((change) => (
                              <div
                                className="grid grid-cols-[1fr_4.5rem] border-b last:border-b-0"
                                key={`${change.label}-${change.value}`}
                              >
                                <div className="bg-muted/40 px-3 py-2 text-sm font-medium">
                                  {change.label}
                                </div>
                                <div className="px-3 py-2 text-sm">{change.value}</div>
                              </div>
                            ))
                          ) : (
                            <p className="p-3 text-sm text-muted-foreground">
                              自動変更はありません。
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">まだ回答はありません。</p>
          )}
        </div>
      </div>
    </div>
  );
}

function getReadableAnswerRows(
  response: SurveyResponseRow,
  questions: SurveyItem["questions"]
) {
  const questionMap = new Map(questions.map((question) => [question.id, question]));
  return Object.entries(response.raw_answers_jsonb ?? {})
    .map(([key, value]) => {
      const question = questionMap.get(key);
      return {
        key,
        order: question?.order ?? 9999,
        label: question?.label || key,
        value
      };
    })
    .sort((a, b) => a.order - b.order);
}

function getRespondentName(
  response: SurveyResponseRow,
  answerRows: Array<{ label: string; value: unknown }>
) {
  if (response.students?.real_name) return response.students.real_name;
  if (response.respondent_name) return response.respondent_name;
  if (response.students?.display_name) return response.students.display_name;

  const nameAnswer = answerRows.find((row) =>
    ["氏名", "名前", "お名前", "フルネーム"].some((word) => row.label.includes(word))
  );

  const formatted = nameAnswer ? formatAnswerValue(nameAnswer.value) : "";
  return formatted && formatted !== "-" ? formatted : "未紐付け回答";
}

function getRespondentUniversity(
  response: SurveyResponseRow,
  answerRows: Array<{ label: string; value: unknown }>
) {
  if (response.students?.university) return response.students.university;

  const universityAnswer = answerRows.find((row) => row.label.includes("大学"));
  const formatted = universityAnswer ? formatAnswerValue(universityAnswer.value) : "";
  return formatted && formatted !== "-" ? formatted : "-";
}

function formatAnswerValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => localizeSampleText(String(item)) || String(item)).join("、");
  }
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return localizeSampleText(String(value)) || String(value);
}

function getResponseChanges(
  answerRows: Array<{ key: string; label: string; value: unknown }>,
  questions: SurveyItem["questions"],
  respondentName: string
) {
  const changes: Array<{ label: string; value: string }> = [];
  if (respondentName && respondentName !== "未紐付け回答") {
    changes.push({ label: "本名", value: localizeSampleText(respondentName) || respondentName });
    changes.push({ label: "システム表示名", value: localizeSampleText(respondentName) || respondentName });
  }

  for (const row of answerRows) {
    const question = questions.find((item) => item.id === row.key);
    for (const rule of question?.survey_question_tags ?? []) {
      if (!answerMatchesRule(row.value, rule.when_answer_matches_jsonb)) continue;
      const tagName = rule.tags?.name ? localizeSampleText(rule.tags.name) : "タグ";
      changes.push({ label: `タグ:${tagName}`, value: "追加" });
    }
  }

  return changes;
}

function answerMatchesRule(answer: unknown, rule: unknown) {
  if (!rule || typeof rule !== "object" || Array.isArray(rule)) return false;
  const values = Array.isArray(answer) ? answer.map(String) : [String(answer ?? "")];
  const matcher = rule as { equals?: unknown; contains?: unknown };
  if (typeof matcher.equals === "string") {
    return values.some((value) => value === matcher.equals);
  }
  if (typeof matcher.contains === "string") {
    return values.some((value) => value.includes(matcher.contains as string));
  }
  return false;
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
    <Button
      onClick={onClick}
      type="button"
      variant={active ? "default" : "outline"}
    >
      {children}
    </Button>
  );
}

function CreateOptions({ defaults }: { defaults: CreateDefaults }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-[14rem_1fr] md:items-center">
        <Label className="md:text-right">進むボタンテキスト</Label>
        <Input defaultValue="進む" />
        <Label className="md:text-right">送信ボタンテキスト</Label>
        <Input defaultValue="送信" />
        <Label className="md:text-right">確認テキスト</Label>
        <Textarea defaultValue="送信してよろしいですか？" />
        <Label className="md:text-right">送信後メッセージ</Label>
        <Input
          defaultValue={defaults.thank_you_message}
          name="thank_you_message"
          placeholder="回答を送信しました。"
        />
        <Label className="md:text-right">回答後に移動するURL</Label>
        <Input defaultValue={defaults.redirect_url} name="redirect_url" placeholder="https://..." />
      </div>
      <div className="grid gap-3 md:grid-cols-[14rem_1fr]">
        <div />
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input name="one_response_per_student" type="hidden" value="off" />
            <input defaultChecked={defaults.one_response_per_student} name="one_response_per_student" type="checkbox" />
            1人1回だけ回答できるようにする
          </label>
          <label className="flex items-center gap-2">
            <input name="is_visible" type="hidden" value="off" />
            <input defaultChecked={defaults.is_visible} name="is_visible" type="checkbox" />
            学生に表示する
          </label>
          <label className="flex items-center gap-2">
            <input name="is_active" type="hidden" value="off" />
            <input defaultChecked={defaults.is_active} name="is_active" type="checkbox" />
            作成後すぐ公開する
          </label>
        </div>
      </div>
    </div>
  );
}

function DesignOptions({ defaults }: { defaults: CreateDefaults }) {
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
          defaultValue={defaults.custom_css}
          name="custom_css"
          placeholder="body { background-color: #FFFFFF; }"
          rows={5}
        />
      </Field>
    </div>
  );
}

function AutoInputOptions() {
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

function ToggleButton({ active }: { active: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} size="sm" type="submit" variant="ghost">
      <Power className="mr-2 h-4 w-4" />
      {active ? "非公開" : "公開"}
    </Button>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} type="submit">
      <Plus className="mr-2 h-4 w-4" />
      {pending ? "保存中..." : label}
    </Button>
  );
}

function FormMessage({ state }: { state: SurveyActionState }) {
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
