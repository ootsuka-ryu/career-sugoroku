import { NextResponse } from "next/server";
import { uploadChatMedia } from "@/lib/chat/media-storage";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ファイルを選択してください。" }, { status: 400 });
  }

  if (
    ![
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "video/mp4",
      "video/quicktime"
    ].includes(file.type)
  ) {
    return NextResponse.json(
      { error: "jpg、png、gif、webp、pdf、mp4、mov のみアップロードできます。" },
      { status: 400 }
    );
  }

  if (file.type === "application/pdf" && file.size > 1024 * 1024 * 10) {
    return NextResponse.json(
      { error: "PDFファイルは10MB以下にしてください。" },
      { status: 400 }
    );
  }

  if (file.size > 1024 * 1024 * 50) {
    return NextResponse.json(
      { error: "ファイルサイズは50MB以下にしてください。" },
      { status: 400 }
    );
  }

  try {
    const media = await uploadChatMedia({
      bytes: await file.arrayBuffer(),
      fileName: file.name,
      contentType: file.type
    });
    return NextResponse.json({ media });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "アップロードできませんでした。" },
      { status: 500 }
    );
  }
}
