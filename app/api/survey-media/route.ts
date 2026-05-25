import { NextResponse } from "next/server";
import {
  listSurveyMedia,
  uploadSurveyMedia
} from "@/lib/surveys/media-storage";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  try {
    const media = await listSurveyMedia();
    return NextResponse.json({ media });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "画像一覧を取得できませんでした。" },
      { status: 500 }
    );
  }
}

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
    return NextResponse.json({ error: "画像ファイルを選択してください。" }, { status: 400 });
  }

  if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
    return NextResponse.json(
      { error: "jpg、png、gif、webp の画像だけアップロードできます。" },
      { status: 400 }
    );
  }

  if (file.size > 1024 * 1024 * 10) {
    return NextResponse.json(
      { error: "画像サイズは10MB以下にしてください。" },
      { status: 400 }
    );
  }

  try {
    const media = await uploadSurveyMedia({
      bytes: await file.arrayBuffer(),
      fileName: file.name,
      contentType: file.type
    });
    return NextResponse.json({ media });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "画像をアップロードできませんでした。" },
      { status: 500 }
    );
  }
}
