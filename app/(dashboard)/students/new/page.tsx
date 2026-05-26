import Link from "next/link";
import { StudentCreateForm } from "@/components/students/student-create-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { uniqueStaffByDisplayName } from "@/lib/staff/display";
import { createClient } from "@/lib/supabase/server";

export default async function NewStudentPage() {
  const supabase = createClient() as any;
  const [staffResult, tagsResult] = await Promise.all([
    supabase
      .from("staff_users")
      .select("id, name, email")
      .eq("is_active", true)
      .order("name"),
    supabase.from("tags").select("id, name, color").order("name")
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge variant="accent">Step 3</Badge>
          <h1 className="mt-3 text-2xl font-semibold tracking-normal">
            新規学生登録
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            LINE未連携の学生も、手入力で先に登録できます。
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/students">学生一覧へ戻る</Link>
        </Button>
      </div>

      <StudentCreateForm
        staffUsers={uniqueStaffByDisplayName(staffResult.data ?? [])}
        tags={tagsResult.data ?? []}
      />
    </div>
  );
}
