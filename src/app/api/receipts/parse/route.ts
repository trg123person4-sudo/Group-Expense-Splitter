import { NextResponse } from "next/server";
import { parseReceiptImage } from "@/lib/receipt-parser";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limiter";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const rateResult = checkRateLimit(`ocr:${user.id}`, { limit: 10, windowMs: 60 * 1000 });
    if (!rateResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Receipt OCR processing is limited to 10 requests per minute." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateResult.reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const { imageBase64, samplePreset } = await req.json();

    const parsed = await parseReceiptImage(imageBase64, samplePreset);
    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to parse receipt" }, { status: 500 });
  }
}
