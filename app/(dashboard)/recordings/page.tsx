import { Mic } from "lucide-react";
import { RecordingConsole } from "@/components/recordings/recording-console";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function RecordingsPage({
  searchParams
}: {
  searchParams?: { studentId?: string };
}) {
  const supabase = createClient();
  const [studentsResult, recordingsResult] = await Promise.all([
    supabase
      .from("students")
      .select("id, display_name, real_name, kana, university, graduation_year")
      .order("updated_at", { ascending: false }),
    supabase
      .from("recordings")
      .select(
        "id, student_id, source, audio_url, duration_sec, transcript, ai_summary, ai_next_action, recorded_at, students(id, display_name, real_name, kana, university, graduation_year)"
      )
      .order("recorded_at", { ascending: false })
      .limit(50)
  ]);

  const students = (studentsResult.data ?? []).map((student: any) => ({
    id: student.id,
    name: student.real_name || student.display_name || "名前未設定",
    kana: student.kana,
    university: student.university,
    graduationYear: student.graduation_year
  }));

  const recordings = (recordingsResult.data ?? []).map((recording: any) => {
    const student = normalizeJoinedStudent(recording.students);
    return {
      id: recording.id,
      student_id: recording.student_id,
      source: recording.source,
      audio_url: recording.audio_url,
      duration_sec: recording.duration_sec,
      transcript: recording.transcript,
      ai_summary: recording.ai_summary,
      ai_next_action: recording.ai_next_action,
      recorded_at: recording.recorded_at,
      student: student
        ? {
            id: student.id,
            name: student.real_name || student.display_name || "名前未設定",
            kana: student.kana,
            university: student.university,
            graduationYear: student.graduation_year
          }
        : null
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="accent">Step 7</Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">
          AI/録音
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          面談音声を保存し、文字起こし・AI要約・次アクション提案を学生情報に反映します。
        </p>
      </div>

      {(studentsResult.error || recordingsResult.error) && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Mic className="h-5 w-5" />
              録音データ取得エラー
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-destructive">
            <p>{studentsResult.error?.message}</p>
            <p>{recordingsResult.error?.message}</p>
          </CardContent>
        </Card>
      )}

      <RecordingConsole
        defaultStudentId={searchParams?.studentId}
        recordings={recordings}
        students={students}
      />
    </div>
  );
}

function normalizeJoinedStudent(value: any) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
