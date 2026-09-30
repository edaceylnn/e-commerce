import { z } from "zod";
import { parseShopifyCsv } from "@/lib/shopify-csv";
import type { ImportOptions } from "@/lib/shopify-import";
import { MAX_UPLOAD_BYTES } from "@/lib/uploads";

const optionsSchema = z.object({
  fallbackCategoryId: z.string().min(1, "Varsayılan kategori seçin."),
  taxRate: z.coerce.number().refine((n) => [0, 1, 10, 20].includes(n), "KDV oranı 0, 1, 10 ya da 20 olmalı."),
  updateStock: z.enum(["true", "false"]).transform((v) => v === "true"),
});

// The import form (file + options) shared by the preview and the import.
export async function readImportRequest(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!form || !(file instanceof File)) return { error: "CSV dosyası seçin." } as const;
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Dosya 5 MB'tan büyük." } as const;
  const options = optionsSchema.safeParse({
    fallbackCategoryId: form.get("fallbackCategoryId"),
    taxRate: form.get("taxRate"),
    updateStock: form.get("updateStock") ?? "true",
  });
  if (!options.success) return { error: options.error.issues[0]?.message ?? "Geçersiz seçenekler." } as const;
  const { products, errors } = parseShopifyCsv(await file.text());
  return { products, fileErrors: errors, options: options.data satisfies ImportOptions } as const;
}
