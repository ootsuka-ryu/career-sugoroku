import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const fileArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"));

loadDotEnv(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const xlsxPath = resolveWorkbookPath(fileArg);
const rows = readWorkbook(xlsxPath);
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const existingStudents = await fetchAll(
  "students",
  [
    "id",
    "display_name",
    "real_name",
    "kana",
    "university",
    "grade",
    "graduation_year",
    "email",
    "phone",
    "desired_job_type",
    "desired_area",
    "motivation_rank",
    "first_contact_method",
    "first_contact_date",
    "ai_next_action",
    "manual_next_action",
    "practical_period",
    "candidate_stage",
    "updated_at"
  ].join(", ")
);
const staffUsers = await fetchAll("staff_users", "id, name, email, is_active");
const existingAssignees = await fetchAll("student_assignees", "student_id, staff_id");

const nameMap = buildNameMap(existingStudents);
const searchableStudents = buildSearchableStudents(existingStudents);
const staffBySheetName = buildStaffMap(staffUsers);
const currentAssignees = new Map(existingAssignees.map((row) => [row.student_id, row.staff_id]));

const stats = {
  workbook: xlsxPath,
  sheetRows: rows.length,
  matched: 0,
  updated: 0,
  assigneesInserted: 0,
  assigneesChanged: 0,
  unchanged: 0,
  unmatched: [],
  ambiguous: [],
  staffMissing: new Set(),
  sampleUpdates: []
};

for (const row of rows) {
  const parsedName = parseName(row.name);
  if (!parsedName.realName) continue;

  const matchKey = normalizeNameKey(parsedName.realName);
  const candidates = nameMap.get(matchKey) ?? [];

  if (candidates.length === 0) {
    stats.unmatched.push({
      name: parsedName.realName,
      kana: parsedName.kana || null,
      university: normalizeUniversity(row.university) ?? clean(row.university) || null,
      candidates: findSimilarStudents(parsedName, row, searchableStudents)
    });
    continue;
  }
  if (candidates.length > 1) {
    stats.ambiguous.push({
      name: parsedName.realName,
      candidates: candidates.map((student) => ({
        id: student.id,
        name: student.real_name ?? student.display_name,
        university: student.university
      }))
    });
    continue;
  }

  stats.matched += 1;
  const student = candidates[0];
  const patch = buildStudentPatch(row, parsedName, student);
  const patchKeys = Object.keys(patch);

  let assigneeAction = null;
  const staffId = staffBySheetName.get(normalizeLoose(row.staff));
  if (row.staff && !staffId) stats.staffMissing.add(row.staff);
  if (staffId) {
    const currentStaffId = currentAssignees.get(student.id);
    if (!currentStaffId) {
      assigneeAction = { type: "insert", staffId };
    } else if (currentStaffId !== staffId) {
      assigneeAction = { type: "replace", currentStaffId, staffId };
    }
  }

  if (patchKeys.length === 0 && !assigneeAction) {
    stats.unchanged += 1;
    continue;
  }

  if (stats.sampleUpdates.length < 15) {
    stats.sampleUpdates.push({
      name: parsedName.realName,
      id: student.id,
      patch,
      assigneeAction
    });
  }

  if (!dryRun) {
    if (patchKeys.length > 0) {
      const { error } = await supabase.from("students").update(patch).eq("id", student.id);
      if (error) throw new Error(`${parsedName.realName}: ${error.message}`);
      stats.updated += 1;
    }

    if (assigneeAction?.type === "insert") {
      const { error } = await supabase.from("student_assignees").insert({
        student_id: student.id,
        staff_id: assigneeAction.staffId
      });
      if (error) throw new Error(`${parsedName.realName}: ${error.message}`);
      stats.assigneesInserted += 1;
      currentAssignees.set(student.id, assigneeAction.staffId);
    } else if (assigneeAction?.type === "replace") {
      const { error: deleteError } = await supabase
        .from("student_assignees")
        .delete()
        .eq("student_id", student.id);
      if (deleteError) throw new Error(`${parsedName.realName}: ${deleteError.message}`);
      const { error: insertError } = await supabase.from("student_assignees").insert({
        student_id: student.id,
        staff_id: assigneeAction.staffId
      });
      if (insertError) throw new Error(`${parsedName.realName}: ${insertError.message}`);
      stats.assigneesChanged += 1;
      currentAssignees.set(student.id, assigneeAction.staffId);
    }
  }
}

console.log(
  JSON.stringify(
    {
      ...stats,
      mode: dryRun ? "dry-run" : "import",
      staffMissing: Array.from(stats.staffMissing),
      unmatched: stats.unmatched.slice(0, 80),
      unmatchedCount: stats.unmatched.length,
      ambiguous: stats.ambiguous.slice(0, 20),
      ambiguousCount: stats.ambiguous.length
    },
    null,
    2
  )
);

function buildStudentPatch(row, parsedName, student) {
  const patch = {};

  setIfChanged(patch, student, "real_name", parsedName.realName);
  setIfChanged(patch, student, "display_name", parsedName.realName);
  if (parsedName.kana) setIfChanged(patch, student, "kana", parsedName.kana);

  setIfChanged(patch, student, "university", normalizeUniversity(row.university));
  setIfChanged(patch, student, "graduation_year", 2028);
  setIfChanged(patch, student, "motivation_rank", normalizeRank(row.rank));
  setIfChanged(patch, student, "first_contact_method", clean(row.firstContactMethod));
  setIfChanged(patch, student, "first_contact_date", normalizeDate(row.poolDate));
  setIfChanged(patch, student, "manual_next_action", clean(row.nextAction));
  setIfChanged(patch, student, "ai_next_action", clean(row.aiJudgment));
  setIfChanged(patch, student, "desired_job_type", clean(row.desiredJobType));
  setIfChanged(patch, student, "desired_area", clean(row.desiredArea));
  setIfChanged(patch, student, "email", normalizeEmail(row.email));
  setIfChanged(patch, student, "practical_period", normalizePracticalPeriod(row.practicalInfo));

  return patch;
}

function setIfChanged(patch, student, key, value) {
  const normalized = value === "" ? null : value;
  if (normalized === undefined || normalized === null) return;
  const current = student[key] === "" ? null : student[key];
  if (String(current ?? "") !== String(normalized)) patch[key] = normalized;
}

async function fetchAll(table, select) {
  const pageSize = 1000;
  const all = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return all;
}

function buildNameMap(students) {
  const map = new Map();
  for (const student of students) {
    const names = [student.real_name, student.display_name].filter(Boolean);
    for (const name of names) {
      const key = normalizeNameKey(parseName(name).realName);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      if (!map.get(key).some((candidate) => candidate.id === student.id)) {
        map.get(key).push(student);
      }
    }
  }
  return map;
}

function buildSearchableStudents(students) {
  return students.map((student) => {
    const nameValues = [student.real_name, student.display_name].filter(Boolean);
    const nameKeys = nameValues
      .flatMap((name) => {
        const parsed = parseName(name);
        return [parsed.realName, parsed.kana, name];
      })
      .filter(Boolean)
      .map((name) => normalizeNameKey(name));
    return {
      student,
      nameKeys: Array.from(new Set(nameKeys)),
      kanaKey: normalizeNameKey(student.kana),
      universityKey: normalizeLoose(student.university)
    };
  });
}

function findSimilarStudents(parsedName, row, searchableStudents) {
  const targetName = normalizeNameKey(parsedName.realName);
  const targetKana = normalizeNameKey(parsedName.kana);
  const targetUniversity = normalizeLoose(normalizeUniversity(row.university) ?? row.university);
  const scored = [];

  for (const entry of searchableStudents) {
    const score = scoreStudentCandidate({
      targetName,
      targetKana,
      targetUniversity,
      entry
    });
    if (score <= 0) continue;
    scored.push({
      score,
      id: entry.student.id,
      name: entry.student.real_name ?? entry.student.display_name,
      kana: entry.student.kana ?? null,
      university: entry.student.university ?? null,
      graduation_year: entry.student.graduation_year ?? null
    });
  }

  return scored
    .sort((a, b) => b.score - a.score || String(a.name).localeCompare(String(b.name), "ja"))
    .slice(0, 5);
}

function scoreStudentCandidate({ targetName, targetKana, targetUniversity, entry }) {
  let score = 0;
  const keys = entry.nameKeys.filter(Boolean);

  for (const key of keys) {
    if (!targetName || !key) continue;
    if (key === targetName) score = Math.max(score, 100);
    else if (key.includes(targetName) || targetName.includes(key)) score = Math.max(score, 85);
    else {
      const distance = levenshteinDistance(key, targetName);
      const maxLength = Math.max(key.length, targetName.length);
      const similarity = maxLength === 0 ? 0 : 1 - distance / maxLength;
      if (similarity >= 0.72) score = Math.max(score, Math.round(similarity * 75));
    }
  }

  if (targetKana && entry.kanaKey) {
    if (entry.kanaKey === targetKana) score += 18;
    else if (entry.kanaKey.includes(targetKana) || targetKana.includes(entry.kanaKey)) score += 10;
  }

  if (targetUniversity && entry.universityKey) {
    if (entry.universityKey === targetUniversity) score += 15;
    else if (entry.universityKey.includes(targetUniversity) || targetUniversity.includes(entry.universityKey)) score += 8;
  }

  return score;
}

function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array(b.length + 1);

  for (let i = 0; i < a.length; i += 1) {
    current[0] = i + 1;
    for (let j = 0; j < b.length; j += 1) {
      const cost = a[i] === b[j] ? 0 : 1;
      current[j + 1] = Math.min(
        current[j] + 1,
        previous[j + 1] + 1,
        previous[j] + cost
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}

function buildStaffMap(staffUsers) {
  const map = new Map();
  for (const staff of staffUsers.filter((user) => user.is_active !== false)) {
    map.set(normalizeLoose(staff.name), staff.id);
    if (/otsuka/i.test(staff.name) || /大塚/.test(staff.name)) map.set(normalizeLoose("大塚"), staff.id);
    if (/nakano/i.test(staff.name) || /中野/.test(staff.name)) map.set(normalizeLoose("中野"), staff.id);
  }
  return map;
}

function parseName(value) {
  const raw = clean(value);
  if (!raw) return { realName: "", kana: "" };
  const kanaMatch = raw.match(/[（(]([^）)]+)[）)]/);
  const realName = raw.replace(/[（(][^）)]+[）)]/g, "").replace(/\s+/g, " ").trim();
  return {
    realName,
    kana: kanaMatch ? hiraToKata(kanaMatch[1]).replace(/\s+/g, " ").trim() : ""
  };
}

function normalizeNameKey(value) {
  return normalizeLoose(value)
    .replace(/[（(][^）)]+[）)]/g, "")
    .replace(/[・･]/g, "")
    .replace(/[\s　]/g, "");
}

