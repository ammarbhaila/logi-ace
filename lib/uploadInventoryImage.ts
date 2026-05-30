import { supabase } from "@/lib/supabaseClient";
import { v4 as uuidv4 } from "uuid";

export async function uploadInventoryImage(
  file: File,
  productId: string
): Promise<string> {
  // ✅ Clean filename
  const safeName = file.name.replace(/\s+/g, "-").toLowerCase();

  const filePath = `${productId}/${uuidv4()}-${safeName}`;

  const { data, error } = await supabase.storage
    .from("inventory-images")
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600", // 1 hour (can be higher)
    });

  if (error) throw error;

  const { data: publicUrl } = supabase.storage
    .from("inventory-images")
    .getPublicUrl(data.path);

  return publicUrl.publicUrl;
}
