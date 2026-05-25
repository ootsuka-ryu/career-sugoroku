import { createAdminClient } from "@/lib/supabase/admin";

const CHAT_MEDIA_BUCKET = "chat-media";

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "video/mp4",
  "video/quicktime"
];

export async function uploadChatMedia({
  bytes,
  fileName,
  contentType
}: {
  bytes: ArrayBuffer;
  fileName: string;
  contentType: string;
}) {
  const supabase = createAdminClient();
  await ensureChatMediaBucket(supabase);

  const extension = getExtension(fileName, contentType);
  const safeName = fileName
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^\w.-]+/g, "-")
    .slice(0, 80);
  const path = `${Date.now()}-${safeName || "media"}${extension}`;

  const { error } = await supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .upload(path, bytes, {
      contentType,
      upsert: false
    });

  if (error) throw error;

  const { data } = supabase.storage.from(CHAT_MEDIA_BUCKET).getPublicUrl(path);

  return {
    name: path,
    path,
    url: data.publicUrl
  };
}

async function ensureChatMediaBucket(supabase: ReturnType<typeof createAdminClient>) {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;

  if (buckets.some((bucket) => bucket.name === CHAT_MEDIA_BUCKET)) {
    await supabase.storage.updateBucket(CHAT_MEDIA_BUCKET, {
      public: true,
      fileSizeLimit: 1024 * 1024 * 50,
      allowedMimeTypes
    });
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(CHAT_MEDIA_BUCKET, {
    public: true,
    fileSizeLimit: 1024 * 1024 * 50,
    allowedMimeTypes
  });

  if (createError) throw createError;
}

function getExtension(fileName: string, contentType: string) {
  const fromName = fileName.match(/\.[a-z0-9]+$/i)?.[0];
  if (fromName) return fromName.toLowerCase();

  if (contentType.includes("jpeg")) return ".jpg";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("gif")) return ".gif";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("pdf")) return ".pdf";
  if (contentType.includes("quicktime")) return ".mov";
  if (contentType.includes("mp4")) return ".mp4";
  return ".bin";
}
