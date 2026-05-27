"use server";

import { revalidatePath } from "next/cache";
import {
  buildLStepSurveyActionBody,
  buildLStepSurveyNote,
  normalizeNameForMatch,
  parseLStepSurveyCsv,
  type LStepSurveyImportRow
} from "@/lib/csv/lstep-survey-import";
import { createClient } from "@/lib/supabase/server";

export type LStepSurveyImportResultRow = {
  rowNumber: number;
  name: string;
  status: "updated" | "unmatched" | "ambiguous" | "error";
  message: string;
};

export type LStepSurveyImportState = {
  ok: boolean;
  message: string;
  totalRows: number;
  updatedRows: number;
  rows: LStepSurveyImportResultRow[];
  warnings: string[];
};

const initialImportState: LStepSurveyImportState = {
  ok: false,
  message: "",
  totalRows: 0,
  updatedRows: 0,
  rows: [],
  warnings: []
};

type StudentForMatch = {
  id: string;
  real_name: string | null;
  display_name: string | null;
};

export async function importLStepSurveyCsv(
  _prevState: LStepSurveyImportState = initialImportState,
  formData: FormData
): Promise<LStepSurveyImportState> {
  const file = formData.get("csv_file");
  if (!(file instanceof File) || file.size === 0) {
    return {
      ...initialImportState,
      message: "Lステップの回答CSVファイルを選択してください。"
    };
  }

  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ...initialImportState,
      message: "ログインが必要です。"
    };
  }

  const text = await file.text();
  const rows = parseLStepSurveyCsv(text);
  if (rows.length === 0) {
    return {
      ...initialImportState,
      message: "取り込める回答行が見つかりませんでした。"
    };
  }

  let students: StudentForMatch[];
  try {
    students = await fetchAllStudents(supabase);
  } catch (error) {
    return {
      ...initialImportState,
      totalRows: rows.length,
      message:
        error instanceof Error
          ? `学生情報を取得できませんでした: ${error.message}`
          : "学生情報を取得できませんでした。"
    };
  }
  const studentMap = buildStudentNameMap(students);
  const importedAt = new Date();
  const results: LStepSurveyImportResultRow[] = [];
  const warnings = new Set<string>();

  for (const row of rows) {
    const result = await importOneRow({
      row,
      studentMap,
      supabase,
      staffId: user.id,
      importedAt
    });

    if (result.warning) warnings.add(result.warning);
    results.push(result.result);
  }

  const updatedRows = results.filter((row) => row.status === "updated").length;

  if (updatedRows > 0) {
    revalidatePath("/students");
  }

  return {
    ok: updatedRows > 0,
    message:
      updatedRows > 0
        ? `${updatedRows}件の回答を学生情報に反映しました。`
        : "学生情報に反映できた回答はありませんでした。",
    totalRows: rows.length,
    updatedRows,
    rows: results,
    warnings: Array.from(warnings)
  };
}

async function importOneRow({
  row,
  studentMap,
  supabase,
  staffId,
  importedAt
}: {
  row: LStepSurveyImportRow;
  studentMap: Map<string, StudentForMatch[]>;
  supabase: any;
  staffId: string;
  importedAt: Date;
}): Promise<{ result: LStepSurveyImportResultRow; warning?: string }> {
  const matchKey = normalizeNameForMatch(row.name || row.respondentName);
  if (!matchKey) {
    return {
      result: {
        rowNumber: row.rowNumber,
        name: row.name || row.respondentName || "-",
        status: "unmatched",
        message: "氏名が空のため照合できませんでした。"
      }
    };
  }

  const matches = studentMap.get(matchKey) ?? [];
  if (matches.length === 0) {
    return {
      result: {
        rowNumber: row.rowNumber,
        name: row.name,
        status: "unmatched",
        message: "同じ氏名の学生が見つかりませんでした。"
      }
    };
  }

  if (matches.length > 1) {
    return {
      result: {
        rowNumber: row.rowNumber,
        name: row.name,
        status: "ambiguous",
        message: "同じ氏名の学生が複数いるため、自動連携を止めました。"
      }
    };
  }

  const student = matches[0];
  const profilePayload = buildStudentUpdatePayload(row);
  const { error: updateError } = await supabase
    .from("students")
    .update(profilePayload)
    .eq("id", student.id);

  if (updateError) {
    return {
      result: {
        rowNumber: row.rowNumber,
        name: row.name,
        status: "error",
        message: updateError.message
      }
    };
  }

  const noteResult = await appendStudentNote(supabase, student.id, buildLStepSurveyNote(row, importedAt));
  await supabase.from("student_actions").insert({
    student_id: student.id,
    staff_id: staffId,
    action_type: "note",
    title: "Lステップ回答CSVを取込",
    body: buildLStepSurveyActionBody(row) || null,
    executed_at: importedAt.toISOString()
  });

  revalidatePath(`/students/${student.id}`);

  return {
    result: {
      rowNumber: row.rowNumber,
      name: row.name,
      status: "updated",
      message: noteResult.ok
        ? "学生プロフィールと備考欄に反映しました。"
        : "学生プロフィールに反映しました。備考欄はSupabaseのnotes列が未反映の可能性があります。"
    },
    warning: noteResult.ok
      ? undefined
      : "備考欄への追記に失敗した行があります。Supabaseで students.notes 列が作成済みか確認してください。"
  };
}

function buildStudentUpdatePayload(row: LStepSurveyImportRow) {
  const payload: Record<string, unknown> = {};

  if (row.name) {
    payload.real_name = row.name;
    payload.display_name = row.name;
  }
  if (row.kana) payload.kana = row.kana;
  if (row.phone) payload.phone = row.phone;
  if (row.email) payload.email = row.email;
  if (row.university) payload.university = row.university;
  if (row.graduationYear) payload.graduation_year = row.graduationYear;

  return payload;
}

async function appendStudentNote(supabase: any, studentId: string, note: string) {
  const { data, error } = await supabase
    .from("students")
    .select("notes")
    .eq("id", studentId)
    .maybeSingle();

  if (error) return { ok: false };

  const currentNotes = typeof data?.notes === "string" ? data.notes.trim() : "";
  const nextNotes = currentNotes ? `${currentNotes}\n\n${note}` : note;
  const { error: updateError } = await supabase
    .from("students")
    .update({ notes: nextNotes })
    .eq("id", studentId);

  return { ok: !updateError };
}

async function fetchAllStudents(supabase: any) {
  const students: StudentForMatch[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("students")
      .select("id,real_name,display_name")
      .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);
    students.push(...((data ?? []) as StudentForMatch[]));
    if (!data || data.length < pageSize) break;
  }

  return students;
}

function buildStudentNameMap(students: StudentForMatch[]) {
  const map = new Map<string, StudentForMatch[]>();

  for (const student of students) {
    const keys = new Set(
      [student.real_name, student.display_name]
        .filter((value): value is string => Boolean(value))
        .map(normalizeNameForMatch)
        .filter(Boolean)
    );

    for (const key of Array.from(keys)) {
      const current = map.get(key) ?? [];
      map.set(key, [...current, student]);
    }
  }

  return map;
}
