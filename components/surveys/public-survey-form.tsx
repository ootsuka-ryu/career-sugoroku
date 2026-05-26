"use client";

import type { MouseEvent } from "react";
import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  submitPublicSurvey,
  type PublicSurveyState
} from "@/app/survey/[id]/actions";
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
  lineUserId,
  source,
  sections,
  questions,
  thankYouMessage,
  redirectUrl
}: {
  surveyId: string;
  lineUserId?: string;
  source?: string;
  sections: PublicSection[];
  questions: PublicQuestion[];
  thankYouMessage?: string | null;
  redirectUrl?: string | null;
}) {
  const [state, formAction] = useFormState(submitPublicSurvey, initialState);
  const visibleSections = sections.filter((section) => section.is_visible !== false);
  const visibleQuestions = questions.filter((question) => question.is_visible !== false);
  const [sectionId, setSectionId] = useState(visibleSections[0]?.id ?? "__no_section__");
  const [visitedSectionIds, setVisitedSectionIds] = useState<string[]>(
    visibleSections[0]?.id ? [visibleSections[0].id] : ["__no_section__"]
  );
  const [nextSectionBySectionId, setNextSectionBySectionId] = useState<Record<string, string>>({});
  const [clientError, setClientError] = useState("");

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
      <div className="survey-card rounded-lg border bg-card p-8 text-center">
        <h2 className="text-xl font-semibold">送信完了</h2>
        <p className="mt-3 text-muted-foreground">
          {state.message || thankYouMessage || "回答ありがとうございました。"}
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
    <form action={formAction} className="survey-card space-y-5 rounded-lg border bg-card p-5" noValidate>
      <input name="survey_id" type="hidden" value={surveyId} />
      <input name="line_user_id" type="hidden" value={lineUserId ?? ""} />
      <input name="source" type="hidden" value={source ?? ""} />
      <input name="respondent_name" type="hidden" value="" />

      {visitedSectionIds.map((visitedSectionId) => (
        <input key={visitedSectionId} name="visited_section_ids" type="hidden" value={visitedSectionId} />
      ))}

      {visibleSections.length > 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {currentSectionIndex + 1} / {visibleSections.length}
          </span>
          <div className="h-2 flex-1 rounded-full bg-secondary">
            <div
              className="h-2 rounded-full bg-primary"
              style={{
                width: `${((currentSectionIndex + 1) / Math.max(visibleSections.length, 1)) * 100}%`
              }}
            />
          </div>
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

      {isSectionMode && !isLastSection ? (
        <Button className="w-full" onClick={moveToNextSection} type="button">
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
    <div className="rounded-md bg-secondary/50 p-4">
      <h2 className="text-lg font-semibold">{section.title}</h2>
      {section.description ? (
        <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
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
      <div className="space-y-2 rounded-md border-l-4 border-primary bg-secondary/30 p-4">
        <h3 className="font-semibold">{question.label}</h3>
        {question.description ? (
          <p className="text-sm text-muted-foreground">{question.description}</p>
        ) : null}
      </div>
    );
  }

  return (
    <fieldset className="space-y-3 rounded-md border p-4">
      <legend className="px-1 text-sm font-medium">
        {question.label}
        {question.is_required ? <span className="ml-1 text-destructive">*</span> : null}
      </legend>
      {question.description ? (
        <p className="text-sm text-muted-foreground">{question.description}</p>
      ) : null}
      {question.attached_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="max-h-64 rounded-md object-cover"
          src={question.attached_image_url}
        />
      ) : null}
      {question.type === "text" ? (
        question.validation_type === "email" || question.validation_type === "phone" ? (
          <Input
            name={name}
            pattern={getPattern(question.validation_type)}
            placeholder={question.placeholder ?? ""}
            required={question.is_required}
            type={question.validation_type === "email" ? "email" : "tel"}
          />
        ) : (
          <Input
            name={name}
            placeholder={question.placeholder ?? ""}
            required={question.is_required}
          />
        )
      ) : null}
      {question.type === "file_upload" ? (
        <Input name={name} required={question.is_required} type="file" />
      ) : null}
      {question.type === "select" ? (
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
            <label className="flex items-center gap-2 text-sm" key={option}>
              <input
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
            <label className="flex items-center gap-2 text-sm" key={option}>
              <input
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
    <Button className="w-full" disabled={pending} type="submit">
      {pending ? "送信中..." : "回答を送信"}
    </Button>
  );
}
