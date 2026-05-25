import { createAdminClient } from "@/lib/supabase/admin";

const STUDENT_PHOTOS_BUCKET = "student-photos";

export async function uploadStudentPhoto({
  bytes,
  contentType,
  fileName,
  studentId
}: {
  bytes: ArrayBuffer;
  contentType: string;
  fileName: string;
  studentId: string;
}) {
  const supabase = createAdminClient();
  await ensureStudentPhotosBucket(supabase);

  const extension = getImageExtension(fileName, contentType);
  const path = `${studentId}/profile-${Date.now()}${extension}`;

  const { error } = await supabase.storage
    .from(STUDENT_PHOTOS_BUCKET)
    .upload(path, bytes, {
      contentType,
      upsert: true
    });

  if (error) throw error;

  const { data } = supabase.storage.from(STUDENT_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function ensureStudentPhotosBucket(supabase: ReturnType<typeof createAdminClient>) {
  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) throw error;
  if (buckets.some((bucket) => bucket.name === STUDENT_PHOTOS_BUCKET)) return;

  const { error: createError } = await supabase.storage.createBucket(STUDENT_PHOTOS_BUCKET, {
    public: true,
    fileSizeLimit: 1024 * 1024 * 5,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"]
  });

  if (createError) throw createError;
}

function getImageExtension(fileName: string, contentType: string) {
  const fromName = fileName.match(/\.[a-z0-9]+$/i)?.[0];
  if (fromName) return fromName.toLowerCase();

  if (contentType.includes("jpeg")) return ".jpg";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  return ".jpg";
}
