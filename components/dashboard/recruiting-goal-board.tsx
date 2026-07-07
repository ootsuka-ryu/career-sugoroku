"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { BarChart3, PencilLine } from "lucide-react";

import { saveRecruitingGoalOverride } from "@/app/(dashboard)/dashboard/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  formatRate,
  recruitingMetrics,
  type RecruitingMetricCounts
} from "@/lib/recruiting/funnel";

type StudentGoalSource = {
  id: string;
  first_contact_date: string | null;
  created_at: string | null;
};

type SnapshotSource = {
  id: string;
  snapshot_month: string;
  metrics_jsonb: Partial<RecruitingMetricCounts> | null;
};

type GoalOverrideSource = {
  row_key: string;
  target_value: number | null;
  actual_value: number | null;
};

type GoalRow = {
  key: string;
  label: string;
  monthKey: string | "before";
  target: number;
};

const targetRows28: GoalRow[] = [
  { key: "before-2025-12", label: "2025年12月以前", monthKey: "before", target: 89 },
  { key: "2026-01", label: "2026年1月", monthKey: "2026-01", target: 25 },
  { key: "2026-02", label: "2026年2月", monthKey: "2026-02", target: 50 },
  { key: "2026-03", label: "2026年3月", monthKey: "2026-03", target: 50 },
  { key: "2026-04", label: "2026年4月", monthKey: "2026-04", target: 42 },
  { key: "2026-05", label: "2026年5月", monthKey: "2026-05", target: 40 },
  { key: "2026-06", label: "2026年6月", monthKey: "2026-06", target: 60 },
  { key: "2026-07", label: "2026年7月", monthKey: "2026-07", target: 50 },
  { key: "2026-08", label: "2026年8月", monthKey: "2026-08", target: 50 },
  { key: "2026-09", label: "2026年9月", monthKey: "2026-09", target: 50 },
  { key: "2026-10", label: "2026年10月", monthKey: "2026-10", target: 55 },
  { key: "2026-11", label: "2026年11月", monthKey: "2026-11", target: 40 },
  { key: "2026-12", label: "2026年12月", monthKey: "2026-12", target: 0 },
  { key: "2027-01", label: "2027年1月", monthKey: "2027-01", target: 0 },
  { key: "2027-02", label: "2027年2月", monthKey: "2027-02", target: 0 },
  { key: "2027-03", label: "2027年3月", monthKey: "2027-03", target: 0 }
];

const meetingMonths = [
  "2026-03",
  "2026-04",
  "2026-05",
  "2026-06",
  "2026-07",
  "2026-08",
  "2026-09",
  "2026-10",
  "2026-11",
  "2026-12",
  "2027-01",
  "2027-02",
  "2027-03",
  "2027-04",
  "2027-05"
];

