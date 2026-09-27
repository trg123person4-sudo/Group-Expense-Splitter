import { NextResponse } from "next/server";
import { parseReceiptImage } from "@/lib/receipt-parser";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { imageBase64, samplePreset } = await req.json();

    const parsed = await parseReceiptImage(imageBase64, samplePreset);
    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to parse receipt" }, { status: 500 });
  }
}
