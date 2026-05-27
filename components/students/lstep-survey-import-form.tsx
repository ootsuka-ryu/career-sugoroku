"use client";

import { useFormState, useFormStatus } from "react-dom";
import { FileUp, Loader2 } from "lucide-react";
import {
  importLStepSurveyCsv,
  type LStepSurveyImportState
} from "@/app/(dashboard)/students/import/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: LStepSurveyImportState = {
  ok: false,
  message: "",
  totalRows: 0,
  updatedRows: 0,
  rows: [],
  warnings: []
};

const statusLabels: Record<LStepSurveyImportState["rows"][number]["status"], string> = {
  updated: "反映済み",
  unmatched: "未一致",
  ambiguous: "要確認",
  error: "エラー"
};

export function LStepSurveyImportForm() {
  const [state, action] = useFormState(importLStepSurveyCsv, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileUp className="h-5 w-5 text-primary" />
          Lステップ回答CSVを学生情報に反映
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Lステップの回答CSVをアップロードすると、氏名が一致する学生に電話番号・メール・大学・卒業年を反映し、回答内容を備考欄と履歴に残します。
        </p>
        <form action={action} className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            accept=".csv,text/csv"
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            name="csv_file"
            required
            type="file"
          />
          <SubmitButton />
        </form>

        {state.message ? (
          <div
            className={
              state.ok
                ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                : "rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            }
          >
            {state.message}
          </div>
        ) : null}

        {state.warnings.length > 0 ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {state.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}

        {state.rows.length > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="secondary">対象 {state.totalRows}件</Badge>
              <Badge variant="accent">反映 {state.updatedRows}件</Badge>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/70 text-left text-muted-foreground">
                  <tr>
                    <th className="whitespace-nowrap px-3 py-2">行</th>
                    <th className="whitespace-nowrap px-3 py-2">氏名</th>
                    <th className="whitespace-nowrap px-3 py-2">状態</th>
                    <th className="min-w-[280px] px-3 py-2">内容</th>
                  </tr>
                </thead>
                <tbody>
                  {state.rows.map((row) => (
                    <tr className="border-t" key={`${row.rowNumber}-${row.name}`}>
                      <td className="whitespace-nowrap px-3 py-2">{row.rowNumber}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-medium">{row.name}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <Badge
                          variant={row.status === "updated" ? "accent" : "outline"}
                        >
                          {statusLabels[row.status]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{row.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="h-10" disabled={pending} type="submit">
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <FileUp className="mr-2 h-4 w-4" />
      )}
      取り込む
    </Button>
  );
}
