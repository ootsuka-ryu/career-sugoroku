"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { SupabasePublicEnv } from "@/lib/supabase/env";

function loginErrorMessage(message?: string) {
  if (!message) {
    return "ログインできませんでした。";
  }

  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "メールアドレスまたはパスワードが違います。";
  }

  if (lower.includes("email not confirmed")) {
    return "メール認証がまだ完了していません。Supabaseから届いた確認メールを開いてください。";
  }

  return `ログインできませんでした。詳細: ${message}`;
}

type LoginFormProps = {
  supabaseEnv: SupabasePublicEnv;
};

export function LoginForm({ supabaseEnv }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    const params = new URLSearchParams(search);
    const isRecovery =
      hash.includes("type=recovery") ||
      params.get("type") === "recovery" ||
      params.get("mode") === "recovery";

    const error = params.get("error");
    if (error) {
      setMessage(`認証処理でエラーが発生しました。詳細: ${error}`);
    }

    if (!isRecovery) {
      return;
    }

    async function prepareRecoverySession() {
      try {
        const supabase = createClient(supabaseEnv);
        await supabase.auth.getSession();
        setMode("reset");
        setMessage("新しいパスワードを入力してください。");
      } catch {
        setMessage("Supabaseの接続情報が不足しています。");
      }
    }

    void prepareRecoverySession();
  }, [supabaseEnv]);

  async function signInWithPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage(null);

    let error: { message: string } | null = null;

    try {
      const supabase = createClient(supabaseEnv);
      const result = await supabase.auth.signInWithPassword({
        email,
        password
      });
      error = result.error;
    } catch {
      error = { message: "Supabaseの接続情報が不足しています。" };
    }

    setIsPending(false);

    if (error) {
      setMessage(loginErrorMessage(error.message));
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  async function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage(null);

    if (newPassword.length < 8) {
      setIsPending(false);
      setMessage("パスワードは8文字以上で入力してください。");
      return;
    }

    let error: { message: string } | null = null;

    try {
      const supabase = createClient(supabaseEnv);
      const result = await supabase.auth.updateUser({
        password: newPassword
      });
      error = result.error;
    } catch {
      error = { message: "Supabaseの接続情報が不足しています。" };
    }

    setIsPending(false);

    if (error) {
      setMessage(`パスワードを変更できませんでした。詳細: ${error.message}`);
      return;
    }

    setMessage("パスワードを変更しました。新しいパスワードでログインしてください。");
    setMode("login");
    setPassword("");
    setNewPassword("");
    router.replace("/login");
  }

  async function signInWithGoogle() {
    setIsPending(true);
    setMessage(null);
    let error: { message: string } | null = null;

    try {
      const supabase = createClient(supabaseEnv);
      const origin = window.location.origin;
      const result = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=/dashboard`
        }
      });
      error = result.error;
    } catch {
      error = { message: "Supabaseの接続情報が不足しています。" };
    }

    if (error) {
      setIsPending(false);
      setMessage(`Googleログインを開始できませんでした。詳細: ${error.message}`);
    }
  }

  if (mode === "reset") {
    return (
      <form className="space-y-5" onSubmit={updatePassword}>
        <div className="space-y-2">
          <Label htmlFor="new-password">新しいパスワード</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">8文字以上で入力してください。</p>
        </div>
        {message ? (
          <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
            {message}
          </p>
        ) : null}
        <Button className="w-full" disabled={isPending} type="submit">
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          パスワードを変更する
        </Button>
      </form>
    );
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
        Googleでログイン
      </Button>
    </form>
  );
}
