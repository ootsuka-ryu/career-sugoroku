import { NextResponse } from "next/server";
import { removeRecordingFileByUrl } from "@/lib/recordings/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient() as any;
  const { data: recording, error: fetchError } = await admin
    .from("recordings")
    .select("id, audio_url")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!recording) {
    return NextResponse.json({ error: "録音が見つかりません。" }, { status: 404 });
  }

  let storageWarning = "";
  try {
    await removeRecordingFileByUrl(recording.audio_url);
  } catch (error) {
    storageWarning =
      error instanceof Error
        ? `音声ファイルの削除のみ失敗しました: ${error.message}`
        : "音声ファイルの削除のみ失敗しました。";
  }

  const { error: deleteError } = await admin
    .from("recordings")
    .delete()
    .eq("id", params.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, storageWarning });
}
