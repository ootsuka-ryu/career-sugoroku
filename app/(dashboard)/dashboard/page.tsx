import Link from "next/link";
import {
  CalendarClock,
  MessageSquareWarning,
  Sparkles,
  UsersRound
} from "lucide-react";
import { AiNextActionRunner } from "@/components/dashboard/ai-next-action-runner";
import { EmptyState } from "@/components/dashboard/empty-state";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RecruitingGoalBoard } from "@/components/dashboard/recruiting-goal-board";
import { SaveSnapshotButton } from "@/components/dashboard/save-snapshot-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { localizeSampleText } from "@/lib/display/localize";
import { daysSince, formatDateTime } from "@/lib/format";
import {
  formatRate,
  getPreviousYearMonthlyCounts,
  recruitingMetrics,
  type RecruitingMetricCounts
} from "@/lib/recruiting/funnel";
import { calculateRecruitingMetrics } from "@/lib/recruiting/metrics";
import { createClient } from "@/lib/supabase/server";
import { getMotivationRankLabel } from "@/lib/students/options";

type TopStudent = {
  id: string;
  display_name: string | null;
  real_name: string | null;
  university: string | null;
  motivation_level: number | null;
  motivation_rank: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  ai_next_action: string | null;
  updated_at: string;
};

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: { graduationYear?: string };
}) {
  const supabase = createClient();
  const [
    allStudentsResult,
    studentsCountResult,
    unreadMessagesResult,
    scheduledBroadcastsResult,
    topStudentsResult,
    waitingStudentsResult,
    snapshotsResult
  ] = await Promise.all([
    supabase
      .from("students")
      .select(
        `
        id,
        graduation_year,
        manual_next_action,
        ai_next_action,
        status,
        motivation_rank,
        last_inbound_at,
        last_outbound_at,
        created_at,
        first_contact_date,
        funnel_entry,
        funnel_pool,
        funnel_next,
        funnel_is,
        funnel_pharmacist_interview,
        funnel_selection,
        funnel_offer,
        funnel_offer_accepted,
        funnel_hired,
        student_tags(tags(name))
      `
      )
      .order("updated_at", { ascending: false }),
    supabase.from("students").select("*", { count: "exact", head: true }),
    supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("direction", "in")
      .is("read_at", null),
    supabase
      .from("broadcasts")
      .select("*", { count: "exact", head: true })
      .eq("status", "scheduled"),
    supabase
      .from("students")
      .select(
        "id, display_name, real_name, university, motivation_level, motivation_rank, last_inbound_at, last_outbound_at, ai_next_action, updated_at"
      )
      .not("ai_next_action", "is", null)
      .order("updated_at", { ascending: false })
      .limit(10),
    supabase
      .from("students")
      .select(
        "id, display_name, real_name, university, motivation_level, motivation_rank, last_inbound_at, last_outbound_at, ai_next_action, updated_at"
      )
      .not("last_outbound_at", "is", null)
      .order("last_outbound_at", { ascending: false })
      .limit(30),
    (supabase as any)
      .from("recruiting_monthly_snapshots")
      .select("id, graduation_year, snapshot_month, metrics_jsonb, created_at")
      .order("snapshot_month", { ascending: false })
  ]);

  const allStudents = allStudentsResult.data ?? [];
  const graduationYears = Array.from(
    new Set(
      allStudents
        .map((student: any) => student.graduation_year)
        .filter((year: unknown): year is number => typeof year === "number")
    )
  ).sort((a, b) => a - b);
  const selectedGraduationYear =
    Number(searchParams?.graduationYear) ||
    graduationYears[0] ||
    2027;
  const selectedStudents = allStudents.filter(
    (student: any) => student.graduation_year === selectedGraduationYear
  );
  const recruitingCounts = calculateRecruitingMetrics(selectedStudents);
  const previousCounts = getPreviousYearMonthlyCounts(
    selectedGraduationYear,
    new Date().getMonth() + 1
  );
  const snapshots = snapshotsResult.error
    ? []
    : (snapshotsResult.data ?? []).filter(
        (snapshot: any) => snapshot.graduation_year === selectedGraduationYear
      );

  const topStudents = ((topStudentsResult.data ?? []) as TopStudent[])
    .map((student) => ({
      ...student,
      priority: parsePriority(student.ai_next_action)
    }))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 10);

  const waitingStudents = ((waitingStudentsResult.data ?? []) as TopStudent[])
    .filter((student) => {
      if (!student.last_outbound_at) return false;
      if (!student.last_inbound_at) return true;
      return new Date(student.last_outbound_at) > new Date(student.last_inbound_at);
    })
    .slice(0, 10);

  const metrics = [
    {
      title: "管理学生数",
      value: String(studentsCountResult.count ?? 0),
      description: "登録されている学生",
      icon: UsersRound
    },
    {
      title: "未読チャット",
      value: String(unreadMessagesResult.count ?? 0),
      description: "学生から届いた未読メッセージ",
      icon: MessageSquareWarning
    },
    {
      title: "今日の対応候補",
      value: String(topStudents.length),
      description: "AI提案がある学生 TOP 10",
      icon: Sparkles
    },
    {
      title: "予約配信",
      value: String(scheduledBroadcastsResult.count ?? 0),
      description: "送信待ちのLINE配信",
      icon: CalendarClock
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <Badge variant="accent">Step 8</Badge>
          <h1 className="mt-3 text-2xl font-semibold tracking-normal">
            ダッシュボード
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AIが学生ごとの次アクションを提案し、優先して見るべき学生をまとめます。
          </p>
        </div>
        <AiNextActionRunner />
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </section>

      <RecruitingGoalBoard
        counts={recruitingCounts}
        previousCounts={previousCounts}
        selectedGraduationYear={selectedGraduationYear}
        snapshots={snapshots}
        students={selectedStudents.map((student: any) => ({
          id: student.id,
          first_contact_date: student.first_contact_date ?? null,
          created_at: student.created_at ?? null
        }))}
      />

      <RecruitingFunnelDashboard
        counts={recruitingCounts}
        graduationYears={graduationYears}
        previousCounts={previousCounts}
        selectedGraduationYear={selectedGraduationYear}
        snapshots={snapshots}
      />

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader>
            <CardTitle>今日対応すべき学生 TOP 10</CardTitle>
          </CardHeader>
          <CardContent>
            {topStudents.length === 0 ? (
              <EmptyState
                description="右上のAI更新ボタンを押すと、学生ごとの次アクションが作られます。"
                icon={Sparkles}
                title="AI提案はまだありません"
              />
            ) : (
              <div className="space-y-3">
                {topStudents.map((student) => (
                  <div
                    className="rounded-md border bg-card p-4"
                    key={student.id}
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">
                            {localizeSampleText(student.real_name) ||
                              localizeSampleText(student.display_name) ||
                              "名前未設定"}
                          </p>
                          <Badge variant="secondary">
                            優先度 {student.priority}
                          </Badge>
                          {student.motivation_level ? (
                            <Badge variant="accent">
                              志望度 {student.motivation_level}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {localizeSampleText(student.university) || "大学未登録"} / 最終受信{" "}
                          {formatDateTime(student.last_inbound_at)} / 最終送信{" "}
                          {formatDateTime(student.last_outbound_at)}
                        </p>
                        <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                          {localizeSampleText(student.ai_next_action) || student.ai_next_action}
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/students/${student.id}`}>詳細</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>返信なし候補</CardTitle>
              <Button asChild size="sm" variant="outline">
                <Link href="/follow-ups">一覧</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {waitingStudents.length === 0 ? (
              <EmptyState
                description="こちらから送ったあと、学生からの返信がない候補を表示します。"
                icon={MessageSquareWarning}
                title="返信待ちはありません"
              />
            ) : (
              <div className="space-y-3">
                {waitingStudents.map((student) => (
                  <Link
                    className="block rounded-md border p-3 transition-colors hover:bg-secondary"
                    href={`/students/${student.id}`}
                    key={student.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">
                        {localizeSampleText(student.real_name) ||
                          localizeSampleText(student.display_name) ||
                          "名前未設定"}
                      </p>
                      <Badge variant="outline">
                        {daysSince(student.last_outbound_at) ?? "-"}日
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {localizeSampleText(student.university) || "大学未登録"}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function parsePriority(value: string | null) {
  if (!value) return 0;
  const match = value.match(/優先度\s+(\d+)/);
  return match ? Number(match[1]) : 50;
}

function RecruitingFunnelDashboard({
  counts,
  graduationYears,
  previousCounts,
  selectedGraduationYear,
  snapshots
}: {
  counts: RecruitingMetricCounts;
  graduationYears: number[];
  previousCounts: Partial<RecruitingMetricCounts> | null;
  selectedGraduationYear: number;
  snapshots: any[];
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <CardTitle>採用進捗ダッシュボード</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              スプレッドシートの進捗表と同じ考え方で、卒業年度ごとに集計します。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                defaultValue={selectedGraduationYear}
                name="graduationYear"
              >
                {graduationYears.length === 0 ? (
                  <option value={selectedGraduationYear}>{selectedGraduationYear}年卒</option>
                ) : (
                  graduationYears.map((year) => (
                    <option key={year} value={year}>
                      {year}年卒
                    </option>
                  ))
                )}
              </select>
              <Button className="ml-2" type="submit" variant="outline">
                表示
              </Button>
            </form>
            <SaveSnapshotButton graduationYear={selectedGraduationYear} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] border text-sm">
            <thead>
              <tr className="bg-blue-700 text-white">
                <th className="border px-3 py-2 text-left">区分</th>
                {recruitingMetrics.map((metric) => (
                  <th className="border px-3 py-2 text-center" key={metric.key}>
                    {metric.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white">
                <th className="border px-3 py-2 text-left">{selectedGraduationYear}年卒</th>
                {recruitingMetrics.map((metric) => (
                  <td className="border px-3 py-2 text-center font-semibold" key={metric.key}>
                    {counts[metric.key]}
                  </td>
                ))}
              </tr>
              <tr className="bg-blue-50">
                <th className="border px-3 py-2 text-left">CV</th>
                {recruitingMetrics.map((metric, index) => {
                  const previousMetric = recruitingMetrics[index - 1];
                  return (
                    <td className="border px-3 py-2 text-center" key={metric.key}>
                      {index === 0 ? "-" : formatRate(counts[metric.key], counts[previousMetric.key])}
                    </td>
                  );
                })}
              </tr>
              <tr className="bg-amber-50">
                <th className="border px-3 py-2 text-left">前年同月</th>
                {recruitingMetrics.map((metric) => (
                  <td className="border px-3 py-2 text-center" key={metric.key}>
                    {previousCounts?.[metric.key] ?? "-"}
                  </td>
                ))}
              </tr>
              <tr className="bg-amber-100">
                <th className="border px-3 py-2 text-left">前年比</th>
                {recruitingMetrics.map((metric) => (
                  <td className="border px-3 py-2 text-center" key={metric.key}>
                    {previousCounts?.[metric.key]
                      ? `${((counts[metric.key] / Number(previousCounts[metric.key])) * 100).toFixed(1)}%`
                      : "-"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="mb-2 font-semibold">月次保存データ</h3>
          <div className="max-h-80 overflow-auto rounded-md border">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="sticky top-0 bg-secondary">
                <tr>
                  <th className="border-b px-3 py-2 text-left">月</th>
                  {recruitingMetrics.map((metric) => (
                    <th className="border-b px-3 py-2 text-center" key={metric.key}>
                      {metric.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snapshots.length > 0 ? (
                  snapshots.map((snapshot) => (
                    <tr key={snapshot.id}>
                      <td className="border-b px-3 py-2">
                        {formatSnapshotMonth(snapshot.snapshot_month)}
                      </td>
                      {recruitingMetrics.map((metric) => (
                        <td className="border-b px-3 py-2 text-center" key={metric.key}>
                          {snapshot.metrics_jsonb?.[metric.key] ?? 0}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-3 py-6 text-center text-muted-foreground" colSpan={10}>
                      保存済みの月次データはまだありません。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatSnapshotMonth(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}
