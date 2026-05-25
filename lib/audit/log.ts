import type { SupabaseClient } from "@supabase/supabase-js";

export async function writeAuditLog(
  supabase: SupabaseClient<any, any, any>,
  input: {
    actorStaffId?: string | null;
    action: string;
    targetTable: string;
    targetId?: string | null;
    before?: unknown;
    after?: unknown;
  }
) {
  await supabase.from("audit_logs").insert({
    actor_staff_id: input.actorStaffId ?? null,
    action: input.action,
    target_table: input.targetTable,
    target_id: input.targetId ?? null,
    before_jsonb: input.before ?? null,
    after_jsonb: input.after ?? null
  });
}
