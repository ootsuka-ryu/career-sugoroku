import { LayoutGrid } from "lucide-react";
import { RichMenuAdmin } from "@/components/rich-menus/rich-menu-admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function RichMenusPage() {
  const supabase = createClient() as any;
  const [menusResult, tagsResult, surveysResult] = await Promise.all([
    supabase
      .from("rich_menus")
      .select("id, name, layout_jsonb, image_url, is_default, target_tag_ids, created_at, updated_at")
      .order("updated_at", { ascending: false }),
    supabase.from("tags").select("id, name, color").order("name"),
    supabase
      .from("surveys")
      .select("id, title, admin_title")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge variant="accent">Step 5</Badge>
          <h1 className="mt-3 text-2xl font-semibold tracking-normal">
            リッチメニュー
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            LINEのトーク画面下に表示するメニューを作成し、タグ別の出し分けまで管理します。
          </p>
        </div>
        <a
          className="rounded-md border px-4 py-2 text-sm hover:bg-secondary"
          href="https://developers.line.biz/ja/docs/messaging-api/using-rich-menus/"
          rel="noreferrer"
          target="_blank"
        >
          マニュアル
        </a>
      </div>

      {menusResult.error || tagsResult.error || surveysResult.error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <LayoutGrid className="h-5 w-5" />
              リッチメニュー取得エラー
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-destructive">
            <p>{menusResult.error?.message}</p>
            <p>{tagsResult.error?.message}</p>
            <p>{surveysResult.error?.message}</p>
          </CardContent>
        </Card>
      ) : null}

      <RichMenuAdmin
        menus={menusResult.data ?? []}
        surveys={surveysResult.data ?? []}
        tags={tagsResult.data ?? []}
      />
    </div>
  );
}
