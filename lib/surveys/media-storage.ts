import { createAdminClient } from "@/lib/supabase/admin";

const SURVEY_MEDIA_BUCKET = "survey-media";

export type SurveyMediaItem = {
  name: string;
  path: string;
  url: string;
  createdAt: string | null;
  size: number | null;
};

export async function listSurveyMedia(): Promise<SurveyMediaItem[]> {
  const supabase = createAdminClient();
  await ensureSurveyMediaBucket(supabase);

  const { data, error } = await supabase.storage
    .from(SURVEY_MEDIA_BUCKET)
    .list("", {
      limit: 100,
      offset: 0,
      sortBy: { column: "created_at", order: "desc" }
    });

  if (error) throw error;

  return (data ?? [])
    .filter((item) => item.name && item.id)
    .map((item) => {
      const { data: publicUrl } = supabase.storage
        .from(SURVEY_MEDIA_BUCKET)
        .getPublicUrl(item.name);

      return {
        name: item.name,
        path: item.name,
        url: publicUrl.publicUrl,
        createdAt: item.created_at ?? null,
        size: item.metadata?.size ?? null
      };
    });
}

export async function uploadSurveyMedia({
  bytes,
  fileName,
  contentType
}: {
  bytes: ArrayBuffer;
  fileName: string;
  contentType: string;
}) {
  const supabase = createAdminClient();
  await ensureSurveyMediaBucket(supabase);

  const extension = getImageExtension(fileName, contentType);
  const safeName = fileName
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^\w.-]+/g, "-")
    .slice(0, 80);
  const path = `${Date.now()}-${safeName || "image"}${extension}`;

  const { error } = await supabase.storage
    .from(SURVEY_MEDIA_BUCKET)
    .upload(path, bytes, {
      contentType,
      upsert: false
    });

  if (error) throw error;

  const { data } = supabase.storage.from(SURVEY_MEDIA_BUCKET).getPublicUrl(path);

  return {
    name: path,
    path,
    url: data.publicUrl
  };
}

async function ensureSurveyMediaBucket(supabase: ReturnType<typeof createAdminClient>) {
  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) throw error;

  if (buckets.some((bucket) => bucket.name === SURVEY_MEDIA_BUCKET)) {
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(
    SURVEY_MEDIA_BUCKET,
    {
      public: true,
      fileSizeLimit: 1024 * 1024 * 10,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"]
    }
  );

  if (createError) throw createError;
}

function getImageExtension(fileName: string, contentType: string) {
  const fromName = fileName.match(/\.[a-z0-9]+$/i)?.[0];
  if (fromName) return fromName.toLowerCase();

  if (contentType.includes("jpeg")) return ".jpg";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("gif")) return ".gif";
  if (contentType.includes("webp")) return ".webp";
  return ".png";
}
