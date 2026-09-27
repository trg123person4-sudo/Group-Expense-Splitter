import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, authorizeGroupAccess } from "@/lib/auth";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  const { id: groupId, expenseId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await authorizeGroupAccess(groupId, user.id);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden: Not in group" }, { status: 403 });
  }

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
  });

  if (!expense || expense.groupId !== groupId) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  // Delete expense (cascades splits, items, comments)
  await prisma.expense.delete({
    where: { id: expenseId },
  });

  return NextResponse.json({ success: true, message: "Expense deleted" });
}
