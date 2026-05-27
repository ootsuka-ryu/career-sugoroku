"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, Clock, UserRound } from "lucide-react";
import { completeGeneratedTask, completeManualTask } from "@/app/(dashboard)/tasks/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type GeneratedTaskView = {
  key: string;
  title: string;
  reason: string;
  studentId: string;
  studentName: string;
  university: string;
  priority: number;
  assigneeIds: string[];
};

export type ManualTaskView = {
  id: string;
  title: string;
  dueDate: string | null;
  studentName: string;
  staffId: string | null;
};

export type StaffTaskFilter = {
  ids: string[];
  displayName: string;
};

export function TaskBoard({
  generatedTasks,
  manualTasks,
  staffUsers
}: {
  generatedTasks: GeneratedTaskView[];
  manualTasks: ManualTaskView[];
  staffUsers: StaffTaskFilter[];
}) {
  const [excludedStaffIds, setExcludedStaffIds] = useState<string[]>([]);
  const filteredGeneratedTasks = useMemo(() => {
    if (excludedStaffIds.length === 0) return generatedTasks;
    return generatedTasks.filter((task) => {
      if (task.assigneeIds.length === 0) return true;
      return !task.assigneeIds.some((id) => excludedStaffIds.includes(id));
    });
  }, [excludedStaffIds, generatedTasks]);

  function toggleStaff(staff: StaffTaskFilter) {
    setExcludedStaffIds((current) => {
      const allExcluded = staff.ids.every((id) => current.includes(id));
      return allExcluded
        ? current.filter((id) => !staff.ids.includes(id))
        : Array.from(new Set([...current, ...staff.ids]));
    });
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_0.55fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            自動ピックアップ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredGeneratedTasks.length > 0 ? (
            filteredGeneratedTasks.map((task) => (
              <div className="rounded-md border bg-card p-4" key={task.key}>
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        className={task.priority >= 90 ? "bg-destructive text-destructive-foreground" : ""}
                        variant="secondary"
                      >
                        優先度 {task.priority}
                      </Badge>
                      <Link className="font-medium text-primary hover:underline" href={`/students/${task.studentId}`}>
                        {task.studentName}
                      </Link>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{task.university}</p>
                    <p className="mt-2 text-sm">{task.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{task.reason}</p>
                  </div>
                  <form action={completeGeneratedTask}>
                    <input name="task_key" type="hidden" value={task.key} />
                    <Button size="sm" type="submit" variant="outline">
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      完了
                    </Button>
                  </form>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">表示対象の自動タスクはありません。</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-primary" />
            スタッフ別タスク
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            スタッフ名を押すと、その担当学生を自動ピックアップから除外します。もう一度押すと戻ります。
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {staffUsers.map((staff) => {
            const staffExcluded = staff.ids.every((id) => excludedStaffIds.includes(id));
            const tasks = manualTasks.filter((task) => task.staffId && staff.ids.includes(task.staffId));
            return (
              <div
                key={staff.displayName}
                className={
                  staffExcluded
                    ? "rounded-md border bg-secondary/50 p-3 opacity-60"
                    : "rounded-md border bg-card p-3"
                }
              >
                <button
                  className="w-full text-left"
                  onClick={() => toggleStaff(staff)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{staff.displayName}</p>
                    <Badge variant={staffExcluded ? "outline" : "accent"}>
                      {staffExcluded ? "OFF" : "ON"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{tasks.length}件の未完了タスク</p>
                </button>
                <div className="mt-3 space-y-2">
                  {tasks.length > 0 ? tasks.map((task) => (
                    <div key={task.id} className="rounded-md bg-secondary/70 p-2 text-sm">
                      <p className="font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.studentName} / 期限 {task.dueDate ?? "-"}
                      </p>
                      <form action={completeManualTask} className="mt-2">
                        <input name="task_id" type="hidden" value={task.id} />
                        <Button size="sm" type="submit" variant="outline">完了</Button>
                      </form>
                    </div>
                  )) : <p className="text-xs text-muted-foreground">未完了タスクはありません。</p>}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </section>
  );
}
