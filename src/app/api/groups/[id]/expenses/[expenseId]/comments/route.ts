import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, authorizeGroupAccess } from "@/lib/auth";

export async function POST(
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

  const { text } = await req.json();
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Comment text cannot be empty" }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: {
      expenseId,
      userId: user.id,
      text: text.trim(),
    },
    include: {
      user: true,
    },
  });

  return NextResponse.json({ comment }, { status: 201 });
}
