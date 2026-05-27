import { Tags } from "lucide-react";
import { TagAdmin, type TagFolderGroup, type TagItem } from "@/components/tags/tag-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import {
  UNIVERSITY_CLASSIFICATION_TAG_NAMES,
  UNIVERSITY_TAG_FOLDERS
} from "@/lib/tags/university-folders";

export default async function TagsPage() {
  const supabase = createClient() as any;
  const { data, error } = await supabase
    .from("tags")
    .select("id, name, color, created_at, student_tags(student_id)")
    .order("name");

  const tags = (data ?? []).map((tag: any) => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
    created_at: tag.created_at,
    student_count: (tag.student_tags ?? []).length
  }));
  const folders = buildTagFolders(tags);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">タグ</h1>
        <p className="mt-1 text-sm text-muted-foreground">友だちを分類するタグを管理できます。</p>
      </div>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Tags className="h-5 w-5" />
              タグ取得エラー
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-destructive">
            {error.message}
          </CardContent>
        </Card>
      ) : null}

      <TagAdmin folders={folders} tags={tags} />
    </div>
  );
}

function buildTagFolders(tags: TagItem[]): TagFolderGroup[] {
  const tagsByName = new Map(tags.map((tag) => [tag.name, tag]));
  const groupedTagIds = new Set<string>();
  const classificationNames = new Set(UNIVERSITY_CLASSIFICATION_TAG_NAMES);

  const folders: TagFolderGroup[] = [];
  tags
    .filter((tag) => classificationNames.has(tag.name))
    .forEach((tag) => groupedTagIds.add(tag.id));

  for (const folder of UNIVERSITY_TAG_FOLDERS) {
    const folderTags = folder.tags
      .map((name) => tagsByName.get(name))
      .filter(Boolean) as TagItem[];
    folderTags.forEach((tag) => groupedTagIds.add(tag.id));

    folders.push({
      id: folder.name,
      name: folder.name,
      description: "北から南へ、同程度の緯度では東から西へ並べています。",
      tags: folderTags
    });
  }

  const uncategorizedTags = tags
    .filter((tag) => !groupedTagIds.has(tag.id))
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));

  if (uncategorizedTags.length > 0) {
    folders.push({
      id: "uncategorized",
      name: "未分類",
      description: "大学フォルダに属さない通常タグです。",
      tags: uncategorizedTags
    });
  }

  return folders;
}
