import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { uploadReceiptImage } from "@/lib/storage";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const url = await uploadReceiptImage(buffer, file.name, file.type || "image/jpeg");

      return NextResponse.json({ url });
    }

    // JSON payload with base64
    const { imageBase64, filename } = await req.json();
    if (!imageBase64) {
      return NextResponse.json({ error: "No imageBase64 provided" }, { status: 400 });
    }

    const match = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    const mimeType = match ? match[1] : "image/jpeg";
    const base64Data = match ? match[2] : imageBase64;
    const buffer = Buffer.from(base64Data, "base64");

    const url = await uploadReceiptImage(buffer, filename || "receipt.jpg", mimeType);
    return NextResponse.json({ url });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message || "Failed to upload image" }, { status: 500 });
  }
}
