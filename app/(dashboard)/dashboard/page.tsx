import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LineChart, MessageCircle, Users } from "lucide-react";

import { RecruitingGoalBoard } from "@/components/dashboard/recruiting-goal-board";
import { SaveSnapshotButton } from "@/components/dashboard/save-snapshot-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getPreviousYearMonthlyCounts,
  recruitingMetrics,
  type RecruitingMetricCounts
} from "@/lib/recruiting/funnel";
import { calculateRecruitingMetrics } from "@/lib/recruiting/metrics";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

const DASHBOARD_STUDENT_SELECT = `
  id,
  graduation_year,
  motivation_rank,
  motivation_level,
  status,
  manual_next_action,
  ai_next_action,
  first_contact_method,
  first_contact_date,
  first_event_name,
  last_inbound_at,
  last_outbound_at,
  line_user_id,
  created_at,
  updated_at,
  notes,
  funnel_pool,
  funnel_next,
  funnel_is,
  funnel_pharmacist_interview,
  funnel_selection,
  funnel_offer,
  funnel_offer_accepted,
  funnel_hired,
  event_hb_fes_date,
  event_himeji_tour_date,
  event_real_talk_date,
  event_company_session_date,
  event_employee_exchange_date,
  student_tags(tags(name))
`;

const FALLBACK_STUDENT_SELECT = `
  id,
  graduation_year,
  motivation_rank,
  motivation_level,
  status,
  manual_next_action,
  ai_next_action,
  first_contact_method,
  first_contact_date,
  first_event_name,
  last_inbound_at,
  last_outbound_at,
  line_user_id,
  created_at,
  updated_at,
  notes,
  student_tags(tags(name))
`;

