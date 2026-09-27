import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import crypto from "crypto";

const createGroupSchema = z.object({
  name: z.string().min(2, "Group name must be at least 2 characters"),
  type: z.enum(["trip", "home", "couple", "other"]).default("trip"),
  currency: z.string().default("USD"),
  budgetLimit: z.number().optional().nullable(),
  memberEmails: z.array(z.string().email()).optional(),
});

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const skip = (page - 1) * limit;

  const total = await prisma.group.count({
    where: { members: { some: { userId: user.id } } },
  });

  const groups = await prisma.group.findMany({
    where: {
      members: {
        some: { userId: user.id },
      },
    },
    include: {
      members: {
        include: { user: true },
      },
      expenses: {
        include: { splits: true },
      },
      settlements: true,
      invitations: true,
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
  });

  return NextResponse.json({
    groups,
    currentUser: user,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + groups.length < total,
    },
  });
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = createGroupSchema.parse(body);

    const group = await prisma.group.create({
      data: {
        name: validated.name,
        type: validated.type,
        currency: validated.currency,
        budgetLimit: validated.budgetLimit || null,
        createdBy: user.id,
        members: {
          create: [{ userId: user.id, role: "admin" }],
        },
      },
      include: {
        members: { include: { user: true } },
      },
    });

    // Instead of auto-creating fake user accounts, create real invitations
    if (validated.memberEmails && validated.memberEmails.length > 0) {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      for (const rawEmail of validated.memberEmails) {
        const email = rawEmail.toLowerCase().trim();
        if (email === user.email.toLowerCase()) continue;

        const token = crypto.randomUUID();
        await prisma.invitation.upsert({
          where: { groupId_email: { groupId: group.id, email } },
          create: {
            groupId: group.id,
            email,
            token,
            invitedBy: user.id,
            status: "pending",
            expiresAt,
          },
          update: {
            token,
            status: "pending",
            expiresAt,
          },
        });
      }
    }

    const fullGroup = await prisma.group.findUnique({
      where: { id: group.id },
      include: {
        members: { include: { user: true } },
        invitations: true,
      },
    });

    return NextResponse.json({ group: fullGroup }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create group" }, { status: 400 });
  }
}
