import { NextRequest } from "next/server";
import { getCurrentUser, authorizeGroupAccess } from "@/lib/auth";
import { addGroupClient, removeGroupClient } from "@/lib/realtime";
import crypto from "crypto";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const membership = await authorizeGroupAccess(groupId, user.id);
  if (!membership) {
    return new Response("Forbidden", { status: 403 });
  }

  const clientId = crypto.randomUUID();
  let clientRef: any = null;

  const stream = new ReadableStream({
    start(controller) {
      clientRef = { id: clientId, controller };
      addGroupClient(groupId, clientRef);

      // Send initial connection ping
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected", groupId })}\n\n`));
    },
    cancel() {
      if (clientRef) {
        removeGroupClient(groupId, clientRef);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
