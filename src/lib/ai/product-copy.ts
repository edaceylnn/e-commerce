import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ApiError, GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { LoadedImage } from "@/lib/ai/load-image";

// Gemini's free tier is used while we validate the feature; Claude stays
// available. The provider is picked by which key is set — GEMINI_API_KEY
// wins when both are present.
export const GEMINI_MODEL = "gemini-3.8-flash";
// Free-tier capacity and quotas are per model, so an overloaded (503) or
// rate-limited (429) primary model is retried once on this one.
export const GEMINI_FALLBACK_MODEL = "gemini-3.5-flash-lite";
export const CLAUDE_MODEL = "claude-opus-5-5";

// Only what the copy needs — no prices of other products, no customer data.
export type ProductCopyInput = {
  title: string;
  category: string;
  description: string;
  colors: string[];
  sizes: string[];
  price: number;
};

// What the model returns. Images are referred to by their "Görsel N" label.
const ModelOutputSchema = z.object({
  shortDescription: z.string(),
  metaTitle: z.string(),
  metaDescription: z.string(),
  imageAlts: z.array(z.object({ imageNumber: z.number().int(), altText: z.string() })),
  // Facts the model would have needed but didn't get (e.g. fabric). Shown to
  // the admin so a thin draft reads as "add this data", not "AI is bad".
  missingInfo: z.array(z.string()),
});

type ModelOutput = z.infer<typeof ModelOutputSchema>;

export type ProductCopy = {
  shortDescription: string;
  metaTitle: string;
  metaDescription: string;
  imageAlts: { imageUrl: string; altText: string }[];
  missingInfo: string[];
};

export type ProductCopyResult = {
  copy: ProductCopy;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
};

export class ProductCopyError extends Error {}

// Frozen so every request shares the same prefix. The no-invention rules
// live here, at system level, rather than being left to each request.
const SYSTEM_PROMPT = `Bir Türk tekstil e-ticaret mağazası için ürün metni taslakları yazıyorsun. Mağaza sahibi her taslağı okuyup düzenleyecek ve onaylayacak; metinler otomatik yayımlanmaz.

Yazacakların:
- shortDescription: ürün sayfası için 2–4 cümlelik, akıcı Türkçe açıklama (en fazla 400 karakter).
- metaTitle: arama sonuçları için en fazla 60 karakterlik başlık; ürün tipi ve ayırt edici özelliği. Mağaza adı ekleme.
- metaDescription: arama sonuçları için 120–155 karakterlik tek paragraf özet; ürün tipini ve ana özelliğini içersin.
- imageAlts: verilen her görsel için bir alt metin; imageNumber görselin numarası. Yalnızca görselde gerçekten görüneni anlat (ürün, renk, açı, kişi varsa duruşu); 5–15 kelime, "görseli" veya "fotoğrafı" diye başlama. Görsel verilmediyse boş liste.
- missingInfo: daha iyi bir metin için eksik olan bilgiler (örn. "Kumaş içeriği", "Kalıp bilgisi"). Eksik yoksa boş liste.

Kurallar:
- Yalnızca verilen ürün bilgisini kullan. Kumaş içeriği, gramaj, ölçü, kalıp, üretim yeri, sertifika veya teknik özellik verilmemişse uydurma; bunları missingInfo'ya yaz.
- Sağlık, zayıflatma, tedavi veya performans vaadi verme ("selülit giderir", "yağ yakar" gibi).
- Abartılı ve kanıtlanamaz ifadelerden kaçın ("en iyi", "bir numaralı", "%100 memnuniyet").
- Fiyatı, indirimi veya stok durumunu metne yazma.
- Emoji, büyük harfle bağırma ve anahtar kelime doldurma kullanma.
- Görselde göremediğin bir şeyi (kumaş, marka, ölçü) alt metne yazma; renk adı ürün bilgisindeki renklerden biriyle eşleşiyorsa o adı kullan.`;

function formatInput(input: ProductCopyInput) {
  return [
    `Ürün adı: ${input.title || "(yok)"}`,
    `Kategori: ${input.category || "(yok)"}`,
    `Renkler: ${input.colors.length ? input.colors.join(", ") : "(yok)"}`,
    `Bedenler: ${input.sizes.length ? input.sizes.join(", ") : "(yok)"}`,
    `Mevcut açıklama: ${input.description || "(yok)"}`,
  ].join("\n");
}

type RawResult = Omit<ProductCopyResult, "latencyMs" | "copy"> & { copy: ModelOutput | null };

let gemini: GoogleGenAI | null = null;

async function callGemini(model: string, input: ProductCopyInput, images: LoadedImage[]) {
  gemini ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return gemini.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          { text: formatInput(input) },
          ...images.flatMap((img, i) => [
            { text: `Görsel ${i + 1}:` },
            { inlineData: { mimeType: img.mimeType, data: img.data } },
          ]),
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(ModelOutputSchema),
    },
  });
}

function isCapacityError(error: unknown) {
  return error instanceof ApiError && (error.status === 429 || error.status >= 500);
}