export default async function DashboardPage({ searchParams }: PageProps) {
  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const graduationYearParam = Array.isArray(resolvedSearchParams.graduationYear)
    ? resolvedSearchParams.graduationYear[0]
    : resolvedSearchParams.graduationYear;

  const yearRows = await fetchGraduationYears(supabase);
  const yearOptions = Array.from(new Set([2028, 2027, ...yearRows])).sort((a, b) => b - a);
  const selectedGraduationYear = Number.isFinite(Number(graduationYearParam))
    ? Number(graduationYearParam)
    : (yearOptions[0] ?? 2028);

  const [selectedStudents, selectedStudentCount, snapshots] = await Promise.all([
    fetchStudentsForMetrics(supabase, selectedGraduationYear),
    countStudentsByGraduationYear(supabase, selectedGraduationYear),
    fetchSnapshots(supabase, selectedGraduationYear)
  ]);

  const studentCountForCard = selectedStudentCount ?? selectedStudents.length;
  const counts = calculateRecruitingMetrics(selectedStudents);
  counts.entry = studentCountForCard;

  const previousCounts = getPreviousYearMonthlyCounts(
    selectedGraduationYear,
    new Date().getMonth() + 1
  );
  const highCertaintyCount = selectedStudents.filter(isHighCertainty).length;
  const waitingCount = selectedStudents.filter(isWaitingReply).length;

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="rounded bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground">
            ダッシュボード
          </span>
          <h1 className="mt-3 text-3xl font-bold">採用進捗ダッシュボード</h1>
          <p className="text-sm text-muted-foreground">
            卒業年度ごとに、進捗サマリー・月次目標・経営会議用データを確認できます。
          </p>
        </div>
        <SaveSnapshotButton graduationYear={selectedGraduationYear} />
      </div>

      <div className="flex flex-wrap gap-2">
        {yearOptions.map((year) => (
          <Link
            className={
              selectedGraduationYear === year
                ? "rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                : "rounded-md border bg-background px-4 py-2 text-sm font-semibold hover:bg-secondary"
            }
            href={`/dashboard?graduationYear=${year}`}
            key={year}
          >
            {year}卒
          </Link>
        ))}
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          icon={<Users className="h-5 w-5 text-primary" />}
          label="学生数"
          subtext={`${selectedGraduationYear}卒として登録されている学生`}
          value={`${studentCountForCard}名`}
        />
        <MetricCard
          icon={<LineChart className="h-5 w-5 text-primary" />}
          label="ゴダイへの確度"
          subtext="専願、併願、A、B または旧志望度4以上"
          value={`${highCertaintyCount}名`}
        />
        <MetricCard
          icon={<MessageCircle className="h-5 w-5 text-primary" />}
          label="返信待ち"
          subtext="こちらの送信後に返信がない学生"
          value={`${waitingCount}名`}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>進捗サマリー</CardTitle>
          <p className="text-sm text-muted-foreground">
            エントリーは選択した卒年の管理学生数です。その他の項目は学生情報・会話・イベント日付から自動集計します。
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-[980px] border text-sm">
              <thead className="bg-primary text-primary-foreground">
                <tr>
                  <th className="border px-3 py-2 text-left">区分</th>
                  {recruitingMetrics.map((metric) => (
                    <th className="whitespace-nowrap border px-3 py-2 text-center" key={metric.key}>
                      {metric.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th className="border px-3 py-2 text-left">{selectedGraduationYear}卒</th>
                  {recruitingMetrics.map((metric) => (
                    <td className="border px-3 py-2 text-center font-semibold" key={metric.key}>
                      {counts[metric.key]}
                    </td>
                  ))}
                </tr>
                <tr className="bg-secondary">
                  <th className="border px-3 py-2 text-left">内容</th>
                  {recruitingMetrics.map((metric) => (
                    <td className="border px-3 py-2 text-xs text-muted-foreground" key={metric.key}>
                      {metricSubtext(metric.key)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <RecruitingGoalBoard
        counts={counts}
        previousCounts={previousCounts}
        selectedGraduationYear={selectedGraduationYear}
        snapshots={snapshots}
        students={selectedStudents.map((student) => ({
          id: student.id,
          created_at: student.created_at ?? null,
          first_contact_date: student.first_contact_date ?? null
        }))}
      />
    </main>
  );
}

function MetricCard({
  icon,
  label,
  subtext,
  value
}: {
  icon: ReactNode;
  label: string;
  subtext: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-base">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
      </CardContent>
    </Card>
  );
}

async function fetchGraduationYears(supabase: any) {
  const years = new Set<number>();
  const pageSize = 1000;
  for (let from = 0; from < 5000; from += pageSize) {
    const { data, error } = await supabase
      .from("students")
      .select("graduation_year")
      .not("graduation_year", "is", null)
      .range(from, from + pageSize - 1);

    if (error || !data?.length) break;
    for (const row of data) {
      const year = Number(row.graduation_year);
      if (Number.isFinite(year)) years.add(year);
    }
    if (data.length < pageSize) break;
  }
  return Array.from(years);
}

async function countStudentsByGraduationYear(supabase: any, graduationYear: number) {
  const { count, error } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("graduation_year", graduationYear);

  if (error) return null;
  return count ?? 0;
}

async function fetchStudentsForMetrics(supabase: any, graduationYear: number) {
  const rows: any[] = [];
  const pageSize = 1000;
  for (let from = 0; from < 5000; from += pageSize) {
    const { data, error } = await supabase
      .from("students")
      .select(DASHBOARD_STUDENT_SELECT)
      .eq("graduation_year", graduationYear)
      .range(from, from + pageSize - 1);

    if (error) return fetchStudentsFallback(supabase, graduationYear);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function fetchStudentsFallback(supabase: any, graduationYear: number) {
  const rows: any[] = [];
  const pageSize = 1000;
  for (let from = 0; from < 5000; from += pageSize) {
    const { data, error } = await supabase
      .from("students")
      .select(FALLBACK_STUDENT_SELECT)
      .eq("graduation_year", graduationYear)
      .range(from, from + pageSize - 1);

    if (error) return rows;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function fetchSnapshots(supabase: any, graduationYear: number) {
  const { data, error } = await supabase
    .from("recruiting_monthly_snapshots")
    .select("id,snapshot_month,metrics_jsonb")
    .eq("graduation_year", graduationYear)
    .order("snapshot_month", { ascending: false })
    .limit(24);

  if (error) return [];
  return data ?? [];
}

function isHighCertainty(row: any) {
  const value = String(row.motivation_rank ?? row.motivation_level ?? "").trim().toUpperCase();
  return ["専願", "併願", "A", "B", "4", "5"].some((token) => value.includes(token));
}

function isWaitingReply(row: any) {
  if (!row.last_outbound_at) return false;
  if (!row.last_inbound_at) return true;
  return new Date(row.last_outbound_at).getTime() > new Date(row.last_inbound_at).getTime();
}

function metricSubtext(key: keyof RecruitingMetricCounts) {
  switch (key) {
    case "entry":
      return "選択した卒年の管理学生数";
    case "pool":
      return "一度でも会話が成立";
    case "next":
      return "初回接触以外の接点あり";
    case "is":
      return "主要イベントに参加";
    case "interview":
      return "薬剤師インタビュー";
    case "selection":
      return "選考会";
    case "offer":
      return "内定出し";
    case "offerAccepted":
      return "内定内諾";
    case "hired":
      return "入社";
    default:
      return "";
  }
}
