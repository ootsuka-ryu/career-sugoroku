import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = normalize(new URL(request.url).searchParams.get("q"));
  if (!query) {
    return NextResponse.json({ students: [] });
  }

  const { data, error } = await supabase
    .from("students")
    .select("id, real_name, display_name, kana, university, phone, email, line_user_id, updated_at")
    .limit(1000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const students = (data ?? [])
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
        const normalized = normalize(field);
        if (!normalized) return total;
        if (normalized === query) return total + 4;
        if (normalized.includes(query)) return total + 2;
        return total;
      }, 0);

      return score > 0 ? { ...student, score } : null;
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 20);

  return NextResponse.json({ students });
}

function normalize(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[()\[\]\s　・･\-ー]/g, "");
}
