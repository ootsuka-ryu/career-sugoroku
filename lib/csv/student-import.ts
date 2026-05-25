import { z } from "zod";
import type { PracticalPeriod } from "@/lib/supabase/database.types";

export const studentImportFields = [
  "real_name",
  "kana",
  "university",
  "grade",
  "graduation_year",
  "practical_period",
  "phone",
  "email",
  "desired_job_type",
  "desired_area",
  "motivation_level",
  "first_contact_method",
  "first_contact_date",
  "tags",
  "assigned_staff_email",
  "memo"
] as const;

export type StudentImportField = (typeof studentImportFields)[number];

export const studentImportFieldLabels: Record<StudentImportField, string> = {
  real_name: "氏名",
  kana: "カナ",
  university: "大学",
  grade: "学年",
  graduation_year: "卒業年度",
  practical_period: "実習時期",
  phone: "電話番号",
  email: "メールアドレス",
  desired_job_type: "希望職種",
  desired_area: "希望エリア",
  motivation_level: "志望度",
  first_contact_method: "初回接触経路",
  first_contact_date: "初回接触日",
  tags: "タグ",
  assigned_staff_email: "担当者メール",
  memo: "メモ"
};

export const practicalPeriods = [
  "P1_2",
  "P2_3",
  "P3_4",
  "undecided"
] as const satisfies readonly PracticalPeriod[];

export const studentImportRowSchema = z.object({
  real_name: z.string().trim().min(1, "氏名は必須です"),
  kana: z.string().trim().optional().default(""),
  university: z.string().trim().min(1, "大学は必須です"),
  grade: z.string().trim().optional().default(""),
  graduation_year: z.coerce.number().int().min(2020).max(2040).optional(),
  practical_period: z.enum(practicalPeriods).default("undecided"),
  phone: z.string().trim().optional().default(""),
  email: z.string().trim().email().optional().or(z.literal("")).default(""),
  desired_job_type: z.string().trim().optional().default(""),
  desired_area: z.string().trim().optional().default(""),
  motivation_level: z.coerce.number().int().min(1).max(5).optional(),
  first_contact_method: z.string().trim().optional().default(""),
  first_contact_date: z.string().trim().optional().default(""),
  tags: z.string().trim().optional().default(""),
  assigned_staff_email: z.string().trim().email().optional().or(z.literal("")).default(""),
  memo: z.string().trim().optional().default("")
});

export type StudentImportRow = z.infer<typeof studentImportRowSchema>;

export type ColumnMapping = Partial<Record<StudentImportField, string>>;

export function normalizeHeader(header: string) {
  return header.trim().replace(/^\uFEFF/, "");
}

export function suggestColumnMapping(headers: string[]): ColumnMapping {
  const normalizedHeaders = headers.map(normalizeHeader);
  const mapping: ColumnMapping = {};

  for (const field of studentImportFields) {
    const label = studentImportFieldLabels[field];
    const matchedHeader = normalizedHeaders.find(
      (header) => header === field || header === label
    );

    if (matchedHeader) {
      mapping[field] = matchedHeader;
    }
  }

  return mapping;
}

export function mapRawRowToStudentImportRow(
  rawRow: Record<string, string>,
  mapping: ColumnMapping
) {
  const mapped: Record<string, string> = {};

  for (const field of studentImportFields) {
    const sourceHeader = mapping[field];
    mapped[field] = sourceHeader ? rawRow[sourceHeader] ?? "" : "";
  }

  return studentImportRowSchema.safeParse(mapped);
}

export function buildDuplicateKey(row: Pick<StudentImportRow, "real_name" | "university">) {
  return `${row.real_name.trim()}::${row.university.trim()}`;
}

export function splitTagNames(tags: string) {
  return tags
    .split(/[;,、]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}
