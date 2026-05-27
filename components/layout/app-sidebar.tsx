import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { navigationItems } from "@/lib/constants/navigation";

const lineMonthlyLimit = 5000;

export function AppSidebar({ lineUsageCount }: { lineUsageCount: number }) {
  const lineUsageRate = Math.min(100, Math.round((lineUsageCount / lineMonthlyLimit) * 100));

  return (
    <aside className="hidden w-64 shrink-0 border-r border-neutral-900 bg-neutral-900 text-white lg:block">
      <div className="flex h-14 items-center border-b border-neutral-700 px-5">
        <div>
          <p className="text-sm font-semibold text-emerald-300">薬学生 LINE 採用 CRM</p>
          <p className="text-xs text-neutral-300">採用チーム管理</p>
        </div>
      </div>
      <nav className="space-y-1 p-3">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-neutral-200 transition-colors hover:bg-emerald-600 hover:text-white"
              href={item.href}
              key={item.href}
            >
              <Icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>
      <div className="m-4 rounded-lg border border-neutral-700 bg-neutral-800 p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-white">LINE通数</p>
          <Badge
            className={
              lineUsageRate >= 80
                ? "border-amber-300 bg-amber-300 text-neutral-950"
                : "bg-emerald-500 text-white"
            }
            variant={lineUsageRate >= 80 ? "outline" : "accent"}
          >
            {lineUsageRate}%
          </Badge>
        </div>
        <p className="text-2xl font-semibold text-white">
          {lineUsageCount.toLocaleString()} / {lineMonthlyLimit.toLocaleString()}
        </p>
        <p className="mt-1 text-xs text-neutral-300">
          今月の配信と個別チャット送信を集計しています。
        </p>
      </div>
    </aside>
  );
}
