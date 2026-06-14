import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const fields = ["real_name", "university", "line_user_id", "phone", "email"] as const;

export async function GET(request: Request) {
  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "ログイン状態を確認できませんでした。再ログインしてください。" },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const input = Object.fromEntries(
    fields.map((field) => [field, normalize(url.searchParams.get(field))])
  ) as Record<(typeof fields)[number], string>;
  const excludeId = url.searchParams.get("exclude_id");

  const { data, error } = await supabase
    .from("students")
    .select("id, real_name, display_name, university, line_user_id, phone, email, updated_at")
    .limit(1000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const matches = (data ?? [])
    .filter((student: any) => student.id !== excludeId)
    .map((student: any) => {
      const matchedFields: string[] = [];
      if (input.line_user_id && normalize(student.line_user_id) === input.line_user_id) matchedFields.push("LINE ID");
      if (input.phone && normalizePhone(student.phone) === normalizePhone(input.phone)) matchedFields.push("電話番号");
      if (input.email && normalize(student.email) === input.email) matchedFields.push("メール");
      if (
        input.real_name &&
        input.university &&
        normalize(student.real_name) === input.real_name &&
        normalize(student.university) === input.university
      ) {
        matchedFields.push("氏名＋大学");
      }

      return matchedFields.length > 0
        ? {
            id: student.id,
            name: student.real_name ?? student.display_name ?? "名前未登録",
            university: student.university,
            matched_fields: matchedFields,
            updated_at: student.updated_at
          }
        : null;
    })
    .filter(Boolean);

  return NextResponse.json({ matches });
}

function normalize(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function normalizePhone(value: string | null | undefined) {
  return String(value ?? "").replace(/[^\d]/g, "");
}
