"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { UNIVERSITY_CATEGORY_TAGS, UNIVERSITY_TAG_FOLDERS } from "@/lib/tags/university-folders";
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
  const tagsById = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags]);
  const selectedTag = tagsById.get(value);
  const [query, setQuery] = useState(() =>
    value.startsWith("new:") ? value.slice(4) : selectedTag?.name ?? ""
  );
  const groups = useMemo(() => buildTagGroups(tags, query), [tags, query]);
  const normalizedQuery = query.trim();
  const exactMatch = tags.find((tag) => tag.name === normalizedQuery);
  const canCreate = Boolean(normalizedQuery && !exactMatch);

  useEffect(() => {
    const nextQuery = value.startsWith("new:") ? value.slice(4) : tagsById.get(value)?.name ?? "";
    setQuery(nextQuery);
  }, [tagsById, value]);

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);
    const trimmedQuery = nextQuery.trim();
    const match = tags.find((tag) => tag.name === trimmedQuery);
    onChange(match?.id ?? (trimmedQuery ? `new:${trimmedQuery}` : ""));
  }

  function selectTag(nextValue: string) {
    onChange(nextValue);
    const tag = tagsById.get(nextValue);
    setQuery(tag?.name ?? "");
  }

  return (
    <div className="space-y-2">
      <Input
        onChange={(event) => updateQuery(event.target.value)}
        placeholder="タグ名を入力、または下から選択"
        value={query}
      />
      <select
        className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm shadow-none"
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
          「{normalizedQuery}」を保存時に新しいタグとして作成します。
        </p>
      ) : null}
    </div>
  );
}

function buildTagGroups(tags: TagSummary[], query: string): TagGroup[] {
  const tagsByName = new Map(tags.map((tag) => [tag.name, tag]));
  const groupedIds = new Set<string>();
  const normalizedQuery = query.trim().toLowerCase();

  function include(tag: TagSummary) {
    return !normalizedQuery || tag.name.toLowerCase().includes(normalizedQuery);
  }

  const categoryTags = UNIVERSITY_CATEGORY_TAGS
    .map((name) => tagsByName.get(name))
    .filter((tag): tag is TagSummary => Boolean(tag))
    .filter(include);
  categoryTags.forEach((tag) => groupedIds.add(tag.id));

  const groups: TagGroup[] = [
    { id: "university-categories", name: "大学分類タグ", tags: categoryTags }
  ];

  for (const folder of UNIVERSITY_TAG_FOLDERS) {
    const folderTags = folder.tags
      .map((name) => tagsByName.get(name))
      .filter((tag): tag is TagSummary => Boolean(tag))
      .filter(include);
    folderTags.forEach((tag) => groupedIds.add(tag.id));
    groups.push({ id: folder.name, name: `${folder.name}フォルダ`, tags: folderTags });
  }

  const uncategorized = tags
    .filter((tag) => !groupedIds.has(tag.id))
    .filter(include)
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));
  groups.push({ id: "uncategorized", name: "未分類", tags: uncategorized });

  return groups;
}
