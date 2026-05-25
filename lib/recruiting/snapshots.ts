import { calculateRecruitingMetrics } from "@/lib/recruiting/metrics";

export type SaveRecruitingSnapshotsResult = {
  saved: number;
  graduationYears: number[];
  snapshotMonth: string;
};

export async function saveRecruitingMonthlySnapshots({
  createdBy = null,
  date = new Date(),
  graduationYear,
  supabase
}: {
  createdBy?: string | null;
  date?: Date;
  graduationYear?: number;
  supabase: any;
}): Promise<SaveRecruitingSnapshotsResult> {
  let query = supabase
    .from("students")
    .select("*, student_tags(tags(id, name, color))")
    .not("graduation_year", "is", null);

  if (graduationYear) {
    query = query.eq("graduation_year", graduationYear);
  }

  const { data: students, error } = await query;
  if (error) throw error;

  const grouped = new Map<number, any[]>();
  for (const student of students ?? []) {
    if (typeof student.graduation_year !== "number") continue;
    grouped.set(student.graduation_year, [
      ...(grouped.get(student.graduation_year) ?? []),
      student
    ]);
  }

  const snapshotMonth = getJstMonthStart(date);
  const rows = Array.from(grouped.entries()).map(([year, rowsForYear]) => ({
    graduation_year: year,
    snapshot_month: snapshotMonth,
    metrics_jsonb: calculateRecruitingMetrics(rowsForYear),
    created_by: createdBy
  }));

  if (rows.length === 0) {
    return { saved: 0, graduationYears: [], snapshotMonth };
  }

  const { error: upsertError } = await supabase
    .from("recruiting_monthly_snapshots")
    .upsert(rows, {
      onConflict: "graduation_year,snapshot_month"
    });

  if (upsertError) throw upsertError;

  return {
    saved: rows.length,
    graduationYears: rows.map((row) => row.graduation_year),
    snapshotMonth
  };
}

export function isLastDayInJst(date = new Date()) {
  const jst = toJstParts(date);
  const lastDay = new Date(Date.UTC(jst.year, jst.month, 0)).getUTCDate();
  return jst.day === lastDay;
}

function getJstMonthStart(date: Date) {
  const jst = toJstParts(date);
  return `${jst.year}-${String(jst.month).padStart(2, "0")}-01`;
}

function toJstParts(date: Date) {
  const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return {
    year: jstDate.getUTCFullYear(),
    month: jstDate.getUTCMonth() + 1,
    day: jstDate.getUTCDate()
  };
}