function normalizeLoose(value) {
  return clean(value).normalize("NFKC").toLowerCase();
}

function clean(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\r\n/g, "\n").trim();
}

function normalizeDate(value) {
  const text = clean(value);
  if (!text) return null;
  const m = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const compact = text.match(/^(\d{4})(\d{2})(\d{2})/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  return null;
}

function normalizeEmail(value) {
  const text = clean(value).replace(/\s+/g, "");
  return text.includes("@") ? text : null;
}

function normalizeRank(value) {
  const text = clean(value);
  if (!text) return null;
  const map = {
    "D体感アリ": "Dアリ",
    "E体感ナシ": "Eナシ",
    "F見送り": "見送り",
    "G返信有→無": "返信有→無"
  };
  return map[text] ?? text;
}

function normalizePracticalPeriod(value) {
  const text = clean(value);
  if (/1\s*,\s*2|1-2|1、2|1期/.test(text)) return "P1_2";
  if (/2\s*,\s*3|2-3|2、3|2期/.test(text)) return "P2_3";
  if (/3\s*,\s*4|3-4|3、4|3期/.test(text)) return "P3_4";
  return null;
}

function getUniversityNames() {
  return [
  "北海道大学",
  "東北大学",
  "千葉大学",
  "東京大学",
  "富山大学",
  "金沢大学",
  "京都大学",
  "大阪大学",
  "岡山大学",
  "広島大学",
  "徳島大学",
  "九州大学",
  "熊本大学",
  "長崎大学",
  "岐阜薬科大学",
  "静岡県立大学",
  "名古屋市立大学",
  "和歌山県立医科大学",
  "山陽小野田市立山口東京理科大学",
  "北海道医療大学",
  "北海道科学大学",
  "青森大学",
  "岩手医科大学",
  "東北医科薬科大学",
  "医療創生大学",
  "奥羽大学",
  "国際医療福祉大学",
  "高崎健康福祉大学",
  "城西大学",
  "日本薬科大学",
  "城西国際大学",
  "千葉科学大学",
  "帝京大学",
  "帝京平成大学",
  "東京理科大学",
  "東邦大学",
  "日本大学",
  "順天堂大学",
  "北里大学",
  "慶應義塾大学",
  "昭和大学",
  "昭和医科大学",
  "昭和薬科大学",
  "東京薬科大学",
  "星薬科大学",
  "武蔵野大学",
  "明治薬科大学",
  "横浜薬科大学",
  "湘南医療大学",
  "新潟薬科大学",
  "北陸大学",
  "岐阜医療科学大学",
  "愛知学院大学",
  "金城学院大学",
  "名城大学",
  "鈴鹿医療科学大学",
  "京都薬科大学",
  "同志社女子大学",
  "立命館大学",
  "大阪大谷大学",
  "大阪医科薬科大学",
  "近畿大学",
  "摂南大学",
  "神戸学院大学",
  "神戸薬科大学",
  "兵庫医科大学",
  "姫路獨協大学",
  "武庫川女子大学",
  "就実大学",
  "広島国際大学",
  "福山大学",
  "安田女子大学",
  "徳島文理大学",
  "徳島文理大学香川薬学部",
  "松山大学",
  "第一薬科大学",
  "福岡大学",
  "国際医療福祉大学福岡薬学部",
  "崇城大学",
  "九州保健福祉大学",
  "長崎国際大学"
  ];
}

var universityByShortName;

function normalizeUniversity(value) {
  const text = clean(value);
  if (!text) return null;
  universityByShortName ??= buildUniversityMap();
  return universityByShortName.get(normalizeLoose(text)) ?? text;
}

function buildUniversityMap() {
  const map = new Map(
    getUniversityNames().flatMap((name) => {
      const base = name
        .replace(/大学$/, "")
        .replace(/医科薬科$/, "医科")
        .replace(/東京理科$/, "東京理科");
      return [
        [normalizeLoose(name), name],
        [normalizeLoose(base), name]
      ];
    })
  );
  map.set(normalizeLoose("山口東京理科"), "山陽小野田市立山口東京理科大学");
  map.set(normalizeLoose("大阪医科"), "大阪医科薬科大学");
  return map;
}

function hiraToKata(value) {
  return clean(value).replace(/[\u3041-\u3096]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) + 0x60)
  );
}

