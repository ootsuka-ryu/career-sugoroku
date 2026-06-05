import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const csvPathArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const csvPath =
  csvPathArg ?? "C:/Users/HQ0178/Downloads/member_202606051547_20260605154735.csv";

loadDotEnv(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const text = new TextDecoder("shift_jis").decode(fs.readFileSync(csvPath));
const rows = parseCsv(text);
const tagIds = rows[0] ?? [];
const headers = rows[1] ?? [];
const dataRows = rows.slice(2);

const idx = indexMap(headers);
const tagColumns = tagIds
  .map((tagId, index) => ({
    index,
    tagId,
    name: headers[index]?.trim() ?? ""
  }))
  .filter((column) => column.tagId.startsWith("タグ_") && column.name);

const universityNames = new Set([
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
]);

const graduationTags = new Set(["25卒", "26卒", "27卒", "28卒", "29卒", "30卒", "31卒", "32卒", "既卒"]);

const parsedMembers = dataRows
  .map((row) => mapMember(row))
  .filter((member) => member.lstepId && (member.realName || member.displayName));

const existingStudents = await fetchAll("students", "id, display_name, real_name, kana, university, graduation_year, phone, email, first_contact_method, first_contact_date");
const existingTags = await fetchAll("tags", "id, name");
const existingActions = await fetchAll("student_actions", "id, student_id, title, body");

const studentsByKey = new Map();
for (const student of existingStudents) {
  for (const key of studentKeys(student)) {
    if (!studentsByKey.has(key)) studentsByKey.set(key, student);
  }
}

const tagIdByName = new Map(existingTags.map((tag) => [tag.name, tag.id]));
const studentIdByLStepId = new Map(
  existingActions
    .filter((action) => action.title === "Lステップ友だち情報インポート" && action.body)
    .map((action) => [extractLStepId(action.body), action.student_id])
    .filter(([lstepId]) => lstepId)
);
const studentById = new Map(existingStudents.map((student) => [student.id, student]));
const existingLStepNotes = new Set(
  existingActions
    .filter((action) => action.title === "Lステップ友だち情報インポート" && action.body)
    .map((action) => `${action.student_id}:${extractLStepId(action.body)}`)
    .filter((key) => !key.endsWith(":"))
);

let created = 0;
let updated = 0;
let linkedTags = 0;
let actionsInserted = 0;
let tagsCreated = 0;
let skipped = 0;

const allTagNames = new Set();
for (const member of parsedMembers) {
  for (const tag of member.tags) allTagNames.add(tag);
}

if (!dryRun) {
  for (const tagName of allTagNames) {
    if (tagIdByName.has(tagName)) continue;
    const { data, error } = await supabase
      .from("tags")
      .insert({ name: tagName, color: colorForTag(tagName) })
      .select("id, name")
      .single();
    if (error) throw new Error(`Failed to create tag ${tagName}: ${error.message}`);
    tagIdByName.set(data.name, data.id);
    tagsCreated += 1;
  }
}

for (const member of parsedMembers) {
  const matched = findExistingStudent(member, studentsByKey);
  const studentPayload = buildStudentPayload(member, matched);
  let studentId = matched?.id;

  if (dryRun) {
    if (matched) updated += 1;
    else created += 1;
    linkedTags += member.tags.length;
    continue;
  }

  if (matched) {
    const { error } = await supabase.from("students").update(studentPayload).eq("id", matched.id);
    if (error) throw new Error(`Failed to update ${member.realName}: ${error.message}`);
    updated += 1;
  } else {
    const { data, error } = await supabase
      .from("students")
      .insert(studentPayload)
      .select("id, display_name, real_name, kana, university, graduation_year, phone, email, first_contact_method, first_contact_date")
      .single();
    if (error) throw new Error(`Failed to create ${member.realName}: ${error.message}`);
    studentId = data.id;
    created += 1;
    for (const key of studentKeys(data)) studentsByKey.set(key, data);
  }

  if (!studentId) {
    skipped += 1;
    continue;
  }

  const pairs = member.tags
    .map((tagName) => tagIdByName.get(tagName))
    .filter(Boolean)
    .map((tag_id) => ({ student_id: studentId, tag_id }));
  if (pairs.length) {
    const { error } = await supabase.from("student_tags").upsert(pairs, {
      onConflict: "student_id,tag_id",
      ignoreDuplicates: true
    });
    if (error) throw new Error(`Failed to link tags for ${member.realName}: ${error.message}`);
    linkedTags += pairs.length;
  }

  const actionKey = `${studentId}:${member.lstepId}`;
  if (!existingLStepNotes.has(actionKey)) {
    const { error } = await supabase.from("student_actions").insert({
      student_id: studentId,
      action_type: "note",
      title: "Lステップ友だち情報インポート",
      body: buildActionBody(member),
      executed_at: new Date().toISOString()
    });
    if (error) throw new Error(`Failed to save action for ${member.realName}: ${error.message}`);
    actionsInserted += 1;
    existingLStepNotes.add(actionKey);
  }
}

console.log(
  JSON.stringify(
    {
      dryRun,
      csvPath,
      totalCsvDataRows: dataRows.length,
      parsedMembers: parsedMembers.length,
      existingStudents: existingStudents.length,
      created,
      updated,
      skipped,
      uniqueTagsInCsv: allTagNames.size,
      tagsCreated,
      tagLinksAttempted: linkedTags,
      actionsInserted
    },
    null,
    2
  )
);

function mapMember(row) {
  const tags = tagColumns
    .filter((column) => truthyCell(row[column.index]))
    .map((column) => column.name);
  const university = tags.find((tag) => universityNames.has(tag)) ?? "";
  const graduationTag = tags.find((tag) => graduationTags.has(tag)) ?? "";
  const realName =
    cell(row, idx["本名"]) ||
    cell(row, idx["システム表示名"]) ||
    cell(row, idx["LINE登録名"]) ||
    cell(row, idx["表示名"]);
  const displayName = cell(row, idx["システム表示名"]) || realName;
  const firstContactDate = parseDate(cell(row, idx["友だち追加日時"]));

  return {
    lstepId: cell(row, idx.ID),
    displayName,
    lineRegisteredName: cell(row, idx["LINE登録名"]),
    realName,
    systemDisplayName: cell(row, idx["システム表示名"]),
    statusMessage: cell(row, idx["ステータスメッセージ"]),
    supportMark: cell(row, idx["対応マーク"]),
    friendAddedAt: cell(row, idx["友だち追加日時"]),
    memo: cell(row, idx["個別メモ"]),
    visibility: cell(row, idx["表示状態"]),
    userBlocked: cell(row, idx["ユーザーブロック"]),
    lastMessage: cell(row, idx["最終メッセージ"]),
    lastMessageAt: cell(row, idx["最終メッセージ日時"]),
    scenario: cell(row, idx["購読中シナリオ"]),
    scenarioDays: cell(row, idx["シナリオ日数"]),
    email: cell(row, idx["メールアドレス"]),
    phone: cell(row, idx["電話番号"]),
    homePrefecture: cell(row, idx["出身都道府県"]),
    university,
    graduationYear: parseGraduationYear(graduationTag),
    firstContactDate,
    tags
  };
}

function buildStudentPayload(member, matched) {
  return {
    display_name: member.displayName || null,
    real_name: member.realName || member.displayName || null,
    university: member.university || matched?.university || null,
    graduation_year: member.graduationYear ?? matched?.graduation_year ?? null,
    phone: member.phone || matched?.phone || null,
    email: member.email || matched?.email || null,
    desired_area: member.homePrefecture || null,
    first_contact_method: matched?.first_contact_method || "Lステップ友だちリスト",
    first_contact_date: matched?.first_contact_date || member.firstContactDate || null,
    status: "active"
  };
}

function buildActionBody(member) {
  return [
    `Lステップ登録ID: ${member.lstepId}`,
    member.friendAddedAt ? `友だち追加日時: ${member.friendAddedAt}` : "",
    member.lineRegisteredName ? `LINE登録名: ${member.lineRegisteredName}` : "",
    member.systemDisplayName ? `システム表示名: ${member.systemDisplayName}` : "",
    member.university ? `大学: ${member.university}` : "",
    member.graduationYear ? `卒業年度: ${member.graduationYear}` : "",
    member.phone ? `電話番号: ${member.phone}` : "",
    member.email ? `メール: ${member.email}` : "",
    member.homePrefecture ? `出身都道府県: ${member.homePrefecture}` : "",
    member.lastMessageAt || member.lastMessage
      ? `Lステップ最終メッセージ: ${member.lastMessageAt} ${member.lastMessage}`.trim()
      : "",
    member.memo ? `個別メモ:\n${member.memo}` : "",
    member.tags.length ? `タグ:\n${member.tags.join(" / ")}` : "",
    "※LステップCSV由来のため、アプリ側LINE未連携として扱う。返信なし判定には使わない。"
  ]
    .filter(Boolean)
    .join("\n");
}

function findExistingStudent(member, studentsByKey) {
  const studentId = studentIdByLStepId.get(member.lstepId);
  if (studentId) {
    const student = studentById.get(studentId);
    if (student) return student;
  }

  for (const key of memberKeys(member)) {
    const student = studentsByKey.get(key);
    if (student) return student;
  }
  return null;
}

function memberKeys(member) {
  return [
    member.realName && member.university ? `name_univ:${normalizeKey(member.realName)}:${normalizeKey(member.university)}` : "",
    member.realName && member.phone ? `name_phone:${normalizeKey(member.realName)}:${normalizePhone(member.phone)}` : "",
    member.phone ? `phone:${normalizePhone(member.phone)}` : "",
    member.email ? `email:${member.email.trim().toLowerCase()}` : ""
  ].filter(Boolean);
}

function studentKeys(student) {
  return [
    student.real_name && student.university ? `name_univ:${normalizeKey(student.real_name)}:${normalizeKey(student.university)}` : "",
    student.real_name && student.phone ? `name_phone:${normalizeKey(student.real_name)}:${normalizePhone(student.phone)}` : "",
    student.phone ? `phone:${normalizePhone(student.phone)}` : "",
    student.email ? `email:${student.email.trim().toLowerCase()}` : ""
  ].filter(Boolean);
}

function normalizeKey(value) {
  return String(value).normalize("NFKC").replace(/[\s\u3000]/g, "").toLowerCase();
}

function normalizePhone(value) {
  return String(value).normalize("NFKC").replace(/[^\d]/g, "");
}

function mergeNotes(existing, addition) {
  if (!addition) return existing ?? null;
  if (existing?.includes("[Lステップ由来]")) return existing;
  return [existing, addition].filter(Boolean).join("\n\n");
}

function colorForTag(tagName) {
  if (universityNames.has(tagName)) return "#2563eb";
  if (graduationTags.has(tagName)) return "#0ea5e9";
  if (tagName.includes("大塚") || tagName.includes("中野")) return "#f97316";
  if (tagName.includes("興") || tagName.includes("興味")) return "#8b5cf6";
  if (tagName.includes("無") || tagName.includes("未")) return "#64748b";
  return "#009944";
}

function parseGraduationYear(tag) {
  const match = tag.match(/^(\d{2})卒$/);
  return match ? 2000 + Number(match[1]) : null;
}

function parseDate(value) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function truthyCell(value) {
  const normalized = String(value ?? "").trim();
  return normalized && normalized !== "0" && normalized !== "-";
}

function cell(row, index) {
  return index >= 0 && index < row.length ? String(row[index] ?? "").trim() : "";
}

function indexMap(values) {
  return Object.fromEntries(values.map((value, index) => [value, index]));
}

function extractLStepId(body) {
  const match = body.match(/Lステップ登録ID:\s*(\S+)/);
  return match?.[1] ?? "";
}

async function fetchAll(table, select) {
  const pageSize = 1000;
  const all = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Failed to fetch ${table}: ${error.message}`);
    all.push(...(data ?? []));
    if (!data || data.length < pageSize) return all;
  }
}

function parseCsv(csvText) {
  const parsedRows = [];
  let row = [];
  let cellValue = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const next = csvText[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cellValue += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cellValue += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(cellValue);
      cellValue = "";
      continue;
    }

    if (char === "\n" || char === "\r") {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cellValue);
      cellValue = "";
      if (row.some((value) => value.trim())) parsedRows.push(row);
      row = [];
      continue;
    }

    cellValue += char;
  }

  row.push(cellValue);
  if (row.some((value) => value.trim())) parsedRows.push(row);
  return parsedRows;
}

function loadDotEnv(path) {
  if (!fs.existsSync(path)) return;
  const envText = fs.readFileSync(path, "utf8");
  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const rawValue = match[2].trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}
