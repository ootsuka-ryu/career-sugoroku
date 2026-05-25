import { createAdminClient } from "@/lib/supabase/admin";

const RECORDINGS_BUCKET = "recordings";

export async function uploadRecordingFile({
  bytes,
  fileName,
  contentType,
  studentId
}: {
  bytes: ArrayBuffer;
  fileName: string;
  contentType: string;
  studentId: string;
}) {
  const supabase = createAdminClient();
  await ensureRecordingsBucket(supabase);

  const extension = getExtension(fileName, contentType);
  const path = `${studentId}/${Date.now()}-${crypto.randomUUID()}${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(RECORDINGS_BUCKET)
    .upload(path, bytes, {
      contentType,
      upsert: false
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data, error: signedError } = await supabase.storage
    .from(RECORDINGS_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7);

  if (signedError) {
    throw signedError;
  }

  return {
    bucket: RECORDINGS_BUCKET,
    path,
    signedUrl: data.signedUrl
  };
}

async function ensureRecordingsBucket(supabase: ReturnType<typeof createAdminClient>) {
  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) {
    throw error;
  }

  if (buckets.some((bucket) => bucket.name === RECORDINGS_BUCKET)) {
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(
    RECORDINGS_BUCKET,
    {
      public: false,
      fileSizeLimit: 1024 * 1024 * 500,
      allowedMimeTypes: [
        "audio/webm",
        "audio/wav",
        "audio/mpeg",
        "audio/mp4",
        "audio/x-m4a",
        "video/mp4"
      ]
    }
  );

  if (createError) {
    throw createError;
  }
}

function getExtension(fileName: string, contentType: string) {
  const fromName = fileName.match(/\.[a-z0-9]+$/i)?.[0];
  if (fromName) return fromName.toLowerCase();

  if (contentType.includes("webm")) return ".webm";
  if (contentType.includes("wav")) return ".wav";
  if (contentType.includes("mpeg")) return ".mp3";
  if (contentType.includes("mp4")) return ".mp4";
  if (contentType.includes("m4a")) return ".m4a";
  return ".audio";
}
