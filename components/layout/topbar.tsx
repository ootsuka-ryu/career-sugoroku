import Link from "next/link";
import { Bell, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TopbarProps = {
  email?: string | null;
  unreadNotifications?: number;
};

export function Topbar({ email, unreadNotifications = 0 }: TopbarProps) {
  return (
    <header className="flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
      <Button className="lg:hidden" size="icon" variant="ghost">
        <Menu className="h-5 w-5" />
        <span className="sr-only">メニュー</span>
      </Button>
      <div className="relative max-w-xl flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="学生名・大学・タグで検索" />
      </div>
      <Button asChild className="relative" size="icon" variant="outline">
        <Link href="/notifications">
          <Bell className="h-4 w-4" />
          <span className="sr-only">通知</span>
          {unreadNotifications > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          ) : null}
        </Link>
      </Button>
      <div className="hidden min-w-0 text-right text-sm md:block">
        <p className="truncate font-medium">{email ?? "未ログイン"}</p>
        <p className="text-xs text-muted-foreground">staff</p>
      </div>
    </header>
  );
}
