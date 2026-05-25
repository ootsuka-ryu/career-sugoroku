"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const staffSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1),
  role: z.enum(["admin", "staff"]),
  line_user_id: z.string().trim().optional()
});

export async function addStaffUser(formData: FormData) {
  const parsed = staffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = createClient() as any;
  const id = crypto.randomUUID();
  await supabase.from("staff_users").insert({
    id,
    email: parsed.data.email,
    name: parsed.data.name,
    role: parsed.data.role,
    line_user_id: parsed.data.line_user_id || null,
    is_active: true
  });
  revalidatePath("/settings");
}

export async function deactivateStaffUser(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = createClient() as any;
  await supabase.from("staff_users").update({ is_active: false }).eq("id", id);
  revalidatePath("/settings");
}
