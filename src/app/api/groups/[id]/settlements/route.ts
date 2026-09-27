import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, authorizeGroupAccess } from "@/lib/auth";
import { broadcastGroupUpdate } from "@/lib/realtime";
import { z } from "zod";

const createSettlementSchema = z.object({
  fromUser: z.string(),
  toUser: z.string(),
  amount: z.number().positive("Amount must be greater than zero"),
  method: z.string().default("UPI"), // UPI, PayPal, Venmo, Cash
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await authorizeGroupAccess(groupId, user.id);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden: Not in group" }, { status: 403 });
    }

    const body = await req.json();
    const validated = createSettlementSchema.parse(body);

    const settlement = await prisma.settlement.create({
      data: {
        groupId,
        fromUser: validated.fromUser,
        toUser: validated.toUser,
        amount: validated.amount,
        status: "completed",
        method: validated.method,
        settledAt: new Date(),
      },
      include: {
        sender: true,
        receiver: true,
      },
    });

    // Notify receiver
    await prisma.notification.create({
      data: {
        userId: validated.toUser,
        type: "payment_received",
        payload: JSON.stringify({
          groupId,
          groupName: membership.group.name,
          fromName: settlement.sender.name,
          amount: validated.amount,
          method: validated.method,
        }),
      },
    });

    await broadcastGroupUpdate(groupId, { type: "settlement_recorded", settlementId: settlement.id });

    return NextResponse.json({ success: true, settlement }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to record settlement" }, { status: 400 });
  }
}
