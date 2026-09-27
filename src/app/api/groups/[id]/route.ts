import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, authorizeGroupAccess } from "@/lib/auth";
import { getSettlementSummary } from "@/lib/settlement";

export async function GET(
  _req: Request,
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;
    const membership = await authorizeGroupAccess(groupId, user.id);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden: Not a group member" }, { status: 403 });
    }

    // Admin role enforcement
    if (membership.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required to update group settings or remove members" }, { status: 403 });
    }

    const body = await req.json();
    const { name, currency, budgetLimit, removeUserId } = body;

    // Handle removing a member from the group
    if (removeUserId) {
      if (removeUserId === user.id) {
        return NextResponse.json({ error: "Admins cannot remove themselves. Transfer admin role or delete group instead." }, { status: 400 });
      }

      await prisma.groupMember.deleteMany({
        where: {
          groupId,
          userId: removeUserId,
        },
      });

      return NextResponse.json({ message: "Member removed successfully" });
    }

    const updateData: any = {};
    if (name && typeof name === "string") updateData.name = name.trim();
    if (currency && typeof currency === "string") updateData.currency = currency.trim();
    if (budgetLimit !== undefined) updateData.budgetLimit = budgetLimit === null ? null : Number(budgetLimit);

    const updated = await prisma.group.update({
      where: { id: groupId },
      data: updateData,
      include: {
        members: { include: { user: true } },
      },
    });

    return NextResponse.json({ group: updated });
  } catch (err: any) {
    console.error("Update group error:", err);
    return NextResponse.json({ error: err.message || "Failed to update group" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;
    const membership = await authorizeGroupAccess(groupId, user.id);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden: Not a group member" }, { status: 403 });
    }

    // Admin role enforcement
    if (membership.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Only group admins can delete or archive a group" }, { status: 403 });
    }

    await prisma.group.delete({
      where: { id: groupId },
    });

    return NextResponse.json({ success: true, message: "Group deleted successfully" });
  } catch (err: any) {
    console.error("Delete group error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete group" }, { status: 500 });
  }
}
