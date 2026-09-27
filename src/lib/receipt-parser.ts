import Anthropic from "@anthropic-ai/sdk";
import { uploadReceiptImage } from "./storage";

export interface ParsedReceiptItem {
  id: string;
  name: string;
  price: number;
}

export interface ParsedReceipt {
  merchantName: string;
  date: string;
  items: ParsedReceiptItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  currency: string;
  receiptImageUrl?: string;
  rawText?: string;
}

export const SAMPLE_RECEIPTS: Record<string, ParsedReceipt> = {
  bistro: {
    merchantName: "Sea Breeze Bistro & Lounge",
    date: new Date().toISOString().split("T")[0],
    currency: "USD",
    subtotal: 96.0,
    tax: 8.64,
    tip: 15.0,
    total: 119.64,
    items: [
      { id: "item-1", name: "Crispy Calamari & Aioli", price: 18.0 },
      { id: "item-2", name: "Pan-Seared Sea Bass", price: 34.0 },
      { id: "item-3", name: "Truffle Mushroom Risotto", price: 26.0 },
      { id: "item-4", name: "Sparkling Elderflower Spritz", price: 9.0 },
      { id: "item-5", name: "Artisanal Gelato Trio", price: 9.0 },
    ],
  },
  groceries: {
    merchantName: "Fresh Harvest Market",
    date: new Date().toISOString().split("T")[0],
    currency: "USD",
    subtotal: 78.5,
    tax: 4.71,
    tip: 0.0,
    total: 83.21,
    items: [
      { id: "item-1", name: "Organic Cold Pressed Olive Oil", price: 16.5 },
      { id: "item-2", name: "Sourdough Boule & Croissants", price: 12.0 },
      { id: "item-3", name: "Aged Parmigiano Reggiano", price: 14.0 },
      { id: "item-4", name: "Fresh Berries & Avocados", price: 18.0 },
      { id: "item-5", name: "Oat Milk & Cold Brew (2pk)", price: 18.0 },
    ],
  },
  pizza: {
    merchantName: "Napoli Woodfired Pizza",
    date: new Date().toISOString().split("T")[0],
    currency: "USD",
    subtotal: 62.0,
    tax: 5.58,
    tip: 10.0,
    total: 77.58,
    items: [
      { id: "item-1", name: "Margherita D.O.P. with Basil", price: 21.0 },
      { id: "item-2", name: "Diavola Spicy Soppressata", price: 24.0 },
      { id: "item-3", name: "Burrata & Prosciutto Caprese", price: 17.0 },
    ],
  },
};

/**
 * Parses receipt image using Claude Vision (primary) or Gemini Vision (fallback).
 * Uploads receipt to object storage and returns real image URL.
 * Throws a clear error if no vision key is configured or parsing fails — never returns fake mock data.
 */
export async function parseReceiptImage(
  imageBase64?: string,
  samplePreset?: string
): Promise<ParsedReceipt> {
  // 1. Explicit user selection of demo preset
  if (samplePreset && SAMPLE_RECEIPTS[samplePreset]) {
    return SAMPLE_RECEIPTS[samplePreset];
  }

  if (!imageBase64) {
    throw new Error("No receipt image or preset provided.");
  }

  // Parse media type and clean base64 payload
  const match = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  const mediaType = (match ? match[1] : "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  const cleanBase64 = match ? match[2] : imageBase64;

  // Upload image to object storage / static uploads so we store a real URL
  let receiptImageUrl: string | undefined;
  try {
    const buffer = Buffer.from(cleanBase64, "base64");
    receiptImageUrl = await uploadReceiptImage(buffer, "receipt.jpg", mediaType);
  } catch (err) {
    console.warn("Could not save receipt to storage:", err);
  }

  // 2. Primary Path: Claude Vision API
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const anthropic = new Anthropic({ apiKey: anthropicKey });
      const prompt = `Analyze this receipt image. Extract all individual line items with their price, subtotal, tax amount, tip amount (if written), and final total amount.
Output ONLY a raw JSON object matching this structure with no markdown or formatting:
{
  "merchantName": "Store/Restaurant Name",
  "date": "YYYY-MM-DD",
  "currency": "USD",
  "items": [{ "id": "item-1", "name": "Item description", "price": 10.00 }],
  "subtotal": 10.00,
  "tax": 1.00,
  "tip": 2.00,
  "total": 13.00
}`;

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: cleanBase64,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      });

      const textBlock = response.content.find((c) => c.type === "text");
      if (textBlock && textBlock.type === "text") {
        const cleanedText = textBlock.text.trim().replace(/^```json/, "").replace(/```$/, "").trim();
        const parsed = JSON.parse(cleanedText);
        return {
          merchantName: parsed.merchantName || "Receipt Merchant",
          date: parsed.date || new Date().toISOString().split("T")[0],
          currency: parsed.currency || "USD",
          items: (parsed.items || []).map((it: any, idx: number) => ({
            id: it.id || `item-${idx + 1}`,
            name: it.name || "Item",
            price: Number(it.price) || 0,
          })),
          subtotal: Number(parsed.subtotal) || 0,
          tax: Number(parsed.tax) || 0,
          tip: Number(parsed.tip) || 0,
          total: Number(parsed.total) || 0,
          receiptImageUrl,
        };
      }
    } catch (err: any) {
      console.warn("Claude Vision API failed, attempting Gemini fallback:", err.message);
    }
  }

  // 3. Fallback: Gemini Vision API
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Analyze this receipt image. Extract all individual line items with their price, subtotal, tax amount, tip amount (if written), and final total amount.
Output ONLY raw JSON matching this structure:
{
  "merchantName": string,
  "date": string,
  "currency": string,
  "items": [{ "id": string, "name": string, "price": number }],
  "subtotal": number,
  "tax": number,
  "tip": number,
  "total": number
}`,
                  },
                  {
                    inline_data: {
                      mime_type: mediaType,
                      data: cleanBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              response_mime_type: "application/json",
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return {
            merchantName: parsed.merchantName || "Receipt Merchant",
            date: parsed.date || new Date().toISOString().split("T")[0],
            currency: parsed.currency || "USD",
            items: (parsed.items || []).map((it: any, idx: number) => ({
              id: it.id || `item-${idx + 1}`,
              name: it.name || "Item",
              price: Number(it.price) || 0,
            })),
            subtotal: Number(parsed.subtotal) || 0,
            tax: Number(parsed.tax) || 0,
            tip: Number(parsed.tip) || 0,
            total: Number(parsed.total) || 0,
            receiptImageUrl,
          };
        }
      }
    } catch (err: any) {
      console.warn("Gemini Vision API failed:", err.message);
    }
  }

  // 4. Honest Error State: NEVER return a fake mock receipt silently
  throw new Error(
    "Receipt OCR failed: Neither ANTHROPIC_API_KEY nor GEMINI_API_KEY is configured, or image analysis failed. Please add items manually or configure an API key in .env."
  );
}
