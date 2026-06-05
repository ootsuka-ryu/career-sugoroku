import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");

loadDotEnv(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const students = await fetchAllStudents();
const changes = [];

for (const student of students) {
  const sourceName = student.real_name || student.display_name || "";
  const parsed = parseNameAndKana(sourceName);
  if (!parsed) continue;

  const nextRealName = parsed.name;
  const nextDisplayName = parsed.name;
  const nextKana = parsed.kana;

  if (
    student.real_name === nextRealName &&
    student.display_name === nextDisplayName &&
    student.kana === nextKana
  ) {
    continue;
  }

  changes.push({
    id: student.id,
    before: {
      display_name: student.display_name,
      real_name: student.real_name,
      kana: student.kana
    },
    after: {
      display_name: nextDisplayName,
      real_name: nextRealName,
      kana: nextKana
    }
  });
}

if (!dryRun) {
  for (const change of changes) {
    const { error } = await supabase
      .from("students")
      .update(change.after)
      .eq("id", change.id);
    if (error) throw new Error(`Failed to update ${change.id}: ${error.message}`);
  }
}

console.log(
  JSON.stringify(
    {
      dryRun,
      totalStudents: students.length,
      changed: changes.length,
      examples: changes.slice(0, 20)
    },
    null,
    2
  )
);

async function fetchAllStudents() {
  const pageSize = 1000;
  const all = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("students")
      .select("id, display_name, real_name, kana")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Failed to fetch students: ${error.message}`);
    all.push(...(data ?? []));
    if (!data || data.length < pageSize) return all;
  }
}

function parseNameAndKana(value) {
  const text = String(value ?? "").normalize("NFKC").trim();
  if (!text) return null;

  const match = text.match(/^(.*?)\s*[（(]\s*([ぁ-んー\s　]+)\s*[）)]\s*$/u);
  if (!match) return null;

  const name = normalizeName(match[1]);
  const kana = hiraganaToKatakana(match[2]);
  if (!name || !kana) return null;

  return { name, kana };
}

function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

function hiraganaToKatakana(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[ぁ-ん]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) + 0x60)
    );
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
