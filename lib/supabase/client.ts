"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";
import type { SupabasePublicEnv } from "@/lib/supabase/env";

export function createClient(env?: SupabasePublicEnv) {
  const supabaseUrl = env?.url ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env?.anonKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return createBrowserClient<Database>(
    supabaseUrl!,
    supabaseAnonKey!
  );
}
