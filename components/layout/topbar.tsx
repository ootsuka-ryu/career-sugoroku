"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Bell, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TopbarProps = {
  email?: string | null;
  unreadNotifications?: number;
};

export function Topbar({ email, unreadNotifications = 0 }: TopbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const graduationYearParam = searchParams.get("graduationYear");
  const selectedGraduationYear =
    graduationYearParam && /^\d{4}$/.test(graduationYearParam) ? graduationYearParam : "2028";
  const [studentSearch, setStudentSearch] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    setStudentSearch(searchParams.get("q") ?? "");
  }, [searchParams]);

  function updateGraduationYear(value: string) {
    const params = new URLSearchParams();
    const trimmed = studentSearch.trim() || searchParams.get("q")?.trim() || "";
    if (trimmed) params.set("q", trimmed);
    params.set("graduationYear", value || "2028");
    params.delete("page");
    const query = params.toString();
    router.push(query ? `/students?${query}` : "/students");
  }

  function submitStudentSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    const trimmed = studentSearch.trim();
    if (trimmed) params.set("q", trimmed);
    params.set("graduationYear", selectedGraduationYear || "2028");
    params.delete("page");
    const query = params.toString();
    router.push(query ? `/students?${query}` : "/students");
  }

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
      <div className="flex max-w-2xl flex-1 items-center gap-2">
        <select
          aria-label="卒業年度で絞り込み"
          className="h-10 rounded-md border border-white/30 bg-white px-3 text-sm text-neutral-950 focus:outline-none focus:ring-2 focus:ring-white"
          onChange={(event) => updateGraduationYear(event.target.value)}
          value={selectedGraduationYear}
        >
          {Array.from({ length: 10 }, (_, index) => 2025 + index).map((year) => (
            <option key={year} value={year}>
              {year}卒
            </option>
          ))}
        </select>
        <form className="flex flex-1 gap-2" onSubmit={submitStudentSearch}>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <Input
              className="border-white/30 bg-white pl-9 text-neutral-950 placeholder:text-neutral-500 focus-visible:ring-white"
              onChange={(event) => setStudentSearch(event.target.value)}
              placeholder="学生名・大学・タグで検索"
              value={studentSearch}
            />
          </div>
          <Button
            className="border-white/40 bg-white px-4 text-emerald-800 hover:bg-neutral-100"
            type="submit"
            variant="outline"
          >
            検索
          </Button>
        </form>
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
