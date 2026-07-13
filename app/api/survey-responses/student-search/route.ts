import { NextResponse } from "next/server";
import {
  buildJapaneseSearchIndex,
  matchesJapaneseSearchQuery,
  normalizeJapaneseSearchText
} from "@/lib/search/japanese";
import { createClient } from "@/lib/supabase/server";

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

  const rawQuery = new URL(request.url).searchParams.get("q") ?? "";
  const query = normalizeJapaneseSearchText(rawQuery);
  if (!query) {
    return NextResponse.json({ students: [] });
  }

  const selectColumns = "id, real_name, display_name, kana, university, phone, email, line_user_id, updated_at";
  const dbQuery = normalizeDbSearchQuery(rawQuery);
  const [directResult, sampleResult] = await Promise.all([
    dbQuery
      ? supabase
          .from("students")
          .select(selectColumns)
          .or(
            [
              "real_name",
              "display_name",
              "kana",
              "university",
              "phone",
              "email",
              "line_user_id"
            ]
              .map((column) => `${column}.ilike.%${dbQuery}%`)
              .join(",")
          )
          .order("updated_at", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("students")
      .select(selectColumns)
      .order("updated_at", { ascending: false })
      .limit(1000)
  ]);

  const error = directResult.error ?? sampleResult.error;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const directIds = new Set((directResult.data ?? []).map((student: any) => student.id));
  const candidates = Array.from(
    new Map(
      [...(directResult.data ?? []), ...(sampleResult.data ?? [])].map((student: any) => [
        student.id,
        student
      ])
    ).values()
  );

  const students = candidates
    .map((student: any) => {
      const fields = [
        student.real_name,
        student.display_name,
        student.kana,
        student.university,
        student.phone,
        student.email,
        student.line_user_id
      ];
      const score = fields.reduce((total, field) => {
        const normalized = buildJapaneseSearchIndex([field]);
        if (!normalized) return total;
        if (normalized === query) return total + 4;
        if (matchesJapaneseSearchQuery(normalized, rawQuery)) return total + 2;
        return total;
      }, directIds.has(student.id) ? 1 : 0);

      return score > 0 ? { ...student, score } : null;
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 20);

  return NextResponse.json({ students });
}

function normalizeDbSearchQuery(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/[%_*\\,()]/g, " ")
    .replace(/\s+/g, " ");
}
