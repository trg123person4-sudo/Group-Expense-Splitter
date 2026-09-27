import { NextResponse } from "next/server";
import { getCurrentUser, authorizeGroupAccess } from "@/lib/auth";
import { answerLedgerQuestion } from "@/lib/ai-assistant";
import { checkRateLimit } from "@/lib/rate-limiter";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateResult = await checkRateLimit(`assistant:${user.id}`, { limit: 10, windowMs: 60 * 1000 });
    if (!rateResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before sending more queries." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateResult.reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const { groupId, prompt } = await req.json();
    if (!groupId || !prompt) {
      return NextResponse.json({ error: "groupId and prompt are required" }, { status: 400 });
    }

    const membership = await authorizeGroupAccess(groupId, user.id);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden: Not in group" }, { status: 403 });
    }

    const result = await answerLedgerQuestion(groupId, user.id, prompt);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process ledger question" }, { status: 500 });
  }
}
