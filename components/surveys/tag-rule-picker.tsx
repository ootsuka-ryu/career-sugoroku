"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createSurveyTagByName } from "@/app/(dashboard)/surveys/actions";
import { Input } from "@/components/ui/input";
import { groupTagsByFolder } from "@/lib/tags/group-tags";
import type { TagSummary } from "@/lib/students/types";

type TagRulePickerProps = {
  tags: TagSummary[];
  value: string;
  onChange: (value: string) => void;
};

type TagGroup = {
  id: string;
  name: string;
  tags: TagSummary[];
};

export function TagRulePicker({ tags, value, onChange }: TagRulePickerProps) {
  const [localTags, setLocalTags] = useState(tags);
  const [errorMessage, setErrorMessage] = useState("");
  const [isCreating, startTransition] = useTransition();
  const creatingNames = useRef(new Set<string>());
  const tagsById = useMemo(() => new Map(localTags.map((tag) => [tag.id, tag])), [localTags]);
  const selectedTag = tagsById.get(value);
  const [query, setQuery] = useState(() =>
    value.startsWith("new:") ? value.slice(4) : selectedTag?.name ?? ""
  );
  const groups = useMemo(() => buildTagGroups(localTags, query), [localTags, query]);
  const normalizedQuery = query.trim();
  const exactMatch = localTags.find((tag) => tag.name === normalizedQuery);
  const canCreate = Boolean(normalizedQuery && !exactMatch);

  useEffect(() => {
    setLocalTags((current) => {
      const merged = new Map(current.map((tag) => [tag.id, tag]));
      tags.forEach((tag) => merged.set(tag.id, tag));
      return Array.from(merged.values());
    });
  }, [tags]);

  useEffect(() => {
    const nextQuery = value.startsWith("new:") ? value.slice(4) : tagsById.get(value)?.name ?? "";
    setQuery(nextQuery);
  }, [tagsById, value]);

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);
    setErrorMessage("");
    const trimmedQuery = nextQuery.trim();
    const match = localTags.find((tag) => tag.name === trimmedQuery);
    onChange(match?.id ?? (trimmedQuery ? `new:${trimmedQuery}` : ""));
  }

  function selectTag(nextValue: string) {
    onChange(nextValue);
    setErrorMessage("");
    const tag = tagsById.get(nextValue);
    setQuery(tag?.name ?? "");
  }

  function createCurrentTag() {
    const name = query.trim();
    if (!name) {
      onChange("");
      return;
    }

    const match = localTags.find((tag) => tag.name === name);
    if (match) {
      onChange(match.id);
      return;
    }

    if (creatingNames.current.has(name)) return;
    creatingNames.current.add(name);
    setErrorMessage("");

    startTransition(async () => {
      const result = await createSurveyTagByName(name);
      creatingNames.current.delete(name);

      if (!result.ok || !result.tag) {
        setErrorMessage(result.message ?? "タグを作成できませんでした。");
        return;
      }

      const createdTag = result.tag as TagSummary;
      setLocalTags((current) => {
        const merged = new Map(current.map((tag) => [tag.id, tag]));
        merged.set(createdTag.id, createdTag);
        return Array.from(merged.values());
      });
      setQuery(createdTag.name);
      onChange(createdTag.id);
    });
  }

  return (
    <div className="space-y-2">
      <Input
        onChange={(event) => updateQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          createCurrentTag();
        }}
        placeholder="タグ名を入力、または下から選択"
        value={query}
      />
      <select
        className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm shadow-none"
        disabled={isCreating}
        onChange={(event) => selectTag(event.target.value)}
        value={tagsById.has(value) ? value : ""}
      >
        <option value="">タグを選択</option>
        {groups.map((group) =>
          group.tags.length > 0 ? (
            <optgroup key={group.id} label={`${group.name} (${group.tags.length})`}>
              {group.tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </optgroup>
          ) : null
        )}
      </select>
      {canCreate ? (
        <p className="text-xs text-muted-foreground">
          「{normalizedQuery}」を新しいタグとして作成します。
        </p>
      ) : null}
      {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
    </div>
  );
}

function buildTagGroups(tags: TagSummary[], query: string): TagGroup[] {
  return groupTagsByFolder(tags, query);
}
