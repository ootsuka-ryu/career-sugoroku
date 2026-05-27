export type LStepSurveyImportRow = {
  rowNumber: number;
  responseId: string;
  responseDate: string;
  respondentId: string;
  respondentName: string;
  name: string;
  kana: string;
  phone: string;
  email: string;
  graduationYear: number | null;
  graduationYearText: string;
  universityType: string;
  university: string;
  answers: Array<{
    header: string;
    value: string;
  }>;
};

type ParsedCsv = {
  headers: string[];
  rows: string[][];
};

export function parseLStepSurveyCsv(text: string): LStepSurveyImportRow[] {
  const parsed = parseCsv(text);

  return parsed.rows
    .map((row, index) => mapRow(parsed.headers, row, index + 2))
    .filter((row) => row.name || row.respondentName || row.responseId);
}

export function normalizeNameForMatch(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\s\u3000]/g, "")
    .trim()
    .toLowerCase();
}

export function buildLStepSurveyNote(row: LStepSurveyImportRow, importedAt = new Date()) {
  const title = `[LステップCSV取込 ${formatDateTime(importedAt)}]`;
  const lines = [
    title,
    row.responseDate ? `回答日時: ${row.responseDate}` : "",
    row.responseId ? `回答ID: ${row.responseId}` : "",
    row.respondentName ? `回答者名: ${row.respondentName}` : "",
    "",
    "回答内容:",
    ...row.answers.map((answer) => `- ${answer.header}: ${answer.value}`)
  ].filter(Boolean);

  return lines.join("\n");
}

export function buildLStepSurveyActionBody(row: LStepSurveyImportRow) {
  const importantAnswers = row.answers
    .filter((answer) =>
      [
        "氏名",
        "氏名のふりがな",
        "電話番号",
        "メールアドレス",
        "卒業年",
        "在籍している（していた）大学の種類",
        "国立大学一覧",
        "公立大学一覧",
        "私立大学一覧"
      ].includes(answer.header)
    )
    .map((answer) => `- ${answer.header}: ${answer.value}`);

  return [
    row.responseDate ? `回答日時: ${row.responseDate}` : "",
    row.responseId ? `回答ID: ${row.responseId}` : "",
    ...importantAnswers
  ]
    .filter(Boolean)
    .join("\n");
}

function mapRow(headers: string[], row: string[], rowNumber: number): LStepSurveyImportRow {
  const name = getFirst(headers, row, "氏名");
  const kana = getFirst(headers, row, "氏名のふりがな");
  const graduationYearText = getFirst(headers, row, "卒業年");
  const universityType = getFirst(headers, row, "在籍している（していた）大学の種類");
  const university = pickUniversity(headers, row, universityType);

  return {
    rowNumber,
    responseId: getFirst(headers, row, "回答ID"),
    responseDate: getFirst(headers, row, "回答日時"),
    respondentId: getFirst(headers, row, "回答者ID"),
    respondentName: getFirst(headers, row, "回答者名"),
    name,
    kana,
    phone: getFirst(headers, row, "電話番号"),
    email: getFirst(headers, row, "メールアドレス"),
    graduationYear: parseGraduationYear(graduationYearText),
    graduationYearText,
    universityType,
    university,
    answers: headers
      .map((header, index) => ({
        header: duplicateAwareHeader(headers, header, index),
        value: (row[index] ?? "").trim()
      }))
      .filter((answer) => answer.value)
  };
}

function pickUniversity(headers: string[], row: string[], universityType: string) {
  const national = getFirst(headers, row, "国立大学一覧");
  const publicUniversity = getFirst(headers, row, "公立大学一覧");
  const privateUniversity = getFirst(headers, row, "私立大学一覧");
  const otherValues = getAll(headers, row, "その他(記述)");
  const candidatesByType =
    universityType === "国立"
      ? [national, ...otherValues, publicUniversity, privateUniversity]
      : universityType === "公立"
        ? [publicUniversity, ...otherValues, national, privateUniversity]
        : universityType === "私立"
          ? [privateUniversity, ...otherValues, national, publicUniversity]
          : [national, publicUniversity, privateUniversity, ...otherValues];

  return candidatesByType.find(Boolean) ?? "";
}

function parseGraduationYear(value: string) {
  const match = value.match(/20\d{2}/);
  return match ? Number(match[0]) : null;
}

function getFirst(headers: string[], row: string[], headerName: string) {
  const index = headers.findIndex((header) => header === headerName);
  return index >= 0 ? (row[index] ?? "").trim() : "";
}

function getAll(headers: string[], row: string[], headerName: string) {
  return headers
    .map((header, index) => (header === headerName ? (row[index] ?? "").trim() : ""))
    .filter(Boolean);
}

function duplicateAwareHeader(headers: string[], header: string, index: number) {
  const sameHeaderIndexes = headers
    .map((candidate, candidateIndex) => (candidate === header ? candidateIndex : -1))
    .filter((candidateIndex) => candidateIndex >= 0);

  if (sameHeaderIndexes.length <= 1) return header;

  const occurrence = sameHeaderIndexes.findIndex((candidateIndex) => candidateIndex === index) + 1;
  return `${header} ${occurrence}`;
}

function parseCsv(text: string): ParsedCsv {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;
  const normalizedText = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < normalizedText.length; index += 1) {
    const char = normalizedText[index];
    const next = normalizedText[index + 1];

    if (char === '"' && next === '"') {
      currentCell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      currentRow.push(currentCell.trim());
      currentCell = "";
      if (currentRow.some((cell) => cell.length > 0)) rows.push(currentRow);
      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell.trim());
  if (currentRow.some((cell) => cell.length > 0)) rows.push(currentRow);

  const [headers = [], ...dataRows] = rows;
  return {
    headers,
    rows: dataRows
  };
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}
