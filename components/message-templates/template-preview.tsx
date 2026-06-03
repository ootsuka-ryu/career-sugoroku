import { Badge } from "@/components/ui/badge";

type TemplatePreviewProps = {
  body: string;
  compact?: boolean;
  kind: string;
};

export function TemplatePreview({ body, compact = false, kind }: TemplatePreviewProps) {
  const parsed = parseTemplateBody(body);

  if (parsed.type === "carousel") {
    const panels = parsed.panels.length > 0 ? parsed.panels : [];
    return (
      <div className={compact ? "flex flex-wrap items-center gap-2 text-xs" : "space-y-5"}>
        {compact ? (
          <>
            <Badge variant="secondary">カルーセル</Badge>
            <span className="text-muted-foreground">
              {panels.length}パネル
              {panels[0]?.title ? ` / ${panels[0].title}` : ""}
              {panels[0]?.buttons?.[0]?.label ? ` / ${panels[0].buttons[0].label}` : ""}
            </span>
          </>
        ) : (
          <div className="flex gap-3 overflow-x-auto rounded-md border bg-muted/30 p-4">
            {panels.map((panel, index) => (
              <div className="w-[220px] shrink-0 rounded-md border bg-background" key={index}>
                <div className="border-b px-3 py-2 text-sm font-semibold">
                  パネル #{index + 1}
                </div>
                <div className="aspect-[1.51] bg-muted">
                  {panel.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" className="h-full w-full object-cover" src={panel.imageUrl} />
                  ) : null}
                </div>
                <div className="space-y-2 p-3">
                  <p className="font-semibold">{panel.title || "タイトル未設定"}</p>
                  <p className="line-clamp-3 min-h-10 text-sm text-muted-foreground">
                    {panel.description || "本文未設定"}
                  </p>
                  <div className="space-y-1 border-t pt-2">
                    {panel.buttons.map((button, buttonIndex) => (
                      <div className="text-center text-xs text-primary" key={buttonIndex}>
                        {button.label || `選択肢${buttonIndex + 1}`}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (parsed.type === "image") {
    return compact ? (
      <span className="text-xs text-muted-foreground">画像テンプレート</span>
    ) : (
      <div className="max-w-sm rounded-md border bg-muted/30 p-4">
        {parsed.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" className="max-h-72 rounded object-contain" src={parsed.imageUrl} />
        ) : (
          <p className="text-sm text-muted-foreground">画像未設定</p>
        )}
      </div>
    );
  }

  const text = parsed.type === "text" ? parsed.text : body;
  return compact ? (
    <span className="line-clamp-1 text-xs text-muted-foreground">
      {text || `${kind}テンプレート`}
    </span>
  ) : (
    <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm">
      {text || `${kind}テンプレート`}
    </p>
  );
}

function parseTemplateBody(body: string):
  | {
      type: "carousel";
      panels: Array<{
        title: string;
        description: string;
        imageUrl: string;
        buttons: Array<{ label: string }>;
      }>;
    }
  | { type: "image"; imageUrl: string }
  | { type: "text"; text: string } {
  try {
    const parsed = JSON.parse(body) as Record<string, any>;
    if (parsed.type === "carousel") {
      return {
        type: "carousel",
        panels: Array.isArray(parsed.panels)
          ? parsed.panels.map((panel: any) => ({
              title: String(panel?.title ?? ""),
              description: String(panel?.description ?? ""),
              imageUrl: String(panel?.imageUrl ?? ""),
              buttons: Array.isArray(panel?.buttons)
                ? panel.buttons.map((button: any) => ({
                    label: String(button?.label ?? "")
                  }))
                : []
            }))
          : []
      };
    }
    if (parsed.type === "image") {
      return { type: "image", imageUrl: String(parsed.imageUrl ?? "") };
    }
    return { type: "text", text: String(parsed.memo ?? body) };
  } catch {
    return { type: "text", text: body };
  }
}
