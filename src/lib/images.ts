import { supabase, SUPABASE_URL } from "./supabase";

export const IMAGE_BUCKET = "case-images";
const MAX_SIDE = 1600;
const QUALITY = 0.82;

export type CaseImage = { id?: string; path: string; width: number | null; height: number | null };

export const imageUrl = (path: string) => `${SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${path}`;

// Resize to at most 1600px on the long side and re-encode as WebP (typically 100–300 KB).
export async function compressImage(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", QUALITY));
  if (!blob) throw new Error("Could not process this image.");
  return { blob, width, height };
}

export async function uploadCaseImage(userId: string, caseStudyId: string, file: File, position: number) {
  const { blob, width, height } = await compressImage(file);
  const path = `${userId}/${caseStudyId}/${crypto.randomUUID()}.webp`;
  const { error: uploadError } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
  if (uploadError) throw uploadError;
  const { data, error } = await supabase
    .from("case_study_images")
    .insert({ case_study_id: caseStudyId, path, width, height, position })
    .select("id, path, width, height")
    .single();
  if (error) {
    await supabase.storage.from(IMAGE_BUCKET).remove([path]);
    throw error;
  }
  return data as CaseImage;
}

export async function deleteCaseImage(image: CaseImage) {
  const { error } = await supabase.from("case_study_images").delete().eq("id", image.id!);
  if (error) throw error;
  await supabase.storage.from(IMAGE_BUCKET).remove([image.path]);
}
