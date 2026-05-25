"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  updateStudentAssignee,
  type StudentActionState
} from "@/app/(dashboard)/students/[id]/actions";
import { Badge } from "@/components/ui/badge";
import {
  getStaffBadgeClass,
  getStaffDisplayName,
  getUnassignedStaffBadgeClass
} from "@/lib/staff/display";
import type { StaffSummary } from "@/lib/students/types";

const initialState: StudentActionState = {
  ok: false,
  message: ""
};

export function StudentAssigneeSelect({
  currentAssigneeId,
  staffOptions,
  studentId
}: {
  currentAssigneeId: string | null;
  staffOptions: StaffSummary[];
  studentId: string;
}) {
  const uniqueStaffOptions = useMemo(() => uniqueStaffByDisplayName(staffOptions), [staffOptions]);
  const [selectedStaffId, setSelectedStaffId] = useState(currentAssigneeId ?? "");
  const [state, formAction] = useFormState(updateStudentAssignee, initialState);
  const selectedStaff = uniqueStaffOptions.find((staff) => staff.id === selectedStaffId) ?? null;

  useEffect(() => {
    setSelectedStaffId(currentAssigneeId ?? "");
  }, [currentAssigneeId]);

  return (
    <form action={formAction} className="relative min-h-14 pb-5">
      <input name="student_id" type="hidden" value={studentId} />
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          className={selectedStaff ? getStaffBadgeClass(selectedStaff) : getUnassignedStaffBadgeClass()}
          variant="outline"
        >
          担当: {selectedStaff ? getStaffDisplayName(selectedStaff) : "未決定"}
        </Badge>
        <div className="relative">
          <select
            className={`h-9 min-w-32 rounded-md border px-3 text-sm font-medium shadow-sm outline-none transition focus:ring-2 focus:ring-ring ${
              selectedStaff ? getStaffBadgeClass(selectedStaff) : getUnassignedStaffBadgeClass()
            }`}
            name="staff_id"
            onChange={(event) => {
              setSelectedStaffId(event.target.value);
              event.currentTarget.form?.requestSubmit();
            }}
            value={selectedStaffId}
          >
            <option value="">未決定</option>
            {uniqueStaffOptions.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {getStaffDisplayName(staff)}
              </option>
            ))}
          </select>
          <AssigneePendingIndicator />
        </div>
      </div>
      {state.message ? (
        <p
          className={`absolute left-0 top-11 whitespace-nowrap text-xs ${
            state.ok ? "text-emerald-700" : "text-destructive"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function uniqueStaffByDisplayName(staffOptions: StaffSummary[]) {
  const seen = new Set<string>();
  const result: StaffSummary[] = [];

  for (const staff of staffOptions) {
    const label = getStaffDisplayName(staff);
    if (seen.has(label)) continue;
    seen.add(label);
    result.push(staff);
  }

  return result;
}

function AssigneePendingIndicator() {
  const { pending } = useFormStatus();

  if (!pending) return null;
  return (
    <span className="absolute -right-14 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
      保存中
    </span>
  );
}
