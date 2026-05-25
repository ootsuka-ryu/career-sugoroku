"use client";

import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyTemplateButton({ body }: { body: string }) {
  return (
    <Button
      size="sm"
      type="button"
      variant="outline"
      onClick={() => navigator.clipboard?.writeText(body)}
    >
      <Copy className="mr-2 h-4 w-4" />
      コピー
    </Button>
  );
}
