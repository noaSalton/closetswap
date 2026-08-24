import { createClient } from "@/lib/supabase/client";

// Uploads directly from the browser to Supabase Storage rather than routing
// bytes through a Server Action, which is capped at a 1MB body by default.
// Storage RLS (see supabase/migrations/0001_init.sql) requires the path to
// start with the uploader's own user id.
export async function uploadItemImages(userId: string, files: File[]): Promise<string[]> {
  const supabase = createClient();
  const urls: string[] = [];

  for (const file of files) {
    const path = `${userId}/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from("item-images").upload(path, file);
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from("item-images").getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return urls;
}
