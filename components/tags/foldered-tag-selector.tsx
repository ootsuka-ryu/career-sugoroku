"use client";

import { useMemo } from "react";
import { localizeSampleText } from "@/lib/display/localize";
import { groupTagsByFolder, type GroupableTag } from "@/lib/tags/group-tags";

type FolderedTagSelectorProps<T extends GroupableTag> = {
  tags: T[];
  selectedTagIds: string[];
  onToggle: (tagId: string) => void;
  emptyMessage?: string;
  maxHeightClassName?: string;
};

export function FolderedTagSelector<T extends GroupableTag>({
  tags,
  selectedTagIds,
  onToggle,
  emptyMessage = "タグがありません。",
  maxHeightClassName = "max-h-48"
}: FolderedTagSelectorProps<T>) {
  const folders = useMemo(() => groupTagsByFolder(tags), [tags]);

  if (tags.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2 rounded-md border bg-background p-2">
      {folders.map((folder) => (
        <details className="group rounded-md border bg-card" key={folder.id}>
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
          <div className={`${maxHeightClassName} grid gap-2 overflow-auto border-t p-2 sm:grid-cols-2`}>
            {folder.tags.map((tag) => {
              const active = selectedTagIds.includes(tag.id);
              return (
                <button
                  className={
                    active
                      ? "flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-sm font-medium text-white"
                      : "flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-sm hover:bg-secondary"
                  }
                  key={tag.id}
                  onClick={() => onToggle(tag.id)}
                  style={
                    active
                      ? {
                          backgroundColor: tag.color,
                          borderColor: tag.color
                        }
                      : undefined
                  }
                  type="button"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: active ? "white" : tag.color }}
                  />
                  <span className="min-w-0 truncate">{localizeSampleText(tag.name)}</span>
                </button>
              );
            })}
          </div>
        </details>
      ))}
    </div>
  );
}
