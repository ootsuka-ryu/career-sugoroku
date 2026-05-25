import { Tags } from "lucide-react";
import { TagAdmin } from "@/components/tags/tag-admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="accent">Step 3</Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">タグ管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          タグの作成、色設定、削除を行います。タグは学生一覧、配信対象、アンケート回答後の自動付与に使われます。
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

      <TagAdmin tags={tags} />
    </div>
  );
}
