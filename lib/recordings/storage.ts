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

  const normalizedContentType = normalizeContentType(fileName, contentType);
  const extension = getExtension(fileName, normalizedContentType);
  const path = `${studentId}/${Date.now()}-${crypto.randomUUID()}${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(RECORDINGS_BUCKET)
    .upload(path, bytes, {
      contentType: normalizedContentType,
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
        "audio/ogg",
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
  if (contentType.includes("ogg")) return ".ogg";
  return ".audio";
}

function normalizeContentType(fileName: string, contentType: string) {
  const normalized = contentType.toLowerCase().split(";")[0].trim();
  if (normalized) return normalized;

  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".webm")) return "audio/webm";
  if (lowerName.endsWith(".wav")) return "audio/wav";
  if (lowerName.endsWith(".mp3")) return "audio/mpeg";
  if (lowerName.endsWith(".mp4")) return "audio/mp4";
  if (lowerName.endsWith(".m4a")) return "audio/x-m4a";
  if (lowerName.endsWith(".ogg")) return "audio/ogg";
  return "audio/webm";
}
