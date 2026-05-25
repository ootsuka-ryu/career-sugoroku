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
