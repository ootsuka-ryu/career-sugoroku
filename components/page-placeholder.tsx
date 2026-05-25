import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PagePlaceholderProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  step: string;
};

export function PagePlaceholder({
  title,
  description,
  icon: Icon,
  step
}: PagePlaceholderProps) {
  return (
    <div className="space-y-6">
      <div>
        <Badge variant="secondary">{step}</Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            実装待ち
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            ステップ 1 では認証・レイアウト・Supabase 接続を先に固めています。この画面は後続ステップでテーブル、フォーム、API と接続します。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
