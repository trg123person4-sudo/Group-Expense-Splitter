import { NextResponse } from "next/server";
import { parseReceiptImage } from "@/lib/receipt-parser";

export async function POST(req: Request) {
  try {
    const { imageBase64, samplePreset } = await req.json();

    const parsed = await parseReceiptImage(imageBase64, samplePreset);
    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to parse receipt" }, { status: 500 });
  }
}
