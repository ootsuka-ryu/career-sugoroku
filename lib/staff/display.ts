import type { StaffSummary } from "@/lib/students/types";

export function getStaffDisplayName(staff: Pick<StaffSummary, "name" | "email">) {
  const key = `${staff.name ?? ""} ${staff.email ?? ""}`.toLowerCase();

  if (key.includes("otsuka") || key.includes("ohtsuka") || key.includes("大塚")) return "大塚";
  if (key.includes("nakano") || key.includes("中野")) return "中野";

  return staff.name || staff.email;
}

export function getStaffBadgeClass(staff: Pick<StaffSummary, "name" | "email">) {
  const key = `${staff.name ?? ""} ${staff.email ?? ""}`.toLowerCase();

  if (key.includes("otsuka") || key.includes("ohtsuka") || key.includes("大塚")) {
    return "border-orange-200 bg-orange-100 text-orange-800 hover:bg-orange-100";
  }

  if (key.includes("nakano") || key.includes("中野")) {
    return "border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  return getUnassignedStaffBadgeClass();
}

export function getUnassignedStaffBadgeClass() {
  return "border-slate-900 bg-slate-900 text-white hover:bg-slate-900";
}

export function uniqueStaffByDisplayName<T extends Pick<StaffSummary, "id" | "name" | "email">>(
  staffUsers: T[]
) {
  const byName = new Map<string, T>();

  for (const staff of staffUsers) {
    const displayName = getStaffDisplayName(staff);
    const current = byName.get(displayName);
    if (!current || getStaffPriority(staff) > getStaffPriority(current)) {
      byName.set(displayName, staff);
    }
  }

  return Array.from(byName.values()).sort((a, b) =>
    getStaffDisplayName(a).localeCompare(getStaffDisplayName(b), "ja")
  );
}

function getStaffPriority(staff: Pick<StaffSummary, "id" | "name" | "email">) {
  let priority = 0;
  const email = String(staff.email ?? "").toLowerCase();
  const name = String(staff.name ?? "").trim().toLowerCase();

  if (email && !email.endsWith("@example.com")) priority += 10;
  if (!staff.id.startsWith("00000000-0000-4000-8000-")) priority += 5;
  if (name && name !== "admin") priority += 1;

  return priority;
}
