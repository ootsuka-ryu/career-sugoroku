import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageTemplateForm } from "@/components/message-templates/message-template-form";
import { TemplatePreview } from "@/components/message-templates/template-preview";
import { createClient } from "@/lib/supabase/server";

export default async function MessageTemplateEditPage({
  params
}: {
  params: { id: string };
}) {
  const supabase = createClient() as any;
  const [templateResult, foldersResult] = await Promise.all([
    supabase
      .from("message_templates")
      .select("id, title, body, kind, folder_id, updated_at")
      .eq("id", params.id)
      .maybeSingle(),
    supabase.from("message_template_folders").select("id, name").order("created_at")
  ]);

  if (!templateResult.data) notFound();

  const template = templateResult.data;
  const folders = foldersResult.data ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">
          <Link className="text-blue-700 underline-offset-2 hover:underline" href="/message-templates">
            テンプレート一覧
          </Link>
          <span className="mx-2">›</span>
          <span>テンプレート編集</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-normal">テンプレート編集</h1>
          <Badge variant="secondary">{template.kind}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>保存内容のプレビュー</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplatePreview body={template.body} kind={template.kind} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <MessageTemplateForm
            folders={folders}
            initialTemplate={{
              id: template.id,
              title: template.title,
              body: template.body,
              kind: template.kind,
              folder_id: template.folder_id
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
