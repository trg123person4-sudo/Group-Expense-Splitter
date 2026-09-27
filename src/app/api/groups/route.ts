import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const createGroupSchema = z.object({
  name: z.string().min(2, "Group name must be at least 2 characters"),
  type: z.enum(["trip", "home", "couple", "other"]).default("trip"),
  currency: z.string().default("USD"),
  budgetLimit: z.number().optional().nullable(),
  memberEmails: z.array(z.string().email()).optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ groups, currentUser: user });
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

    // If initial members were provided, add or create them
    if (validated.memberEmails && validated.memberEmails.length > 0) {
      for (const email of validated.memberEmails) {
        if (email.toLowerCase() === user.email.toLowerCase()) continue;
        let memberUser = await prisma.user.findUnique({ where: { email } });
        if (!memberUser) {
          memberUser = await prisma.user.create({
            data: {
              name: email.split("@")[0],
              email,
              avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
            },
          });
        }
        await prisma.groupMember.upsert({
          where: { groupId_userId: { groupId: group.id, userId: memberUser.id } },
          create: { groupId: group.id, userId: memberUser.id, role: "member" },
          update: {},
        });
      }
    }

    return NextResponse.json({ group }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create group" }, { status: 400 });
  }
}
