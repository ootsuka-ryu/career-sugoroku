"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AiNextActionRunner() {
  const [status, setStatus] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  async function run() {
    setIsRunning(true);
    setStatus("AI更新中です。少し待ってください。");
    const response = await fetch("/api/ai/next-actions/run?limit=25", {
      method: "POST"
    });
    const result = await response.json();
    setIsRunning(false);

    if (!response.ok) {
      setStatus(result.error ?? "AI更新に失敗しました。");
      return;
    }

    setStatus(`${result.success}名分を更新しました。画面を更新します。`);
    window.location.reload();
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Button disabled={isRunning} onClick={run} type="button">
        {isRunning ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        AI提案を今すぐ更新
      </Button>
      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
    </div>
  );
}
