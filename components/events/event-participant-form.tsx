"use client";

import { useMemo, useState } from "react";
import { addEventParticipant } from "@/app/(dashboard)/events/actions";
import {
  StudentCascadePicker,
  type StudentCascadeOption
} from "@/components/students/student-cascade-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EventParticipantForm({
  eventId,
  students,
  statuses
}: {
  eventId: string;
  students: StudentCascadeOption[];
  statuses: string[];
}) {
  const firstStudentId = students[0]?.id ?? "";
  const [studentId, setStudentId] = useState(firstStudentId);
  const normalizedStudents = useMemo(() => students, [students]);
  const defaultStatus = statuses[0] ?? "参加";

  return (
    <form action={addEventParticipant} className="grid gap-2 md:grid-cols-[1fr_140px_1fr_auto]">
      <input name="event_id" type="hidden" value={eventId} />
      <input name="student_id" type="hidden" value={studentId} />
      <StudentCascadePicker
        students={normalizedStudents}
        value={studentId}
        onChange={setStudentId}
      />
      <select
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        name="status"
        defaultValue={defaultStatus}
      >
        {statuses.map((status) => (
          <option key={status}>{status}</option>
        ))}
      </select>
      <Input name="memo" placeholder="メモ" />
      <Button disabled={!studentId} type="submit" variant="outline">
        参加者追加
      </Button>
    </form>
  );
}