export function RecruitingGoalBoard({
  selectedGraduationYear,
  students,
  counts,
  previousCounts,
  snapshots,
  goalOverrides
}: {
  selectedGraduationYear: number;
  students: StudentGoalSource[];
  counts: RecruitingMetricCounts;
  previousCounts: Partial<RecruitingMetricCounts> | null;
  snapshots: SnapshotSource[];
  goalOverrides: GoalOverrideSource[];
}) {
  const visibleMetrics = useMemo(() => recruitingMetrics.slice(0, 8), []);
  const [isSavingGoal, startSavingGoal] = useTransition();
  const [goalSaveMessage, setGoalSaveMessage] = useState("");
  const [targetOverrides, setTargetOverrides] = useState<Record<string, number>>({});
  const [actualOverrides, setActualOverrides] = useState<Record<string, number>>({});
  const [meetingCurrentOverrides, setMeetingCurrentOverrides] = useLocalNumberMap(
    `recruiting-meeting-current-${selectedGraduationYear}`
  );
  const [meetingPreviousOverrides, setMeetingPreviousOverrides] = useLocalNumberMap(
    `recruiting-meeting-previous-${selectedGraduationYear}`
  );
  const [meetingMonthlyOverrides, setMeetingMonthlyOverrides] = useLocalNumberMap(
    `recruiting-meeting-monthly-${selectedGraduationYear}`
  );

  const actualByMonth = useMemo(() => countStudentsByMonth(students), [students]);
  const rows = selectedGraduationYear === 2028 ? targetRows28 : [];
  useEffect(() => {
    const nextTargets: Record<string, number> = {};
    const nextActuals: Record<string, number> = {};
    for (const override of goalOverrides) {
      if (typeof override.target_value === "number") {
        nextTargets[override.row_key] = override.target_value;
      }
      if (typeof override.actual_value === "number") {
        nextActuals[override.row_key] = override.actual_value;
      }
    }
    setTargetOverrides(nextTargets);
    setActualOverrides(nextActuals);
    setGoalSaveMessage("");
  }, [goalOverrides, selectedGraduationYear]);

  const currentCounts = useMemo(() => {
    const next = { ...counts };
    for (const metric of visibleMetrics) {
      const override = meetingCurrentOverrides[`current-${metric.key}`];
      if (typeof override === "number") next[metric.key] = override;
    }
    return next;
  }, [counts, meetingCurrentOverrides, visibleMetrics]);
  const editablePreviousCounts = useMemo(() => {
    const next: Partial<RecruitingMetricCounts> = { ...(previousCounts ?? {}) };
    for (const metric of visibleMetrics) {
      const override = meetingPreviousOverrides[`previous-${metric.key}`];
      if (typeof override === "number") next[metric.key] = override;
    }
    return next;
  }, [meetingPreviousOverrides, previousCounts, visibleMetrics]);
  const targetTotal = rows.reduce(
    (sum, row) => sum + getEditableValue(targetOverrides, row.key, row.target),
    0
  );
  const actualTotal = rows.reduce(
    (sum, row) => sum + getActualValue(actualOverrides, row, actualByMonth),
    0
  );
  const snapshotByMonth = useMemo(() => {
    const map = new Map<string, SnapshotSource>();
    for (const snapshot of snapshots) {
      map.set(toMonthKey(snapshot.snapshot_month), snapshot);
    }
    return map;
  }, [snapshots]);

  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PencilLine className="h-5 w-5 text-primary" />
            月次目標と実績
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            目標と実績は直接修正できます。修正値はこのブラウザに保存されます。
          </p>
        </CardHeader>
        <CardContent>
          {rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-[720px] border text-sm">
                <thead className="bg-neutral-900 text-white">
                  <tr>
                    <th className="border px-3 py-2 text-left">月</th>
                    <th className="border px-3 py-2 text-right">目標</th>
                    <th className="border px-3 py-2 text-right">実績</th>
                    <th className="border px-3 py-2 text-right">差分</th>
                    <th className="border px-3 py-2 text-right">達成率</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const target = getEditableValue(targetOverrides, row.key, row.target);
                    const actual = getActualValue(actualOverrides, row, actualByMonth);
                    return (
                      <tr key={row.key}>
                        <th className="border px-3 py-2 text-left font-medium">{row.label}</th>
                        <td className="border px-2 py-1">
                          <NumberCell
                            value={target}
                            onChange={(value) =>
                              setTargetOverrides((current) => ({ ...current, [row.key]: value }))
                            }
                            onCommit={(value) => saveGoalRow(row.key, value, actual)}
                          />
                        </td>
                        <td className="border px-2 py-1">
                          <NumberCell
                            value={actual}
                            onChange={(value) =>
                              setActualOverrides((current) => ({ ...current, [row.key]: value }))
                            }
                            onCommit={(value) => saveGoalRow(row.key, target, value)}
                          />
                        </td>
                        <td
                          className={
                            actual >= target
                              ? "border px-3 py-2 text-right text-emerald-700"
                              : "border px-3 py-2 text-right text-red-700"
                          }
                        >
                          {actual - target}
                        </td>
                        <td className="border px-3 py-2 text-right font-medium">
                          {formatRate(actual, target)}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-emerald-50 font-semibold">
                    <th className="border px-3 py-2 text-left">合計</th>
                    <td className="border px-3 py-2 text-right">{targetTotal}</td>
                    <td className="border px-3 py-2 text-right">{actualTotal}</td>
                    <td
                      className={
                        actualTotal >= targetTotal
                          ? "border px-3 py-2 text-right text-emerald-700"
                          : "border px-3 py-2 text-right text-red-700"
                      }
                    >
                      {actualTotal - targetTotal}
                    </td>
                    <td className="border px-3 py-2 text-right">
                      {formatRate(actualTotal, targetTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p
                className={
                  goalSaveMessage.includes("Supabase")
                    ? "mt-2 text-xs text-red-600"
                    : "mt-2 text-xs text-muted-foreground"
                }
              >
                {isSavingGoal ? "保存中..." : goalSaveMessage || "数字を変更すると自動保存されます。"}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              現在は28卒の月次目標表を登録しています。卒業年度を28卒に切り替えると表示されます。
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            経営会議用 進捗サマリー
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            自動集計値を初期表示し、会議用に必要な数字だけ直接修正できます。
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="min-w-[880px] border text-sm">
              <thead className="bg-neutral-900 text-white">
                <tr>
                  <th className="border px-3 py-2 text-left">区分</th>
                  {visibleMetrics.map((metric) => (
                    <th className="whitespace-nowrap border px-3 py-2 text-center" key={metric.key}>
                      {metric.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th className="border px-3 py-2 text-left">{selectedGraduationYear}卒</th>
                  {visibleMetrics.map((metric) => (
                    <td className="border px-2 py-1" key={metric.key}>
                      <NumberCell
                        value={currentCounts[metric.key]}
                        onChange={(value) =>
                          setMeetingCurrentOverrides(`current-${metric.key}`, value)
                        }
                      />
                    </td>
                  ))}
                </tr>
                <tr className="bg-emerald-50">
                  <th className="border px-3 py-2 text-left">CV</th>
                  {visibleMetrics.map((metric, index, metrics) => (
                    <td className="border px-3 py-2 text-center" key={metric.key}>
                      {index === 0
                        ? "-"
                        : formatRate(currentCounts[metric.key], currentCounts[metrics[index - 1].key])}
                    </td>
                  ))}
                </tr>
                <tr className="bg-amber-50">
                  <th className="border px-3 py-2 text-left">前年同月</th>
                  {visibleMetrics.map((metric) => (
                    <td className="border px-2 py-1" key={metric.key}>
                      <NumberCell
                        value={Number(editablePreviousCounts[metric.key] ?? 0)}
                        onChange={(value) =>
                          setMeetingPreviousOverrides(`previous-${metric.key}`, value)
                        }
                      />
                    </td>
                  ))}
                </tr>
                <tr className="bg-amber-100">
                  <th className="border px-3 py-2 text-left">前年比</th>
                  {visibleMetrics.map((metric) => (
                    <td className="border px-3 py-2 text-center" key={metric.key}>
                      {editablePreviousCounts[metric.key]
                        ? `${((currentCounts[metric.key] / Number(editablePreviousCounts[metric.key])) * 100).toFixed(1)}%`
                        : "-"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="max-h-72 overflow-auto rounded-md border">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="sticky top-0 bg-secondary">
                <tr>
                  <th className="border-b px-3 py-2 text-left">月</th>
                  {visibleMetrics.map((metric) => (
                    <th className="whitespace-nowrap border-b px-3 py-2 text-center" key={metric.key}>
                      {metric.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {meetingMonths.map((monthKey) => {
                  const snapshot = snapshotByMonth.get(monthKey);
                  return (
                    <tr key={monthKey}>
                      <th className="border-b px-3 py-2 text-left">
                        {formatMonthLabel(monthKey)}
                      </th>
                      {visibleMetrics.map((metric) => (
                        <td className="border-b px-2 py-1" key={metric.key}>
                          <NumberCell
                            value={getEditableValue(
                              meetingMonthlyOverrides,
                              `${monthKey}-${metric.key}`,
                              Number(snapshot?.metrics_jsonb?.[metric.key] ?? 0)
                            )}
                            onChange={(value) =>
                              setMeetingMonthlyOverrides(`${monthKey}-${metric.key}`, value)
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  function saveGoalRow(rowKey: string, targetValue: number, actualValue: number) {
    startSavingGoal(() => {
      void saveRecruitingGoalOverride({
        graduationYear: selectedGraduationYear,
        rowKey,
        targetValue,
        actualValue
      }).then((result) => setGoalSaveMessage(result.message));
    });
  }
}

function NumberCell({
  value,
  onChange,
  onCommit
}: {
  value: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
}) {
  function parse(value: string) {
    const numberValue = Number(value || 0);
    return Number.isFinite(numberValue) ? Math.max(0, Math.trunc(numberValue)) : 0;
  }

  return (
    <Input
      className="h-8 min-w-16 text-right"
      min={0}
      onBlur={(event) => onCommit?.(parse(event.currentTarget.value))}
      onChange={(event) => onChange(parse(event.target.value))}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      type="number"
      value={value}
    />
  );
}

function useLocalNumberMap(storageKey: string) {
  const [values, setValues] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(window.localStorage.getItem(storageKey) ?? "{}");
    } catch {
      return {};
    }
  });

  function update(key: string, value: number) {
    setValues((current) => {
      const next = { ...current, [key]: value };
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }

  return [values, update] as const;
}

function getEditableValue(overrides: Record<string, number>, key: string, fallback: number) {
  return typeof overrides[key] === "number" ? overrides[key] : fallback;
}

function getActualValue(
  overrides: Record<string, number>,
  row: GoalRow,
  actualByMonth: Map<string, number>
) {
  if (typeof overrides[row.key] === "number") return overrides[row.key];
  return actualByMonth.get(row.monthKey) ?? 0;
}

function countStudentsByMonth(students: StudentGoalSource[]) {
  const map = new Map<string, number>();
  for (const student of students) {
    const value = student.first_contact_date ?? student.created_at;
    const monthKey = toMonthKey(value);
    const key = monthKey <= "2025-12" ? "before" : monthKey;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

function toMonthKey(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 7);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return `${year}年${Number(month)}月`;
}
