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
  let folderAssignmentMissing = false;
  let tagResult = await supabase
    .from("tags")
    .select("id, name, color, created_at, folder_id, student_tags(student_id)")
    .order("name");
  const foldersResult = await supabase
    .from("tag_folders")
    .select("id, name, description, created_at")
    .order("created_at");

  if (tagResult.error?.message?.includes("folder_id")) {
    folderAssignmentMissing = true;
    tagResult = await supabase
      .from("tags")
      .select("id, name, color, created_at, student_tags(student_id)")
      .order("name");
  }

  const error = tagResult.error;
  const tags = (tagResult.data ?? []).map((tag: any) => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
    created_at: tag.created_at,
    folder_id: tag.folder_id ?? null,
    student_count: (tag.student_tags ?? []).length
  }));
  const customFolders = foldersResult.error ? [] : foldersResult.data ?? [];
  const folders = buildTagFolders(tags, customFolders);

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

      {foldersResult.error ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-6 text-sm text-amber-900">
            タグフォルダ保存用のSupabaseテーブルがまだありません。フォルダ作成を使う場合は
            <code className="mx-1 rounded bg-white px-1 py-0.5">16_tag_folders.sql</code>
            を実行してください。
          </CardContent>
        </Card>
      ) : null}

      {folderAssignmentMissing ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-6 text-sm text-amber-900">
            タグをフォルダへ移動するには、Supabaseで
            <code className="mx-1 rounded bg-white px-1 py-0.5">21_tag_folder_assignments.sql</code>
            を実行してください。
          </CardContent>
        </Card>
      ) : null}

      <TagAdmin folders={folders} tags={tags} />
    </div>
  );
}

function buildTagFolders(tags: TagItem[], customFolders: any[]): TagFolderGroup[] {
  const tagsByName = new Map(tags.map((tag) => [tag.name, tag]));
  const groupedTagIds = new Set<string>();
  const classificationNames = new Set(UNIVERSITY_CLASSIFICATION_TAG_NAMES);

  const folders: TagFolderGroup[] = [];
  tags
    .filter((tag) => classificationNames.has(tag.name))
    .forEach((tag) => groupedTagIds.add(tag.id));

  for (const folder of customFolders) {
    if (UNIVERSITY_TAG_FOLDERS.some((universityFolder) => universityFolder.name === folder.name)) {
      continue;
    }

    const folderTags = tags.filter((tag) => tag.folder_id === folder.id);
    folderTags.forEach((tag) => groupedTagIds.add(tag.id));

    folders.push({
      id: folder.id,
      name: folder.name,
      description: folder.description ?? "手動で作成したタグフォルダです。",
      tags: folderTags
    });
  }

  for (const folder of UNIVERSITY_TAG_FOLDERS) {
    const folderTags = folder.tags
      .map((name) => tagsByName.get(name))
      .filter((tag): tag is TagItem => tag !== undefined && !groupedTagIds.has(tag.id));
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
