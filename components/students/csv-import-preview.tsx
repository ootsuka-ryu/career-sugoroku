"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  mapRawRowToStudentImportRow,
  splitTagNames,
  studentImportFieldLabels,
  studentImportFields,
  suggestColumnMapping,
  type ColumnMapping
} from "@/lib/csv/student-import";

type CsvRow = Record<string, string>;

export function CsvImportPreview() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [fileName, setFileName] = useState("");

  const preview = useMemo(
    () =>
      rows.slice(0, 20).map((row, index) => {
        const result = mapRawRowToStudentImportRow(row, mapping);
        return {
          index: index + 1,
          raw: row,
          result
        };
      }),
    [mapping, rows]
  );

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const parsed = parseCsv(text);
    setFileName(file.name);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setMapping(suggestColumnMapping(parsed.headers));
  }

  function updateMapping(field: keyof ColumnMapping, sourceHeader: string) {
    setMapping((current) => ({
      ...current,
      [field]: sourceHeader || undefined
    }));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            CSVファイルを確認
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            accept=".csv,text/csv"
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            onChange={handleFileChange}
            type="file"
          />
          <p className="text-sm text-muted-foreground">
            取り込むCSVの列を、学生情報のどの項目に反映するか確認します。
            氏名が近い学生は候補として照合され、未一致の行は確認できます。
          </p>
          {fileName ? (
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="secondary">{fileName}</Badge>
              <Badge variant="outline">{rows.length}行</Badge>
              <Badge variant="outline">{headers.length}列</Badge>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {headers.length > 0 ? (
        <section className="grid gap-4 xl:grid-cols-[0.45fr_0.55fr]">
          <Card>
            <CardHeader>
              <CardTitle>列の対応</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {studentImportFields.map((field) => (
                <label className="grid gap-2 text-sm" key={field}>
                  <span className="font-medium">{studentImportFieldLabels[field]}</span>
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    onChange={(event) => updateMapping(field, event.target.value)}
                    value={mapping[field] ?? ""}
                  >
                    <option value="">対応なし</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>先頭20行の確認</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {preview.map((item) => (
                <div className="rounded-md border p-3 text-sm" key={item.index}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">行 {item.index}</p>
                    {item.result.success ? (
                      <Badge variant="accent">
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        OK
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <AlertCircle className="mr-1 h-3.5 w-3.5" />
                        要確認
                      </Badge>
                    )}
                  </div>
                  {item.result.success ? (
                    <p className="mt-2 text-muted-foreground">
                      {item.result.data.real_name} / {item.result.data.university} / タグ{" "}
                      {splitTagNames(item.result.data.tags).join(", ") || "-"}
                    </p>
                  ) : (
                    <p className="mt-2 text-destructive">
                      {item.result.error.errors[0]?.message}
                    </p>
                  )}
                </div>
              ))}
              <Button disabled variant="outline">
                取り込み実行は、照合結果を確認してから行います
              </Button>
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}

function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(lines[0] ?? "");
  const rows = lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });

  return { headers, rows };
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}
