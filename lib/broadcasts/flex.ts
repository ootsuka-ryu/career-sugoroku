import type { LinePushMessage } from "@/lib/line/client";

export type GridCellInput = {
  title: string;
  imageUrl: string;
  detailUrl: string;
  applyUrl: string;
};

export type BroadcastBody =
  | {
      kind: "text";
      text: string;
    }
  | {
      kind: "grid_flex";
      altText: string;
      columns: 2;
      rows: 2 | 3;
      cells: GridCellInput[];
    };

export function buildLineMessages(body: BroadcastBody): LinePushMessage[] {
  if (body.kind === "text") {
    return [{ type: "text", text: body.text }];
  }

  return [
    {
      type: "flex",
      altText: body.altText || "イベント情報",
      contents: buildGridFlexBubble(body)
    }
  ];
}

export function buildGridFlexBodyFromForm(formData: FormData): BroadcastBody {
  const rows = Number(formData.get("grid_rows") ?? "2") === 3 ? 3 : 2;
  const total = rows * 2;
  const cells: GridCellInput[] = [];

  for (let index = 0; index < total; index += 1) {
    const suffix = String(index + 1);
    const title = String(formData.get(`cell_${suffix}_title`) ?? "").trim();
    const imageUrl = String(formData.get(`cell_${suffix}_image_url`) ?? "").trim();
    const detailUrl = String(formData.get(`cell_${suffix}_detail_url`) ?? "").trim();
    const applyUrl = String(formData.get(`cell_${suffix}_apply_url`) ?? "").trim();

    if (title || imageUrl || detailUrl || applyUrl) {
      cells.push({
        title: title || `Card ${suffix}`,
        imageUrl: imageUrl || "https://placehold.co/600x360/png",
        detailUrl: detailUrl || "https://example.com",
        applyUrl: applyUrl || "https://example.com"
      });
    }
  }

  return {
    kind: "grid_flex",
    altText: String(formData.get("alt_text") ?? "イベント情報"),
    columns: 2,
    rows,
    cells
  };
}

function buildGridFlexBubble(body: Extract<BroadcastBody, { kind: "grid_flex" }>) {
  const rows = chunk(body.cells.slice(0, body.rows * 2), 2);

  return {
    type: "bubble",
    size: "giga",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: rows.map((row) => ({
        type: "box",
        layout: "horizontal",
        spacing: "md",
        contents: row.map(buildGridCell)
      }))
    }
  };
}

function buildGridCell(cell: GridCellInput) {
  return {
    type: "box",
    layout: "vertical",
    spacing: "sm",
    flex: 1,
    contents: [
      {
        type: "image",
        url: cell.imageUrl,
        size: "full",
        aspectRatio: "16:9",
        aspectMode: "cover"
      },
      {
        type: "text",
        text: cell.title,
        weight: "bold",
        size: "sm",
        wrap: true
      },
      {
        type: "button",
        style: "secondary",
        height: "sm",
        action: {
          type: "uri",
          label: "詳細はこちら",
          uri: cell.detailUrl
        }
      },
      {
        type: "button",
        style: "primary",
        height: "sm",
        action: {
          type: "uri",
          label: "申し込みはこちら",
          uri: cell.applyUrl
        }
      }
    ]
  };
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}
