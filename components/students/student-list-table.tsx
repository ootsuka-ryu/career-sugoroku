"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { FilterX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  localizeKanaText,
  localizeSampleText
} from "@/lib/display/localize";
import { daysSince, formatDateTime } from "@/lib/format";
import { getStaffBadgeClass, getStaffDisplayName } from "@/lib/staff/display";
import {
  candidateStages,
  getCandidateStageLabel,
  getMotivationRankLabel,
  motivationRanks
} from "@/lib/students/options";
import type { StaffSummary, StudentListItem, TagSummary } from "@/lib/students/types";
import { UNIVERSITY_CATEGORY_TAGS, UNIVERSITY_TAG_FOLDERS } from "@/lib/tags/university-folders";

type StudentListTableProps = {
  students: StudentListItem[];
  tags: TagSummary[];
  staffUsers: StaffSummary[];
};

type TagGroup = {
  id: string;
  name: string;
  tags: TagSummary[];
};

export function StudentListTable({
  students,
  tags,
  staffUsers
}: StudentListTableProps) {
  const [search, setSearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [activeTagGroupId, setActiveTagGroupId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagMode, setTagMode] = useState<"or" | "and">("or");
  const [staffId, setStaffId] = useState("all");
  const [motivationRank, setMotivationRank] = useState("all");
  const [candidateStage, setCandidateStage] = useState("all");
  const [noReplyDays, setNoReplyDays] = useState("off");

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return students.filter((student) => {
      const haystack = [
        student.display_name,
        localizeSampleText(student.display_name),
        student.real_name,
        localizeSampleText(student.real_name),
        student.kana,
        localizeKanaText(student.kana),
        localizeSampleText(student.university),
        student.grade,
        student.graduation_year?.toString(),
        student.motivation_rank,
        getCandidateStageLabel(student.candidate_stage),
        student.ai_next_action,
        student.manual_next_action,
        ...student.assignees.flatMap((staff) => [
          staff.name,
          getStaffDisplayName(staff)
        ])
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (query && !haystack.includes(query)) return false;
      if (staffId !== "all" && !student.assignees.some((staff) => staff.id === staffId)) {
        return false;
      }
      if (
        motivationRank !== "all" &&
        getMotivationRankLabel(student.motivation_rank, student.motivation_level) !== motivationRank
      ) {
        return false;
      }
      if (candidateStage !== "all" && student.candidate_stage !== candidateStage) {
        return false;
      }
      if (selectedTagIds.length > 0) {
        const studentTagIds = student.tags.map((tag) => tag.id);
        const matched =
          tagMode === "and"
            ? selectedTagIds.every((tagId) => studentTagIds.includes(tagId))
            : selectedTagIds.some((tagId) => studentTagIds.includes(tagId));
        if (!matched) return false;
      }
      if (noReplyDays !== "off") {
        const threshold = Number(noReplyDays);
        if (!student.last_outbound_at) return false;
        if (
          student.last_inbound_at &&
          new Date(student.last_inbound_at) > new Date(student.last_outbound_at)
        ) {
          return false;
        }
        const elapsed = daysSince(student.last_outbound_at);
        if (elapsed === null || elapsed < threshold) return false;
      }

      return true;
    });
  }, [
    candidateStage,
    motivationRank,
    noReplyDays,
    search,
    selectedTagIds,
    staffId,
    students,
    tagMode
  ]);

  const tagGroups = useMemo(() => buildTagGroups(tags, tagSearch), [tagSearch, tags]);
  const selectedTags = useMemo(
    () => tags.filter((tag) => selectedTagIds.includes(tag.id)),
    [selectedTagIds, tags]
  );
  const activeTagGroup =
    tagGroups.find((group) => group.id === activeTagGroupId) ?? tagGroups[0] ?? null;

  function toggleTag(tagId: string) {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId]
    );
  }

  function resetFilters() {
    setSearch("");
    setTagSearch("");
    setTagPickerOpen(false);
    setActiveTagGroupId(null);
    setSelectedTagIds([]);
    setStaffId("all");
    setMotivationRank("all");
    setCandidateStage("all");
    setNoReplyDays("off");
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[1.3fr_0.9fr_0.9fr_0.9fr]">
        <Input
          onChange={(event) => setSearch(event.target.value)}
          placeholder="氏名・大学・次アクションで検索"
          value={search}
        />
        <Select value={staffId} onChange={setStaffId}>
          <option value="all">担当者すべて</option>
          {staffUsers.map((staff) => (
            <option key={staff.id} value={staff.id}>
              {getStaffDisplayName(staff)}
            </option>
          ))}
        </Select>
        <Select value={motivationRank} onChange={setMotivationRank}>
          <option value="all">志望度すべて</option>
          {motivationRanks.map((rank) => (
            <option key={rank} value={rank}>
              {rank}
            </option>
          ))}
        </Select>
        <Select value={candidateStage} onChange={setCandidateStage}>
          <option value="all">候補者ステージすべて</option>
          {candidateStages.map((stage) => (
            <option key={stage.value} value={stage.value}>
              {stage.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        <div className="relative rounded-md border bg-card p-3">
          <div className="grid gap-2 md:grid-cols-[1fr_90px]">
            <div
              className="relative"
              onBlur={(event) => {
                const next = event.relatedTarget;
                if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
                  setTagPickerOpen(false);
                }
              }}
            >
              <Input
                onChange={(event) => {
                  setTagSearch(event.target.value);
                  setTagPickerOpen(true);
                  setActiveTagGroupId(null);
                }}
                onClick={() => setTagPickerOpen(true)}
                onFocus={() => setTagPickerOpen(true)}
                placeholder="タグ名で検索・フォルダから選択"
                value={tagSearch}
              />
              {tagPickerOpen ? (
                <div className="absolute left-0 top-full z-30 mt-2 grid w-full min-w-[720px] max-w-[900px] grid-cols-[230px_minmax(0,1fr)] overflow-hidden rounded-md border bg-white shadow-lg">
                  <div className="max-h-80 overflow-auto border-r bg-secondary/40 p-2">
                    {tagGroups.length > 0 ? (
                      tagGroups.map((group) => {
                        const active = activeTagGroup?.id === group.id;
                        return (
                          <button
                            className={
                              active
                                ? "flex w-full items-center justify-between rounded-md bg-primary px-3 py-2 text-left text-sm font-medium text-primary-foreground"
                                : "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-background"
                            }
                            key={group.id}
                            onFocus={() => setActiveTagGroupId(group.id)}
                            onMouseEnter={() => setActiveTagGroupId(group.id)}
                            type="button"
                          >
                            <span className="truncate">{group.name}</span>
                            <span className="ml-2 text-xs opacity-80">{group.tags.length}</span>
                          </button>
                        );
                      })
                    ) : (
                      <p className="px-3 py-2 text-sm text-muted-foreground">該当するフォルダがありません。</p>
                    )}
                  </div>
                  <div className="max-h-80 overflow-auto p-3">
                    {activeTagGroup ? (
                      <>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold">{activeTagGroup.name}</p>
                          <p className="text-xs text-muted-foreground">{activeTagGroup.tags.length}件</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {activeTagGroup.tags.map((tag) => {
                            const active = selectedTagIds.includes(tag.id);
                            return (
                              <button
                                className="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors"
                                key={tag.id}
                                onClick={() => toggleTag(tag.id)}
                                style={{
                                  borderColor: tag.color,
                                  backgroundColor: active ? tag.color : "transparent",
                                  color: active ? "white" : tag.color
                                }}
                                type="button"
                              >
                                {localizeSampleText(tag.name)}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">左のフォルダにカーソルを合わせてください。</p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            <Select value={tagMode} onChange={(value) => setTagMode(value as "or" | "and")}>
              <option value="or">OR</option>
              <option value="and">AND</option>
            </Select>
          </div>
          {selectedTags.length > 0 ? (
            <div className="mt-2 flex max-h-20 flex-wrap items-center gap-1.5 overflow-auto rounded-md border bg-secondary/30 p-2">
              <span className="mr-1 text-xs text-muted-foreground">選択中 {selectedTags.length}件</span>
              {selectedTags.map((tag) => (
                <button
                  className="rounded-md border px-2 py-0.5 text-xs font-medium text-white"
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  style={{ backgroundColor: tag.color, borderColor: tag.color }}
                  type="button"
                >
                  {localizeSampleText(tag.name)} ×
                </button>
              ))}
            </div>
          ) : null}
          <Button className="mt-2" onClick={resetFilters} size="sm" type="button" variant="ghost">
            <FilterX className="mr-2 h-4 w-4" />
            クリア
          </Button>
        </div>
        <Select value={noReplyDays} onChange={setNoReplyDays}>
          <option value="off">返信なし指定なし</option>
          <option value="3">返信なし3日以上</option>
          <option value="7">返信なし7日以上</option>
          <option value="14">返信なし14日以上</option>
        </Select>
      </div>

      <div className="overflow-hidden rounded-md border bg-card">
        <div className="border-b px-4 py-3 text-sm text-muted-foreground">
          {filteredStudents.length} / {students.length}名を表示
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>氏名</TableHead>
                <TableHead>大学/学年</TableHead>
                <TableHead>志望度</TableHead>
                <TableHead>候補者ステージ</TableHead>
                <TableHead>担当者</TableHead>
                <TableHead>最終接触</TableHead>
                <TableHead>次アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="min-w-44">
                        <Link
                          className="font-medium text-primary hover:underline"
                          href={`/students/${student.id}`}
                        >
                          {localizeSampleText(student.real_name) ||
                            localizeSampleText(student.display_name) ||
                            "名前未登録"}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {localizeKanaText(student.kana) || "-"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-40">
                        <p>{localizeSampleText(student.university) || "-"}</p>
                        <p className="text-xs text-muted-foreground">
                          {student.grade || "-"} / {student.graduation_year ?? "-"}卒
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {getMotivationRankLabel(student.motivation_rank, student.motivation_level)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getCandidateStageLabel(student.candidate_stage)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-32 flex-wrap gap-1">
                        {student.assignees.length > 0
                          ? student.assignees.map((staff) => (
                              <Badge
                                className={getStaffBadgeClass(staff)}
                                key={staff.id}
                                variant="outline"
                              >
                                {getStaffDisplayName(staff)}
                              </Badge>
                            ))
                          : "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-36">
                        <p>{formatDateTime(getLatestContact(student))}</p>
                        <p className="text-xs text-muted-foreground">
                          受信 {formatDateTime(student.last_inbound_at)} / 送信{" "}
                          {formatDateTime(student.last_outbound_at)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="min-w-52 line-clamp-2 text-sm text-muted-foreground">
                        {localizeSampleText(student.manual_next_action) ||
                          localizeSampleText(student.ai_next_action) ||
                          "-"}
                      </p>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="h-28 text-center text-muted-foreground" colSpan={7}>
                    条件に合う学生がいません。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function buildTagGroups(tags: TagSummary[], query: string): TagGroup[] {
  const tagsByName = new Map(tags.map((tag) => [tag.name, tag]));
  const groupedIds = new Set<string>();
  const normalizedQuery = query.trim().toLowerCase();

  function include(tag: TagSummary) {
    const name = `${tag.name} ${localizeSampleText(tag.name) ?? ""}`.toLowerCase();
    return !normalizedQuery || name.includes(normalizedQuery);
  }

  const categoryTags = UNIVERSITY_CATEGORY_TAGS
    .map((name) => tagsByName.get(name))
    .filter((tag): tag is TagSummary => Boolean(tag))
    .filter(include);
  categoryTags.forEach((tag) => groupedIds.add(tag.id));

  const groups: TagGroup[] = [
    { id: "university-categories", name: "大学分類タグ", tags: categoryTags }
  ];

  for (const folder of UNIVERSITY_TAG_FOLDERS) {
    const folderTags = folder.tags
      .map((name) => tagsByName.get(name))
      .filter((tag): tag is TagSummary => Boolean(tag))
      .filter(include);
    folderTags.forEach((tag) => groupedIds.add(tag.id));
    groups.push({ id: folder.name, name: `${folder.name}フォルダ`, tags: folderTags });
  }

  const uncategorized = tags
    .filter((tag) => !groupedIds.has(tag.id))
    .filter(include)
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));
  groups.push({ id: "uncategorized", name: "未分類", tags: uncategorized });

  return groups.filter((group) => group.tags.length > 0 || normalizedQuery);
}

function Select({
  value,
  onChange,
  children
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <select
      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {children}
    </select>
  );
}

function getLatestContact(student: StudentListItem) {
  if (student.last_inbound_at && student.last_outbound_at) {
    return new Date(student.last_inbound_at) > new Date(student.last_outbound_at)
      ? student.last_inbound_at
      : student.last_outbound_at;
  }

  return student.last_outbound_at ?? student.last_inbound_at;
}
