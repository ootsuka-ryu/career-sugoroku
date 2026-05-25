"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function completeGeneratedTask(formData: FormData) {
  const taskKey = String(formData.get("task_key") ?? "");
  if (!taskKey) return;

  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("task_dismissals").upsert({
    task_key: taskKey,
    staff_id: user.id,
    completed_at: new Date().toISOString()
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function completeManualTask(formData: FormData) {
  const taskId = String(formData.get("task_id") ?? "");
  if (!taskId) return;

  const supabase = createClient() as any;
  await supabase
    .from("staff_tasks")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", taskId);

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}
