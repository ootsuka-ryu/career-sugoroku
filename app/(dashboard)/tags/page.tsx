import { Tags } from "lucide-react";
import { TagAdmin, type TagFolderGroup, type TagItem } from "@/components/tags/tag-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import {
  UNIVERSITY_CLASSIFICATION_TAG_NAMES,
  UNIVERSITY_TAG_FOLDERS
} from "@/lib/tags/university-folders";

const TEXT = {
  title: "\u30bf\u30b0",
  description: "\u53cb\u3060\u3061\u3092\u5206\u985e\u3059\u308b\u30bf\u30b0\u3092\u7ba1\u7406\u3067\u304d\u307e\u3059\u3002",
  tagLoadError: "\u30bf\u30b0\u53d6\u5f97\u30a8\u30e9\u30fc",
  folderSetupMissing:
    "\u30bf\u30b0\u30d5\u30a9\u30eb\u30c0\u4fdd\u5b58\u7528\u306eSupabase\u30c6\u30fc\u30d6\u30eb\u304c\u307e\u3060\u3042\u308a\u307e\u305b\u3093\u3002\u30d5\u30a9\u30eb\u30c0\u4f5c\u6210\u3092\u4f7f\u3046\u5834\u5408\u306f",
  folderAssignmentMissing:
    "\u30bf\u30b0\u3092\u30d5\u30a9\u30eb\u30c0\u3078\u79fb\u52d5\u3059\u308b\u306b\u306f\u3001Supabase\u3067",
  runSql: "\u3092\u5b9f\u884c\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  manualFolderDescription: "\u624b\u52d5\u3067\u4f5c\u6210\u3057\u305f\u30bf\u30b0\u30d5\u30a9\u30eb\u30c0\u3067\u3059\u3002",
  universityFolderDescription:
    "\u5317\u304b\u3089\u5357\u3078\u3001\u540c\u7a0b\u5ea6\u306e\u7def\u5ea6\u3067\u306f\u6771\u304b\u3089\u897f\u3078\u4e26\u3079\u3066\u3044\u307e\u3059\u3002",
  uncategorized: "\u672a\u5206\u985e",
  uncategorizedDescription:
    "\u5927\u5b66\u30d5\u30a9\u30eb\u30c0\u306b\u5c5e\u3055\u306a\u3044\u901a\u5e38\u30bf\u30b0\u3067\u3059\u3002"
};

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
        <h1 className="text-2xl font-semibold tracking-normal">{TEXT.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{TEXT.description}</p>
      </div>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Tags className="h-5 w-5" />
              {TEXT.tagLoadError}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-destructive">{error.message}</CardContent>
        </Card>
      ) : null}

      {foldersResult.error ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-6 text-sm text-amber-900">
            {TEXT.folderSetupMissing}
            <code className="mx-1 rounded bg-white px-1 py-0.5">20_pending_feature_setup.sql</code>
            {TEXT.runSql}
          </CardContent>
        </Card>
      ) : null}

      {folderAssignmentMissing ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-6 text-sm text-amber-900">
            {TEXT.folderAssignmentMissing}
            <code className="mx-1 rounded bg-white px-1 py-0.5">20_pending_feature_setup.sql</code>
            {TEXT.runSql}
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
      description: folder.description ?? TEXT.manualFolderDescription,
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
      description: TEXT.universityFolderDescription,
      tags: folderTags
    });
  }

  const uncategorizedTags = tags
    .filter((tag) => !groupedTagIds.has(tag.id))
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));

  if (uncategorizedTags.length > 0) {
    folders.push({
      id: "uncategorized",
      name: TEXT.uncategorized,
      description: TEXT.uncategorizedDescription,
      tags: uncategorizedTags
    });
  }

  return folders;
}
