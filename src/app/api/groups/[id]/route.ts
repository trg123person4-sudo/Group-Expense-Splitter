import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, authorizeGroupAccess } from "@/lib/auth";
import { getSettlementSummary } from "@/lib/settlement";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Authorization check: User must be a member of the group
  const membership = await authorizeGroupAccess(groupId, user.id);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden: Not a member of this group" }, { status: 403 });
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: { user: true },
        orderBy: { joinedAt: "asc" },
      },
      expenses: {
        include: {
          payer: true,
          splits: { include: { user: true } },
          items: { include: { assignments: { include: { user: true } } } },
          comments: { include: { user: true }, orderBy: { createdAt: "asc" } },
        },
        orderBy: { date: "desc" },
      },
      settlements: {
        include: {
          sender: true,
          receiver: true,
        },
        orderBy: { settledAt: "desc" },
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const membersForCalc = group.members.map((m) => ({
    id: m.user.id,
    name: m.user.name || "Member",
    avatarUrl: m.user.avatarUrl,
  }));

  const settlementSummary = getSettlementSummary(
    membersForCalc,
    group.expenses,
    group.settlements
  );

  const totalSpent = group.expenses.reduce((sum, e) => sum + e.amount, 0);

  return NextResponse.json({
    group,
    currentUser: user,
    currentMembership: membership,
    totalSpent: Math.round(totalSpent * 100) / 100,
    settlementSummary,
  });
}
