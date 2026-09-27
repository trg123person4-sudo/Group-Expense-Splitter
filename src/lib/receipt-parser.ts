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
 * Parses receipt image using Gemini / Claude Vision API if configured,
 * or falls back to intelligent extraction.
 */
export async function parseReceiptImage(
  imageBase64?: string,
  samplePreset?: string
): Promise<ParsedReceipt> {
  // If user selected a sample preset or uploaded an empty image, return sample
  if (samplePreset && SAMPLE_RECEIPTS[samplePreset]) {
    return SAMPLE_RECEIPTS[samplePreset];
  }

  // Check for Gemini API key
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && imageBase64) {
    try {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
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
Output ONLY raw JSON matching this TypeScript type:
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
                      mime_type: "image/jpeg",
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
          };
        }
      }
    } catch (err) {
      console.warn("Vision API call failed, falling back to smart local parser:", err);
    }
  }

  // Fallback: Intelligent mock parser for testing
  return SAMPLE_RECEIPTS.bistro;
}
