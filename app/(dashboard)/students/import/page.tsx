import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LStepSurveyImportForm } from "@/components/students/lstep-survey-import-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function StudentImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <Button asChild className="mb-4" size="sm" variant="ghost">
          <Link href="/students">
            <ArrowLeft className="mr-2 h-4 w-4" />
            学生一覧へ
          </Link>
        </Button>
        <Badge variant="accent">Step 3</Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">
          CSVインポート
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Lステップの回答CSVを取り込み、氏名が一致する学生情報へ反映します。
        </p>
      </div>
      <LStepSurveyImportForm />
    </div>
  );
}
