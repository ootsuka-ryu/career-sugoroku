"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  getUniversityRegion,
  UNIVERSITY_REGION_ORDER,
  type UniversityRegion
} from "@/lib/students/university-regions";
import {
  buildJapaneseSearchIndex,
  matchesJapaneseSearchQuery
} from "@/lib/search/japanese";

export type StudentCascadeOption = {
  id: string;
  name: string;
  kana?: string | null;
  university: string | null;
  graduationYear?: number | null;
  searchText?: string | null;
};

type UniversityGroup = {
  university: string;
  students: StudentCascadeOption[];
};

type RegionGroup = {
  region: UniversityRegion;
  universities: UniversityGroup[];
};

export function StudentCascadePicker({
  students,
  value,
  onChange,
  id,
  className
}: {
  students: StudentCascadeOption[];
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeRegion, setActiveRegion] = useState<UniversityRegion>(UNIVERSITY_REGION_ORDER[0]);
  const [activeUniversity, setActiveUniversity] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState({
    left: 16,
    top: 16,
    width: 920,
    maxHeight: 560
  });

  const selectedStudent = students.find((student) => student.id === value) ?? null;
  const groups = useMemo(() => buildRegionGroups(students, query), [query, students]);
  const filteredStudentCount = useMemo(
    () =>
      groups.reduce(
        (regionTotal, group) =>
          regionTotal +
          group.universities.reduce(
            (universityTotal, university) => universityTotal + university.students.length,
            0
          ),
        0
      ),
    [groups]
  );
  const regionGroup = groups.find((group) => group.region === activeRegion) ?? groups[0] ?? null;
  const universityGroup =
    regionGroup?.universities.find((group) => group.university === activeUniversity) ??
    regionGroup?.universities[0] ??
    null;

  useEffect(() => {
    if (!groups.some((group) => group.region === activeRegion)) {
      setActiveRegion(groups[0]?.region ?? UNIVERSITY_REGION_ORDER[0]);
    }
  }, [activeRegion, groups]);

  useEffect(() => {
    if (!regionGroup?.universities.some((group) => group.university === activeUniversity)) {
      setActiveUniversity(regionGroup?.universities[0]?.university ?? "");
    }
  }, [activeUniversity, regionGroup]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const width = Math.min(920, viewportWidth - 32);
      const left = Math.min(Math.max(rect.left, 16), Math.max(16, viewportWidth - width - 16));
      const preferredTop = rect.bottom + 8;
      const availableBelow = viewportHeight - preferredTop - 16;
      const maxHeight = Math.min(620, Math.max(340, viewportHeight - 32));
      const top =
        availableBelow >= 340
          ? preferredTop
          : Math.max(16, Math.min(rect.top - 8, viewportHeight - maxHeight - 16));

      setDropdownStyle({
        left,
        top,
        width,
        maxHeight: Math.min(maxHeight, viewportHeight - top - 16)
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  return (
    <div className={`relative ${className ?? ""}`} ref={rootRef}>
      <button
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-left text-sm"
        id={id}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="truncate">
          {selectedStudent
            ? formatStudentLabel(selectedStudent)
            : students.length > 0
              ? "学生を選択"
              : "学生がいません"}
        </span>
        <ChevronRight className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open ? (
        <div
          className="fixed z-[80] flex flex-col overflow-hidden rounded-md border bg-white shadow-lg"
          style={dropdownStyle}
        >
          <div className="border-b p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <Input
                className="pl-9"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="学生名・大学名で検索"
                value={query}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              地域 → 大学 → 学生の順に選択します。検索結果:
              <span className="ml-1 font-medium text-foreground">{filteredStudentCount}名</span>
            </p>
          </div>
          <div
            className="grid min-h-0 grid-cols-[160px_240px_minmax(280px,1fr)] overflow-hidden"
            style={{ height: Math.max(260, dropdownStyle.maxHeight - 96) }}
          >
            <div className="min-h-0 overflow-y-auto overscroll-contain border-r bg-secondary/40 p-2">
              <p className="sticky top-0 z-10 -mx-2 mb-1 border-b bg-secondary px-3 py-2 text-xs font-semibold text-muted-foreground">
                地域
              </p>
              {groups.map((group) => (
                <button
                  className={
                    group.region === activeRegion
                      ? "flex w-full items-center justify-between rounded-md bg-primary px-3 py-2 text-left text-sm font-medium text-primary-foreground"
                      : "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-background"
                  }
                  key={group.region}
                  onFocus={() => setActiveRegion(group.region)}
                  onMouseEnter={() => setActiveRegion(group.region)}
                  type="button"
                >
                  <span>{group.region}</span>
                  <span className="text-xs opacity-80">
                    {group.universities.reduce(
                      (total, university) => total + university.students.length,
                      0
                    )}
                  </span>
                </button>
              ))}
            </div>
            <div className="min-h-0 overflow-y-auto overscroll-contain border-r p-2">
              <p className="sticky top-0 z-10 -mx-2 mb-1 border-b bg-white px-3 py-2 text-xs font-semibold text-muted-foreground">
                大学
              </p>
              {regionGroup?.universities.map((group) => (
                <button
                  className={
                    group.university === activeUniversity
                      ? "flex w-full items-center justify-between rounded-md bg-emerald-50 px-3 py-2 text-left text-sm font-medium text-primary"
                      : "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-secondary/70"
                  }
                  key={group.university}
                  onFocus={() => setActiveUniversity(group.university)}
                  onMouseEnter={() => setActiveUniversity(group.university)}
                  type="button"
                >
                  <span className="truncate">{group.university}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{group.students.length}</span>
                </button>
              ))}
            </div>
            <div className="min-h-0 overflow-y-auto overscroll-contain p-2">
              <p className="sticky top-0 z-10 -mx-2 mb-1 border-b bg-white px-3 py-2 text-xs font-semibold text-muted-foreground">
                学生
              </p>
              {universityGroup ? (
                <div className="space-y-1">
                  <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">
                    {universityGroup.university} / {universityGroup.students.length}名
                  </p>
                  {universityGroup.students.map((student) => (
                    <button
                      className={
                        student.id === value
                          ? "w-full rounded-md bg-primary px-3 py-2 text-left text-sm text-primary-foreground"
                          : "w-full rounded-md px-3 py-2 text-left text-sm hover:bg-secondary/70"
                      }
                      key={student.id}
                      onClick={() => {
                        onChange(student.id);
                        setOpen(false);
                      }}
                      type="button"
                    >
                      <span className="font-medium">{student.name}</span>
                      <span className="ml-2 text-xs opacity-80">
                        {student.graduationYear ? `${student.graduationYear}卒` : "卒年未登録"}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="p-3 text-sm text-muted-foreground">該当する学生がいません。</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function buildRegionGroups(students: StudentCascadeOption[], query: string): RegionGroup[] {
  const buckets = new Map<UniversityRegion, Map<string, StudentCascadeOption[]>>();

  for (const region of UNIVERSITY_REGION_ORDER) {
    buckets.set(region, new Map());
  }

  for (const student of students) {
    const university = student.university?.trim() || "大学未登録";
    const haystack = buildSearchIndex([
      student.name,
      student.kana,
      university,
      student.graduationYear?.toString(),
      student.searchText
    ]);
    if (!matchesSearchQuery(haystack, query)) continue;

    const region = getUniversityRegion(student.university);
    const universityMap = buckets.get(region) ?? new Map<string, StudentCascadeOption[]>();
    universityMap.set(university, [...(universityMap.get(university) ?? []), student]);
    buckets.set(region, universityMap);
  }

  return UNIVERSITY_REGION_ORDER.map((region) => {
    const universityMap = buckets.get(region) ?? new Map<string, StudentCascadeOption[]>();
    return {
      region,
      universities: Array.from(universityMap.entries())
        .map(([university, groupStudents]) => ({
          university,
          students: groupStudents.sort((a, b) => a.name.localeCompare(b.name, "ja"))
        }))
        .sort((a, b) => a.university.localeCompare(b.university, "ja"))
    };
  }).filter((group) => group.universities.length > 0);
}

function formatStudentLabel(student: StudentCascadeOption) {
  const parts = [student.name];
  if (student.university) parts.push(student.university);
  if (student.graduationYear) parts.push(`${student.graduationYear}卒`);
  return parts.join(" / ");
}

function matchesSearchQuery(index: string, rawQuery: string) {
  return matchesJapaneseSearchQuery(index, rawQuery);
}

function buildSearchIndex(values: Array<string | null | undefined>) {
  return buildJapaneseSearchIndex(values);
}
