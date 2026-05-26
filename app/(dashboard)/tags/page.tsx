import { Tags } from "lucide-react";
import { TagAdmin, type TagFolderGroup, type TagItem } from "@/components/tags/tag-admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { UNIVERSITY_CATEGORY_TAGS, UNIVERSITY_TAG_FOLDERS } from "@/lib/tags/university-folders";

export default async function TagsPage() {
  const supabase = createClient() as any;
  const { data, error } = await supabase
    .from("tags")
    .select("id, name, color, student_tags(student_id)")
    .order("name");

  const tags = (data ?? []).map((tag: any) => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
    student_count: (tag.student_tags ?? []).length
  }));
  const folders = buildTagFolders(tags);

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="accent">Step 3</Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">タグ管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          タグをフォルダごとに整理します。大学タグは北にある大学ほど上部、同程度の緯度では東にある大学ほど上部に並べています。
        </p>
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

  const categoryTags = UNIVERSITY_CATEGORY_TAGS
    .map((name) => tagsByName.get(name))
    .filter(Boolean) as TagItem[];
  categoryTags.forEach((tag) => groupedTagIds.add(tag.id));

  const folders: TagFolderGroup[] = [];

  if (categoryTags.length > 0) {
    folders.push({
      id: "university-categories",
      name: "大学分類タグ",
      description: "学生を国立・公立・私立で大きく分類するタグです。",
      tags: categoryTags
    });
  }

  for (const folder of UNIVERSITY_TAG_FOLDERS) {
    const folderTags = folder.tags
      .map((name) => tagsByName.get(name))
      .filter(Boolean) as TagItem[];
    folderTags.forEach((tag) => groupedTagIds.add(tag.id));

    folders.push({
      id: folder.name,
      name: `${folder.name}フォルダ`,
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
      description: "大学分類に属さない通常タグです。",
      tags: uncategorizedTags
    });
  }

  return folders;
}
