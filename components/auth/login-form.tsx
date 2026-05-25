"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function signInWithPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage(null);

    let error: { message: string } | null = null;

    try {
      const supabase = createClient();
      const result = await supabase.auth.signInWithPassword({
        email,
        password
      });
      error = result.error;
    } catch {
      error = { message: "Supabase env is missing" };
    }

    setIsPending(false);

    if (error) {
      setMessage("ログインできませんでした。Supabase の環境変数と認証設定を確認してください。");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  async function signInWithGoogle() {
    setIsPending(true);
    let error: { message: string } | null = null;

    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const result = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=/dashboard`
        }
      });
      error = result.error;
    } catch {
      error = { message: "Supabase env is missing" };
    }

    if (error) {
      setIsPending(false);
      setMessage("Google ログインを開始できませんでした。Supabase の OAuth 設定を確認してください。");
    }
  }

  return (
    <form className="space-y-5" onSubmit={signInWithPassword}>
      <div className="space-y-2">
        <Label htmlFor="email">メールアドレス</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="recruit@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">パスワード</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      {message ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {message}
        </p>
      ) : null}
      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        ログイン
      </Button>
      <Button
        className="w-full"
        disabled={isPending}
        onClick={signInWithGoogle}
        type="button"
        variant="outline"
      >
        Google でログイン
      </Button>
    </form>
  );
}
