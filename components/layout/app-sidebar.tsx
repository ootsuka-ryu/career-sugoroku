import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { navigationItems } from "@/lib/constants/navigation";

const lineMonthlyLimit = 5000;

export function AppSidebar({ lineUsageCount }: { lineUsageCount: number }) {
  const lineUsageRate = Math.min(100, Math.round((lineUsageCount / lineMonthlyLimit) * 100));

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card lg:block">
      <div className="flex h-16 items-center border-b px-5">
        <div>
          <p className="text-sm font-medium text-primary">LINE 採用 CRM</p>
          <p className="text-xs text-muted-foreground">薬学生 800 名採用</p>
        </div>
      </div>
      <nav className="space-y-1 p-3">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              href={item.href}
              key={item.href}
            >
              <Icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>
      <div className="m-4 rounded-lg border bg-secondary/40 p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">LINE 通数</p>
          <Badge variant={lineUsageRate >= 80 ? "outline" : "accent"}>
            {lineUsageRate}%
          </Badge>
        </div>
        <p className="text-2xl font-semibold">
          {lineUsageCount.toLocaleString()} / {lineMonthlyLimit.toLocaleString()}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          今月の配信と個別チャット送信を集計しています。
        </p>
      </div>
    </aside>
  );
}
