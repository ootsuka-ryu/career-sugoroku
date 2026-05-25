import { FolderPlus, Trash2 } from "lucide-react";
import {
  createTemplateFolder,
  deleteMessageTemplate
} from "@/app/(dashboard)/message-templates/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CopyTemplateButton } from "@/components/message-templates/copy-template-button";
import { MessageTemplateForm } from "@/components/message-templates/message-template-form";
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
            <form action={createTemplateFolder} className="space-y-2">
              <Input name="name" placeholder="新しいフォルダ" />
              <Button className="w-full" type="submit" variant="outline">
                <FolderPlus className="mr-2 h-4 w-4" />
                フォルダ作成
              </Button>
            </form>
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
            <CardContent className="space-y-3">
              {visibleTemplates.length > 0 ? visibleTemplates.map((template: any) => (
                <div className="rounded-md border p-4" key={template.id}>
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{template.title}</p>
                        <Badge variant="secondary">{template.kind}</Badge>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{template.body}</p>
                    </div>
                    <div className="flex gap-2">
                      <CopyTemplateButton body={template.body} />
                      <form action={deleteMessageTemplate}>
                        <input name="id" type="hidden" value={template.id} />
                        <Button size="sm" type="submit" variant="outline">
                          <Trash2 className="mr-2 h-4 w-4" />
                          削除
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">テンプレートはまだありません。</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function FolderLink({ href, label, count }: { href: string; label: string; count: number }) {
  return (
    <a className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-secondary" href={href}>
      <span>{label}</span>
      <span className="text-muted-foreground">{count}</span>
    </a>
  );
}
