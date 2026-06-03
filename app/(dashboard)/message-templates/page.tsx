import { Trash2 } from "lucide-react";
import {
  deleteMessageTemplate
} from "@/app/(dashboard)/message-templates/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyTemplateButton } from "@/components/message-templates/copy-template-button";
import { MessageTemplateForm } from "@/components/message-templates/message-template-form";
import { TemplateFolderForm } from "@/components/message-templates/template-folder-form";
import { TemplatePreview } from "@/components/message-templates/template-preview";
import { createClient } from "@/lib/supabase/server";

export default async function MessageTemplatesPage({
  searchParams
}: {
  searchParams?: { folder?: string };
}) {
  const supabase = createClient() as any;
  const [foldersResult, templatesResult] = await Promise.all([
    supabase.from("message_template_folders").select("id, name").order("created_at"),
    supabase
      .from("message_templates")
      .select("id, title, body, kind, folder_id, updated_at")
      .order("updated_at", { ascending: false })
  ]);

  const folders = foldersResult.data ?? [];
  const templates = templatesResult.data ?? [];
  const selectedFolder = searchParams?.folder ?? "all";
  const visibleTemplates =
    selectedFolder === "all"
      ? templates
      : templates.filter((template: any) =>
          selectedFolder === "none" ? !template.folder_id : template.folder_id === selectedFolder
        );

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="accent">テンプレート</Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">テンプレート文管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          チャット返信、リマインド、説明会案内、面談後お礼をフォルダ別に保存できます。
        </p>
      </div>

      <section className="grid gap-4 xl:grid-cols-[260px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>フォルダ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <TemplateFolderForm />
            <FolderLink count={templates.length} href="/message-templates" label="すべて" />
            <FolderLink
              count={templates.filter((template: any) => !template.folder_id).length}
              href="/message-templates?folder=none"
              label="未分類"
            />
            {folders.map((folder: any) => (
              <FolderLink
                count={templates.filter((template: any) => template.folder_id === folder.id).length}
                href={`/message-templates?folder=${folder.id}`}
                key={folder.id}
                label={folder.name}
              />
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>新しいテンプレート</CardTitle>
            </CardHeader>
            <CardContent>
              <MessageTemplateForm folders={folders} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>保存済みテンプレート</CardTitle>
            </CardHeader>
            <CardContent>
              {visibleTemplates.length > 0 ? (
                <div className="overflow-hidden rounded-md border">
                  <div className="grid grid-cols-[2rem_1fr_9rem_11rem] items-center bg-muted px-3 py-2 text-sm font-medium text-muted-foreground">
                    <span></span>
                    <span>テンプレート名</span>
                    <span>登録日</span>
                    <span>操作</span>
                  </div>
                  {visibleTemplates.map((template: any) => (
                    <div
                      className="grid grid-cols-[2rem_1fr_9rem_11rem] items-center border-t px-3 py-3 text-sm"
                      key={template.id}
                    >
                      <input type="checkbox" />
                      <div className="min-w-0">
                        <a
                          className="font-semibold text-blue-700 underline-offset-2 hover:underline"
                          href={`/message-templates/${template.id}/edit`}
                        >
                          {template.title}
                        </a>
                        <div className="mt-1">
                          <TemplatePreview body={template.body} compact kind={template.kind} />
                        </div>
                      </div>
                      <span className="text-muted-foreground">
                        {formatDate(template.updated_at)}
                      </span>
                      <div className="flex gap-2">
                        <a
                          className="rounded-md border px-3 py-2 text-xs hover:bg-muted"
                          href={`/message-templates/${template.id}/edit`}
                        >
                          プレビュー
                        </a>
                        <CopyTemplateButton body={template.body} />
                        <form action={deleteMessageTemplate}>
                          <input name="id" type="hidden" value={template.id} />
                          <Button size="sm" type="submit" variant="outline">
                            <Trash2 className="mr-1 h-4 w-4" />
                            削除
                          </Button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">テンプレートはまだありません。</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function FolderLink({ href, label, count }: { href: string; label: string; count: number }) {
  return (
    <a className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-secondary" href={href}>
      <span>{label}</span>
      <span className="text-muted-foreground">{count}</span>
    </a>
  );
}
