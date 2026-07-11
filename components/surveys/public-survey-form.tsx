"use client";

import type { MouseEvent } from "react";
import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  submitPublicSurvey,
  type PublicSurveyState
} from "@/app/survey/[id]/actions";
import { LiffLineIdentity } from "@/components/surveys/liff-line-identity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Json } from "@/lib/supabase/database.types";

type PublicSection = {
  id: string;
  order: number;
  title: string;
  description: string | null;
  is_visible: boolean;
};

type PublicQuestion = {
  id: string;
  section_id: string | null;
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
};

const initialState: PublicSurveyState = {
  ok: false,
  message: ""
};

export function PublicSurveyForm({
  surveyId,
  liffId,
  lineUserId,
  studentId,
  source,
  sections,
  questions,
  thankYouMessage,
  redirectUrl
}: {
  surveyId: string;
  liffId?: string;
  lineUserId?: string;
  studentId?: string;
  source?: string;
  sections: PublicSection[];
  questions: PublicQuestion[];
  thankYouMessage?: string | null;
  redirectUrl?: string | null;
}) {
  const [state, formAction] = useFormState(submitPublicSurvey, initialState);
  const visibleSections = sections.filter((section) => section.is_visible !== false);
  const visibleQuestions = questions.filter((question) => question.is_visible !== false);
  const hasAnswerableQuestions = visibleQuestions.some(
    (question) => question.type !== "heading"
  );
  const [sectionId, setSectionId] = useState(visibleSections[0]?.id ?? "__no_section__");
  const [visitedSectionIds, setVisitedSectionIds] = useState<string[]>(
    visibleSections[0]?.id ? [visibleSections[0].id] : ["__no_section__"]
  );
  const [nextSectionBySectionId, setNextSectionBySectionId] = useState<Record<string, string>>({});
  const [clientError, setClientError] = useState("");
  const [resolvedLineUserId, setResolvedLineUserId] = useState(lineUserId ?? "");
  const shouldResolveLineUserId = source === "rich-menu" && !lineUserId && !studentId;

  const currentSectionIndex = visibleSections.findIndex((section) => section.id === sectionId);
  const isSectionMode = visibleSections.length > 0 && sectionId !== "__no_section__";
  const currentQuestions = useMemo(
    () =>
      sectionId === "__no_section__"
        ? visibleQuestions.filter((question) => !question.section_id)
        : visibleQuestions.filter((question) => question.section_id === sectionId),
    [sectionId, visibleQuestions]
  );
  const isLastSection = !isSectionMode || currentSectionIndex >= visibleSections.length - 1;

  function moveToNextSection(event: MouseEvent<HTMLButtonElement>) {
    if (!isSectionMode) return;
    if (!validateCurrentSection(event.currentTarget.form)) return;
    const explicitNextId = nextSectionBySectionId[sectionId];
    const nextSectionId = explicitNextId || visibleSections[currentSectionIndex + 1]?.id;
    if (!nextSectionId) return;
    setClientError("");
    setSectionId(nextSectionId);
    setVisitedSectionIds((current) =>
      current.includes(nextSectionId) ? current : [...current, nextSectionId]
    );
  }

  function validateCurrentSection(form: HTMLFormElement | null) {
    if (!form) return true;

    for (const question of currentQuestions) {
      if (!question.is_required || question.type === "heading") continue;
      const name = `question_${question.id}`;
      const label = question.label || "必須項目";

      if (question.type === "checkbox") {
        const checked = form.querySelectorAll<HTMLInputElement>(
          `input[name="${name}"]:checked`
        );
        if (checked.length === 0) {
          setClientError(`「${label}」を1つ以上選択してください。`);
          return false;
        }
        continue;
      }

      const element = form.elements.namedItem(name);
      const value =
        element instanceof RadioNodeList
          ? element.value
          : element instanceof HTMLInputElement ||
              element instanceof HTMLTextAreaElement ||
              element instanceof HTMLSelectElement
            ? element.value
            : "";

      if (!value) {
        setClientError(`「${label}」を入力してください。`);
        return false;
      }
    }

    return true;
  }

  if (state.ok) {
    return (
      <div className="survey-card rounded-[18px] border border-[#d6b77f] bg-[#fffaf2] p-6 text-center shadow-sm">
        <h2 className="text-xl font-semibold">送信が完了しました</h2>
        <p className="mt-3 text-[#725a43]">
          {state.message || thankYouMessage || "回答を送信しました。ありがとうございます。"}
        </p>
        {state.redirectUrl || redirectUrl ? (
          <Button
            className="mt-5"
            onClick={() => {
              window.location.href = state.redirectUrl || redirectUrl || "/";
            }}
            type="button"
          >
            次へ進む
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="public-survey-form survey-card space-y-5 rounded-[18px] border border-[#d6b77f] bg-[#fffaf2] p-4 shadow-sm sm:p-5"
      noValidate
    >
      <input name="survey_id" type="hidden" value={surveyId} />
      <input name="line_user_id" type="hidden" value={resolvedLineUserId} />
      <input name="student_id" type="hidden" value={studentId ?? ""} />
      <input name="source" type="hidden" value={source ?? ""} />
      <input name="respondent_name" type="hidden" value="" />
      <LiffLineIdentity
        enabled={shouldResolveLineUserId}
        liffId={liffId ?? ""}
        onLineUserId={setResolvedLineUserId}
      />

      {visitedSectionIds.map((visitedSectionId) => (
        <input key={visitedSectionId} name="visited_section_ids" type="hidden" value={visitedSectionId} />
      ))}

      {visibleSections.length > 0 ? (
        <div className="flex items-center gap-3 text-sm text-[#725a43]">
          <span className="whitespace-nowrap text-base font-medium">
            {currentSectionIndex + 1} / {visibleSections.length}
          </span>
          <div className="h-2 flex-1 rounded-full bg-[#ead6b8]">
            <div
              className="h-2 rounded-full bg-[#149447] transition-all"
              style={{
                width: `${((currentSectionIndex + 1) / Math.max(visibleSections.length, 1)) * 100}%`
              }}
            />
          </div>
        </div>
      ) : null}

      {!hasAnswerableQuestions ? (
        <div className="rounded-[14px] border border-[#d6b77f] bg-[#fffdf8] p-5 text-center text-[#725a43]">
          回答項目がまだありません。管理画面で質問を追加してください。
        </div>
      ) : null}

      {isSectionMode ? (
        visitedSectionIds
          .filter((visitedSectionId) => visitedSectionId !== "__no_section__")
          .map((visitedSectionId) => {
            const visitedSection = visibleSections.find((section) => section.id === visitedSectionId);
            const sectionQuestions = visibleQuestions.filter(
              (question) => question.section_id === visitedSectionId
            );
            const isCurrent = visitedSectionId === sectionId;

            return (
              <div className={isCurrent ? "space-y-5" : "hidden"} key={visitedSectionId}>
                <SectionHeader section={visitedSection} />
                {sectionQuestions.map((question) => (
                  <QuestionField
                    key={question.id}
                    onBranch={(nextSectionId) => {
                      setNextSectionBySectionId((current) => ({
                        ...current,
                        [visitedSectionId]: nextSectionId
                      }));
                    }}
                    question={question}
                  />
                ))}
              </div>
            );
          })
      ) : (
        currentQuestions.map((question) => (
          <QuestionField
            key={question.id}
            onBranch={() => undefined}
            question={question}
          />
        ))
      )}

      {clientError ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {clientError}
        </p>
      ) : null}

      {state.message ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      {!hasAnswerableQuestions ? null : isSectionMode && !isLastSection ? (
        <Button className="h-11 w-full rounded-[10px] bg-[#149447] text-base hover:bg-[#0f7c3b]" onClick={moveToNextSection} type="button">
          次へ
        </Button>
      ) : (
        <SubmitButton />
      )}
    </form>
  );
}

function SectionHeader({ section }: { section?: PublicSection }) {
  if (!section) return null;
  return (
    <div className="rounded-[14px] border-l-4 border-[#149447] bg-[#fffdf8] p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-[#2f241b]">{section.title}</h2>
      {section.description ? (
        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#725a43]">
          {section.description}
        </p>
      ) : null}
    </div>
  );
}

function QuestionField({
  question,
  onBranch
}: {
  question: PublicQuestion;
  onBranch: (sectionId: string) => void;
}) {
  const options = Array.isArray(question.options_jsonb)
    ? question.options_jsonb.map(String)
    : [];
  const name = `question_${question.id}`;
  const branches = Array.isArray(question.branch_rules_jsonb)
    ? (question.branch_rules_jsonb as Array<{ answer?: string; targetSectionId?: string }>)
    : [];

  function branchIfNeeded(value: string) {
    const branch = branches.find((rule) => rule.answer === value);
    if (branch?.targetSectionId) onBranch(branch.targetSectionId);
  }

  if (question.type === "heading") {
    return (
      <div className="space-y-2 rounded-[14px] border-l-4 border-[#149447] bg-[#fffdf8] p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-[#2f241b]">{question.label}</h3>
        {question.description ? (
          <p className="whitespace-pre-line text-sm leading-6 text-[#725a43]">
            {question.description}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <fieldset className="space-y-3 rounded-[14px] border-2 border-[#d6b77f] bg-[#fffdf8] px-4 pb-4 pt-3">
      <legend className="px-2 text-base font-semibold text-[#5a402a]">
        {question.label}
        {question.is_required ? (
          <span className="ml-2 rounded-md bg-[#c83b32] px-2 py-0.5 text-xs font-semibold text-white">
            必須
          </span>
        ) : null}
      </legend>
      {question.description ? (
        <p className="whitespace-pre-line text-sm leading-6 text-[#725a43]">
          {question.description}
        </p>
      ) : null}
      {question.attached_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="max-h-80 rounded-md object-cover"
          src={question.attached_image_url}
        />
      ) : null}
      {question.type === "text" ? (
        <Input
          className="h-11 rounded-[10px] border-2 border-[#d6b77f] bg-white px-4 text-base text-[#2f241b] shadow-none focus-visible:ring-[#149447]"
          name={name}
          pattern={getPattern(question.validation_type)}
          placeholder={question.placeholder ?? ""}
          required={question.is_required}
          type={question.validation_type === "email" ? "email" : question.validation_type === "phone" ? "tel" : "text"}
        />
      ) : null}
      {question.type === "file_upload" ? (
        <Input className="h-11 rounded-[10px] border-2 border-[#d6b77f] bg-white text-base text-[#2f241b] shadow-none focus-visible:ring-[#149447]" name={name} required={question.is_required} type="file" />
      ) : null}
      {question.type === "select" ? (
        <select
          className="h-11 w-full rounded-[10px] border-2 border-[#d6b77f] bg-white px-4 text-base text-[#2f241b] focus:outline-none focus:ring-2 focus:ring-[#149447]"
          name={name}
          onChange={(event) => branchIfNeeded(event.target.value)}
          required={question.is_required}
        >
          <option value="">選択してください</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : null}
      {question.type === "radio" ? (
        <div className="space-y-2">
          {options.map((option) => (
            <label className="survey-choice flex min-h-12 items-center gap-3 rounded-[10px] border-2 border-[#d6b77f] bg-white px-4 py-3 text-base text-[#3d2f24]" key={option}>
              <input
                className="h-5 w-5 accent-[#149447]"
                name={name}
                onChange={() => branchIfNeeded(option)}
                required={question.is_required}
                type="radio"
                value={option}
              />
              {option}
            </label>
          ))}
        </div>
      ) : null}
      {question.type === "checkbox" ? (
        <div className="space-y-2">
          {options.map((option) => (
            <label className="survey-choice flex min-h-12 items-center gap-3 rounded-[10px] border-2 border-[#d6b77f] bg-white px-4 py-3 text-base text-[#3d2f24]" key={option}>
              <input
                className="h-5 w-5 accent-[#149447]"
                name={name}
                onChange={() => branchIfNeeded(option)}
                type="checkbox"
                value={option}
              />
              {option}
            </label>
          ))}
        </div>
      ) : null}
    </fieldset>
  );
}

function getPattern(validationType: string) {
  if (validationType === "email") return "[^\\s@]+@[^\\s@]+\\.[^\\s@]+";
  if (validationType === "phone") return "^[0-9+\\-()\\s]{8,}$";
  return undefined;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button className="h-11 w-full rounded-[10px] bg-[#149447] text-base hover:bg-[#0f7c3b]" disabled={pending} type="submit">
      {pending ? "送信中..." : "回答を送信"}
    </Button>
  );
}
