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
    <header className="flex h-14 items-center gap-3 border-b border-emerald-800 bg-emerald-600 px-4 text-white md:px-6">
      <Button
        className="text-white hover:bg-emerald-700 hover:text-white lg:hidden"
        size="icon"
        variant="ghost"
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">メニュー</span>
      </Button>
      <div className="relative max-w-xl flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <Input
          className="border-white/30 bg-white pl-9 text-neutral-950 placeholder:text-neutral-500 focus-visible:ring-white"
          placeholder="学生名・大学・タグで検索"
        />
      </div>
      <Button
        asChild
        className="relative border-white/40 bg-white text-emerald-800 hover:bg-neutral-100"
        size="icon"
        variant="outline"
      >
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
        <p className="truncate font-semibold text-white">{email ?? "未ログイン"}</p>
        <p className="text-xs text-emerald-50">staff</p>
      </div>
    </header>
  );
}
