export type SupabasePublicEnv = {
  url?: string;
  anonKey?: string;
};

export function getSupabasePublicEnv(): SupabasePublicEnv {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  };
}

export function hasSupabasePublicEnv(env = getSupabasePublicEnv()) {
  return Boolean(
    env.url &&
      env.anonKey
  );
}