function resolveWorkbookPath(arg) {
  if (arg) return path.resolve(arg);
  const downloads = path.join(os.homedir(), "Downloads");
  const candidates = fs
    .readdirSync(downloads)
    .filter((name) => name.endsWith(".xlsx") && name.includes("(8)") && !name.startsWith("~$"))
    .map((name) => path.join(downloads, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  if (!candidates[0]) throw new Error("Workbook not found in Downloads.");
  return candidates[0];
}

function readWorkbook(filePath) {
  const python = process.env.PYTHON_BIN ?? "C:/Users/HQ0178/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe";
  const code = String.raw`
import json, sys
import openpyxl
from datetime import date, datetime

def cell_value(value):
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(value, date):
        return value.strftime("%Y-%m-%d")
    return str(value)

path = sys.argv[1]
wb = openpyxl.load_workbook(path, data_only=True)
ws = wb.worksheets[0]
rows = []
for row in ws.iter_rows(min_row=3, values_only=True):
    if not row or not row[1]:
        continue
    rows.append({
        "rank": cell_value(row[0] if len(row) > 0 else ""),
        "name": cell_value(row[1] if len(row) > 1 else ""),
        "staff": cell_value(row[2] if len(row) > 2 else ""),
        "university": cell_value(row[3] if len(row) > 3 else ""),
        "homeArea": cell_value(row[4] if len(row) > 4 else ""),
        "firstContactMethod": cell_value(row[5] if len(row) > 5 else ""),
        "firstEvent": cell_value(row[6] if len(row) > 6 else ""),
        "poolDate": cell_value(row[7] if len(row) > 7 else ""),
        "lstepKnown": cell_value(row[8] if len(row) > 8 else ""),
        "next": cell_value(row[9] if len(row) > 9 else ""),
        "himejiTour": cell_value(row[10] if len(row) > 10 else ""),
        "godaiQuest": cell_value(row[11] if len(row) > 11 else ""),
        "companySession": cell_value(row[12] if len(row) > 12 else ""),
        "employeeMeetup": cell_value(row[13] if len(row) > 13 else ""),
        "pharmacistInterview": cell_value(row[14] if len(row) > 14 else ""),
        "isCheck": cell_value(row[15] if len(row) > 15 else ""),
        "nextAction": cell_value(row[16] if len(row) > 16 else ""),
        "aiJudgment": cell_value(row[17] if len(row) > 17 else ""),
        "schedule": cell_value(row[18] if len(row) > 18 else ""),
        "exchangeStaff": cell_value(row[19] if len(row) > 19 else ""),
        "desiredJobType": cell_value(row[20] if len(row) > 20 else ""),
        "desiredArea": cell_value(row[21] if len(row) > 21 else ""),
        "jobStartMonth": cell_value(row[22] if len(row) > 22 else ""),
        "jobEndMonth": cell_value(row[23] if len(row) > 23 else ""),
        "memo": cell_value(row[24] if len(row) > 24 else ""),
        "practicalInfo": cell_value(row[25] if len(row) > 25 else ""),
        "email": cell_value(row[26] if len(row) > 26 else ""),
        "selectionDate": cell_value(row[27] if len(row) > 27 else ""),
        "scholarship": cell_value(row[28] if len(row) > 28 else ""),
        "interviewer": cell_value(row[29] if len(row) > 29 else ""),
        "offer": cell_value(row[30] if len(row) > 30 else "")
    })
print(json.dumps(rows, ensure_ascii=False))
`;
  const result = spawnSync(python, ["-", filePath], {
    input: code,
    encoding: "utf8",
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    maxBuffer: 50 * 1024 * 1024
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || "Failed to read workbook.");
  }
  return JSON.parse(result.stdout);
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (!process.env[key]) process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}
