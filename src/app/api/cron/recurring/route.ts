import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastGroupUpdate } from "@/lib/realtime";

export async function GET(req: Request) {
  return handleRecurringCron(req);
}

export async function POST(req: Request) {
  return handleRecurringCron(req);
}

async function handleRecurringCron(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json(
        { error: "Server Configuration Error: CRON_SECRET must be configured" },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid cron secret" },
        { status: 401 }
      );
    }

    const now = new Date();

    // Find all active recurring expenses
    const recurringExpenses = await prisma.expense.findMany({
      where: {
        isRecurring: true,
      },
      include: {
        splits: true,
        group: true,
        payer: true,
      },
    });

    const createdExpenses = [];

    for (const exp of recurringExpenses) {
      const lastDate = new Date(exp.date);
      const nextDate = new Date(lastDate);

      if (exp.recurringPeriod === "weekly") {
        nextDate.setDate(nextDate.getDate() + 7);
      } else {
        // Default monthly
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      // Check if due
      if (nextDate <= now) {
        // Create new occurrence in transaction
        const newExpense = await prisma.$transaction(async (tx) => {
          // Disable recurring flag on previous anchor
          await tx.expense.update({
            where: { id: exp.id },
            data: { isRecurring: false },
          });

          // Create new recurring instance
          return await tx.expense.create({
            data: {
              groupId: exp.groupId,
              description: exp.description,
              amount: exp.amount,
              currency: exp.currency,
              category: exp.category,
              paidBy: exp.paidBy,
              date: nextDate,
              splitType: exp.splitType,
              isRecurring: true,
              recurringPeriod: exp.recurringPeriod,
              splits: {
                create: exp.splits.map((s) => ({
                  userId: s.userId,
                  shareAmount: s.shareAmount,
                })),
              },
            },
            include: {
              splits: true,
            },
          });
        });

        // Broadcast realtime update to group
        await broadcastGroupUpdate(exp.groupId, {
          type: "expense_created",
          expenseId: newExpense.id,
          recurring: true,
        });

        createdExpenses.push({
          id: newExpense.id,
          description: newExpense.description,
          amount: newExpense.amount,
          date: newExpense.date,
          group: exp.group.name,
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      activeRecurringCount: recurringExpenses.length,
      generatedCount: createdExpenses.length,
      createdExpenses,
    });
  } catch (err: any) {
    console.error("Recurring cron error:", err);
    return NextResponse.json({ error: err.message || "Failed to process recurring expenses" }, { status: 500 });
  }
}
