import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export default function LoginPage() {
  const supabaseEnv = getSupabasePublicEnv();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(31,103,177,0.12),_transparent_32rem)] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-sm font-medium text-primary">薬学生 LINE 採用 CRM</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal">
            採用チームのログイン
          </h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>アカウント認証</CardTitle>
            <CardDescription>
              Supabase Auth のメール認証または Google SSO でログインします。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm supabaseEnv={supabaseEnv} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