async function generateWithGemini(input: ProductCopyInput, images: LoadedImage[]): Promise<RawResult> {
  let response;
  try {
    try {
      response = await callGemini(GEMINI_MODEL, input, images);
    } catch (error) {
      if (!isCapacityError(error)) throw error;
      console.warn("product copy Gemini primary unavailable, falling back", (error as ApiError).status);
      response = await callGemini(GEMINI_FALLBACK_MODEL, input, images);
    }
  } catch (error) {
    if (error instanceof ApiError) {
      console.error("product copy Gemini error", error.status, error.message);
      if (error.status === 400 || error.status === 401 || error.status === 403) {
        throw new ProductCopyError("GEMINI_API_KEY geçersiz ya da bu model için yetkisi yok.");
      }
      if (error.status === 429) {
        throw new ProductCopyError("Gemini ücretsiz kullanım sınırına ulaşıldı — biraz bekleyip tekrar deneyin.");
      }
      throw new ProductCopyError("Gemini şu an yoğun — birkaç saniye sonra tekrar deneyin.");
    }
    throw error;
  }

  let copy: ModelOutput | null = null;
  try {
    const parsed = ModelOutputSchema.safeParse(JSON.parse(response.text ?? ""));
    copy = parsed.success ? parsed.data : null;
  } catch {
    copy = null;
  }
  return {
    copy,
    model: response.modelVersion ?? GEMINI_MODEL,
    inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
    outputTokens:
      (response.usageMetadata?.candidatesTokenCount ?? 0) + (response.usageMetadata?.thoughtsTokenCount ?? 0),
  };
}

let anthropic: Anthropic | null = null;

async function generateWithClaude(input: ProductCopyInput, images: LoadedImage[]): Promise<RawResult> {
  anthropic ??= new Anthropic();
  let response;
  try {
    response = await anthropic.beta.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      // Short, well-specified copy — low effort keeps it fast.
      output_config: { effort: "low", format: betaZodOutputFormat(ModelOutputSchema) },
      // A safety false positive re-runs on another model instead of failing.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: formatInput(input) },
            ...images.flatMap((img, i) => [
              { type: "text" as const, text: `Görsel ${i + 1}:` },
              {
                type: "image" as const,
                source: { type: "base64" as const, media_type: img.mimeType, data: img.data },
              },
            ]),
          ],
        },
      ],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new ProductCopyError("ANTHROPIC_API_KEY geçersiz.");
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new ProductCopyError("AI servisi şu an yoğun — birkaç saniye sonra tekrar deneyin.");
    }
    if (error instanceof Anthropic.APIError) {
      console.error("product copy Claude error", error.status, error.message);
      throw new ProductCopyError("AI servisine ulaşılamadı. Tekrar deneyin.");
    }
    throw error;
  }

  if (response.stop_reason === "refusal") {
    throw new ProductCopyError("AI bu ürün için taslak üretmedi. Ürün bilgilerini kontrol edip tekrar deneyin.");
  }
  return {
    copy: response.parsed_output,
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

// `images` are the photos to write alt text for (already loaded); the text
// drafts are generated in the same request.
export async function generateProductCopy(
  input: ProductCopyInput,
  images: LoadedImage[] = []
): Promise<ProductCopyResult> {
  const generate = process.env.GEMINI_API_KEY
    ? generateWithGemini
    : process.env.ANTHROPIC_API_KEY
      ? generateWithClaude
      : null;
  if (!generate) {
    throw new ProductCopyError(
      "AI taslakları için GEMINI_API_KEY tanımlı değil — .env.local dosyasına ekleyip sunucuyu yeniden başlatın."
    );
  }

  const startedAt = Date.now();
  const result = await generate(input, images);
  const copy = result.copy;
  if (!copy || !copy.shortDescription.trim() || !copy.metaDescription.trim()) {
    throw new ProductCopyError("AI geçerli bir taslak döndürmedi. Tekrar deneyin.");
  }

  return {
    ...result,
    copy: {
      shortDescription: copy.shortDescription.trim(),
      metaTitle: copy.metaTitle.trim(),
      metaDescription: copy.metaDescription.trim(),
      imageAlts: mapImageAlts(copy.imageAlts, images),
      missingInfo: copy.missingInfo.map((s) => s.trim()).filter(Boolean),
    },
    latencyMs: Date.now() - startedAt,
  };
}

// Back from "Görsel N" labels to URLs, dropping out-of-range numbers,
// duplicates and empty texts rather than trusting the model's bookkeeping.
export function mapImageAlts(alts: ModelOutput["imageAlts"], images: { url: string }[]) {
  const seen = new Set<string>();
  const result: ProductCopy["imageAlts"] = [];
  for (const alt of alts) {
    const image = images[alt.imageNumber - 1];
    const altText = alt.altText.trim();
    if (!image || !altText || seen.has(image.url)) continue;
    seen.add(image.url);
    result.push({ imageUrl: image.url, altText });
  }
  return result;
}
