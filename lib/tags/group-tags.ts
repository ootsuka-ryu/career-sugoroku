import { localizeSampleText } from "@/lib/display/localize";
import {
  UNIVERSITY_CLASSIFICATION_TAG_NAMES,
  UNIVERSITY_TAG_FOLDERS
} from "@/lib/tags/university-folders";

export type GroupableTag = {
  id: string;
  name: string;
  color: string;
};

export type TagFolder<T extends GroupableTag = GroupableTag> = {
  id: string;
  name: string;
  color: string;
  tags: T[];
};

export function groupTagsByFolder<T extends GroupableTag>(
  tags: T[],
  query = ""
): TagFolder<T>[] {
  const tagsByName = new Map(tags.map((tag) => [tag.name, tag]));
  const groupedIds = new Set<string>();
  const normalizedQuery = query.trim().toLowerCase();
  const classificationNames = new Set(UNIVERSITY_CLASSIFICATION_TAG_NAMES);

  function include(tag: T) {
    const haystack = `${tag.name} ${localizeSampleText(tag.name) ?? ""}`.toLowerCase();
    return !normalizedQuery || haystack.includes(normalizedQuery);
  }

  const folders: TagFolder<T>[] = [];
  tags
    .filter((tag) => classificationNames.has(tag.name))
    .forEach((tag) => groupedIds.add(tag.id));

  for (const folder of UNIVERSITY_TAG_FOLDERS) {
    const folderTags = folder.tags
      .map((name) => tagsByName.get(name))
      .filter((tag): tag is T => Boolean(tag))
      .filter(include);
    folderTags.forEach((tag) => groupedIds.add(tag.id));

    if (folderTags.length > 0 || normalizedQuery) {
      folders.push({
        id: folder.name,
        name: `${folder.name}フォルダ`,
        color: folder.color,
        tags: folderTags
      });
    }
  }

  const uncategorized = tags
    .filter((tag) => !groupedIds.has(tag.id))
    .filter(include)
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));

  if (uncategorized.length > 0 || normalizedQuery) {
    folders.push({
      id: "uncategorized",
      name: "未分類",
      color: "#525252",
      tags: uncategorized
    });
  }

  return folders.filter((folder) => folder.tags.length > 0 || normalizedQuery);
}
