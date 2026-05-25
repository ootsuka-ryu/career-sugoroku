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

type StudentListTableProps = {
  students: StudentListItem[];
  tags: TagSummary[];
  staffUsers: StaffSummary[];
};

export function StudentListTable({
  students,
  tags,
  staffUsers
}: StudentListTableProps) {
  const [search, setSearch] = useState("");
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
        ...student.tags.map((tag) => localizeSampleText(tag.name)),
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

  function toggleTag(tagId: string) {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId]
    );
  }

  function resetFilters() {
    setSearch("");
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
          placeholder="氏名・大学・タグ・次アクションで検索"
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
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">タグ条件</span>
          <Select value={tagMode} onChange={(value) => setTagMode(value as "or" | "and")}>
            <option value="or">OR</option>
            <option value="and">AND</option>
          </Select>
          {tags.map((tag) => {
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
          <Button onClick={resetFilters} size="sm" type="button" variant="ghost">
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
                <TableHead>タグ</TableHead>
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
                      <div className="flex min-w-48 flex-wrap gap-1">
                        {student.tags.length > 0
                          ? student.tags.map((tag) => (
                              <span
                                className="rounded-md px-2 py-0.5 text-xs font-medium text-white"
                                key={tag.id}
                                style={{ backgroundColor: tag.color }}
                              >
                                {localizeSampleText(tag.name)}
                              </span>
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
                  <TableCell className="h-28 text-center text-muted-foreground" colSpan={8}>
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
