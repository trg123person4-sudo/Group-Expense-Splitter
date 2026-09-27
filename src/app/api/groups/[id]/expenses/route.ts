import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, authorizeGroupAccess } from "@/lib/auth";
import { z } from "zod";
import {
  calculateEqualSplit,
  calculateExactSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
  calculateItemizedSplit,
} from "@/lib/split-calculator";
import { broadcastGroupUpdate } from "@/lib/realtime";

const createExpenseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be greater than zero"),
  currency: z.string().default("USD"),
  category: z.string().default("general"),
  paidBy: z.string(),
  date: z.string().optional(),
  receiptImageUrl: z.string().optional().nullable(),
  splitType: z.enum(["equal", "exact", "percentage", "shares", "itemized"]),
  isRecurring: z.boolean().default(false),
  recurringPeriod: z.string().optional().nullable(),
  // For equal split
  selectedUserIds: z.array(z.string()).optional(),
  // For exact split
  exactAmounts: z.record(z.number()).optional(),
  // For percentage split
  percentages: z.record(z.number()).optional(),
  // For shares split
  sharesCount: z.record(z.number()).optional(),
  // For itemized split
  itemizedData: z
    .object({
      items: z.array(
        z.object({
          name: z.string(),
          price: z.number(),
          assignedUserIds: z.array(z.string()),
        })
      ),
      taxAmount: z.number().default(0),
      tipAmount: z.number().default(0),
    })
    .optional(),
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

    // Verify user is a member of the group
    const membership = await authorizeGroupAccess(groupId, user.id);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden: Not in group" }, { status: 403 });
    }

    const body = await req.json();
    const validated = createExpenseSchema.parse(body);

    // Fetch all group members
    const groupMembers = await prisma.groupMember.findMany({
      where: { groupId },
      include: { user: true },
    });
    const allMemberIds = groupMembers.map((m) => m.userId);

    // Compute splits based on splitType
    let splits: { userId: string; amount: number }[] = [];

    if (validated.splitType === "equal") {
      const participants = validated.selectedUserIds?.length
        ? validated.selectedUserIds
        : allMemberIds;
      const res = calculateEqualSplit(validated.amount, participants);
      if (!res.isValid) {
        return NextResponse.json({ error: res.errorMessage }, { status: 400 });
      }
      splits = res.shares;
    } else if (validated.splitType === "exact") {
      if (!validated.exactAmounts) {
        return NextResponse.json({ error: "Exact amounts map required" }, { status: 400 });
      }
      const res = calculateExactSplit(validated.amount, validated.exactAmounts);
      if (!res.isValid) {
        return NextResponse.json({ error: res.errorMessage }, { status: 400 });
      }
      splits = res.shares;
    } else if (validated.splitType === "percentage") {
      if (!validated.percentages) {
        return NextResponse.json({ error: "Percentages map required" }, { status: 400 });
      }
      const res = calculatePercentageSplit(validated.amount, validated.percentages);
      if (!res.isValid) {
        return NextResponse.json({ error: res.errorMessage }, { status: 400 });
      }
      splits = res.shares;
    } else if (validated.splitType === "shares") {
      if (!validated.sharesCount) {
        return NextResponse.json({ error: "Shares count map required" }, { status: 400 });
      }
      const res = calculateSharesSplit(validated.amount, validated.sharesCount);
      if (!res.isValid) {
        return NextResponse.json({ error: res.errorMessage }, { status: 400 });
      }
      splits = res.shares;
    } else if (validated.splitType === "itemized") {
      if (!validated.itemizedData) {
        return NextResponse.json({ error: "Itemized receipt items required" }, { status: 400 });
      }
      const res = calculateItemizedSplit({
        items: validated.itemizedData.items,
        taxAmount: validated.itemizedData.taxAmount,
        tipAmount: validated.itemizedData.tipAmount,
        memberIds: allMemberIds,
      });
      if (!res.isValid) {
        return NextResponse.json({ error: res.errorMessage }, { status: 400 });
      }
      splits = res.shares;
    }

    // Create the expense and its splits in a transaction
    const expense = await prisma.$transaction(async (tx) => {
      const exp = await tx.expense.create({
        data: {
          groupId,
          description: validated.description,
          amount: validated.amount,
          currency: validated.currency,
          category: validated.category,
          paidBy: validated.paidBy,
          date: validated.date ? new Date(validated.date) : new Date(),
          receiptImageUrl: validated.receiptImageUrl || null,
          splitType: validated.splitType,
          isRecurring: validated.isRecurring,
          recurringPeriod: validated.recurringPeriod || null,
          splits: {
            create: splits.map((s) => ({
              userId: s.userId,
              shareAmount: s.amount,
            })),
          },
        },
      });

      // If itemized, create the items and assignments
      if (validated.splitType === "itemized" && validated.itemizedData) {
        for (const item of validated.itemizedData.items) {
          const createdItem = await tx.expenseItem.create({
            data: {
              expenseId: exp.id,
              name: item.name,
              price: item.price,
            },
          });

          for (const uid of item.assignedUserIds) {
            await tx.expenseItemAssignment.create({
              data: {
                expenseItemId: createdItem.id,
                userId: uid,
              },
            });
          }
        }
      }

      return exp;
    });

    // Notify other members
    const payer = groupMembers.find((m) => m.userId === validated.paidBy);
    const notifications = splits
      .filter((s) => s.userId !== user.id)
      .map((s) => ({
        userId: s.userId,
        type: "expense_added",
        payload: JSON.stringify({
          groupId,
          groupName: membership.group.name,
          description: validated.description,
          amount: validated.amount,
          paidByName: payer?.user.name || "Someone",
          yourShare: s.amount,
        }),
      }));

    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications });
    }

    await broadcastGroupUpdate(groupId, { type: "expense_created", expenseId: expense.id });

    return NextResponse.json({ success: true, expense }, { status: 201 });
  } catch (err: any) {
    console.error("Expense creation error:", err);
    return NextResponse.json({ error: err.message || "Failed to create expense" }, { status: 400 });
  }
}
