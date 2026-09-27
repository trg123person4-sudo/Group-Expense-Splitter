import { prisma } from "./prisma";
import { calculateNetBalances, simplifyDebts } from "./settlement";

export interface AssistantCitation {
  id: string;
  title: string;
  amount: number;
  date?: string;
  category?: string;
  paidBy?: string;
  receiptUrl?: string | null;
  items?: { name: string; price: number }[];
}

export interface AssistantResponse {
  answer: string;
  citations: AssistantCitation[];
  toolExecuted: string;
  data: any;
}

/**
 * Tool 1: Get User Balances & Pairwise IOUs
 */
export async function toolGetUserBalance(groupId: string, userId: string, targetUserName?: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: { include: { user: true } },
      expenses: { include: { splits: true, payer: true } },
      settlements: true,
    },
  });

  if (!group) throw new Error("Group not found");

  const members = group.members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    avatarUrl: m.user.avatarUrl,
  }));

  const netBalances = calculateNetBalances(members, group.expenses, group.settlements);
  const myNet = netBalances[userId] || 0;
  const userMap = new Map(members.map((m) => [m.id, m]));
  const simplified = simplifyDebts(members, netBalances);

  let targetUser = null;
  if (targetUserName) {
    const search = targetUserName.toLowerCase();
    targetUser = members.find((m) => m.name.toLowerCase().includes(search));
  }

  // Relevant simplified transactions involving this user
  const myTransactions = simplified.filter(
    (t) => t.fromUser === userId || t.toUser === userId
  );

  return {
    userNetBalance: myNet,
    userOwesTotal: myNet < 0 ? Math.abs(myNet) : 0,
    userIsOwedTotal: myNet > 0 ? myNet : 0,
    targetUser: targetUser ? { id: targetUser.id, name: targetUser.name } : null,
    simplifiedSettlements: myTransactions,
    allBalances: netBalances,
  };
}

/**
 * Tool 2: Category Spending Breakdown
 */
export async function toolGetCategorySpending(groupId: string, targetCategory?: string) {
  const expenses = await prisma.expense.findMany({
    where: {
      groupId,
      ...(targetCategory ? { category: { equals: targetCategory.toLowerCase() } } : {}),
    },
    include: { payer: true },
    orderBy: { date: "desc" },
  });

  const categoryTotals: Record<string, number> = {};
  let totalSpent = 0;

  for (const exp of expenses) {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    totalSpent += exp.amount;
  }

  return {
    totalSpent: Math.round(totalSpent * 100) / 100,
    categoryTotals,
    expenses: expenses.map((e) => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      category: e.category,
      paidByName: e.payer.name,
      date: e.date.toISOString().split("T")[0],
      receiptImageUrl: e.receiptImageUrl,
    })),
  };
}

/**
 * Tool 3: Search Expenses & Receipts
 */
export async function toolSearchExpenses(groupId: string, query?: string) {
  const expenses = await prisma.expense.findMany({
    where: {
      groupId,
      ...(query
        ? {
            OR: [
              { description: { contains: query } },
              { category: { contains: query } },
            ],
          }
        : {}),
    },
    include: {
      payer: true,
      items: true,
      splits: { include: { user: true } },
    },
    orderBy: { date: "desc" },
  });

  return {
    count: expenses.length,
    expenses: expenses.map((e) => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      category: e.category,
      paidByName: e.payer.name,
      date: e.date.toISOString().split("T")[0],
      receiptImageUrl: e.receiptImageUrl,
      items: e.items.map((i) => ({ name: i.name, price: i.price })),
    })),
  };
}

/**
 * Tool 4: Settle-up Plan
 */
export async function toolGetSettlementPlan(groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: { include: { user: true } },
      expenses: { include: { splits: true } },
      settlements: true,
    },
  });

  if (!group) throw new Error("Group not found");

  const members = group.members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    avatarUrl: m.user.avatarUrl,
  }));

  const netBalances = calculateNetBalances(members, group.expenses, group.settlements);
  const transactions = simplifyDebts(members, netBalances);

  return {
    netBalances,
    transactions,
    totalToSettle: transactions.reduce((sum, t) => sum + t.amount, 0),
  };
}

/**
 * Core Assistant Reasoner: Maps question to database tool, runs query, and builds answer with citations.
 */
export async function answerLedgerQuestion(
  groupId: string,
  currentUserId: string,
  userPrompt: string
): Promise<AssistantResponse> {
  const lower = userPrompt.toLowerCase();

  // 1. Balance / Owe question (e.g., "how much do I owe Sarah", "what's my balance", "who owes what")
  if (lower.includes("owe") || lower.includes("balance") || lower.includes("settle") || lower.includes("due")) {
    // Check if a specific name is mentioned
    const names = ["sarah", "alex", "david", "priya"];
    const mentionedName = names.find((n) => lower.includes(n));

    const balanceData = await toolGetUserBalance(groupId, currentUserId, mentionedName);
    const citations: AssistantCitation[] = [];

    // Find any relevant expenses to cite
    const recent = await toolSearchExpenses(groupId);
    if (recent.expenses.length > 0) {
      citations.push({
        id: recent.expenses[0].id,
        title: recent.expenses[0].description,
        amount: recent.expenses[0].amount,
        date: recent.expenses[0].date,
        paidBy: recent.expenses[0].paidByName,
        receiptUrl: recent.expenses[0].receiptImageUrl,
      });
    }

    if (mentionedName && balanceData.targetUser) {
      // Find direct simplified settlement involving target user
      const txn = balanceData.simplifiedSettlements.find(
        (t) =>
          (t.fromUser === currentUserId && t.toUser === balanceData.targetUser?.id) ||
          (t.toUser === currentUserId && t.fromUser === balanceData.targetUser?.id)
      );

      if (txn) {
        if (txn.fromUser === currentUserId) {
          return {
            answer: `According to the verified ledger and simplified debt calculation, you currently owe **${balanceData.targetUser.name}** **$${txn.amount.toFixed(2)}**.`,
            citations,
            toolExecuted: "getUserBalance",
            data: balanceData,
          };
        } else {
          return {
            answer: `Good news! **${balanceData.targetUser.name}** owes you **$${txn.amount.toFixed(2)}** according to the group ledger.`,
            citations,
            toolExecuted: "getUserBalance",
            data: balanceData,
          };
        }
      } else {
        return {
          answer: `Under our debt simplification algorithm, you have **$0.00** direct debt with **${balanceData.targetUser.name}**. Your overall net group balance is **${balanceData.userNetBalance >= 0 ? `+$${balanceData.userNetBalance.toFixed(2)}` : `-$${Math.abs(balanceData.userNetBalance).toFixed(2)}`}**.`,
          citations,
          toolExecuted: "getUserBalance",
          data: balanceData,
        };
      }
    }

    // General balance
    const netFormatted = balanceData.userNetBalance >= 0
      ? `You are owed a total of **+$${balanceData.userNetBalance.toFixed(2)}** across the group.`
      : `You owe a total of **$${Math.abs(balanceData.userNetBalance).toFixed(2)}** to settle your share.`;

    const txnsSummary = balanceData.simplifiedSettlements.length > 0
      ? `\n\nYour recommended minimal transactions:\n` +
        balanceData.simplifiedSettlements
          .map((t) => `• ${t.fromName} pays ${t.toName} **$${t.amount.toFixed(2)}**`)
          .join("\n")
      : `\n\nAll your balances are currently settled!`;

    return {
      answer: `${netFormatted}${txnsSummary}`,
      citations,
      toolExecuted: "getUserBalance",
      data: balanceData,
    };
  }

  // 2. Spending / Category question (e.g. "what did we spend on food", "how much spent on lodging")
  const categories = ["food", "travel", "lodging", "entertainment", "utilities", "groceries", "shopping"];
  const matchedCat = categories.find((c) => lower.includes(c));

  if (matchedCat || lower.includes("spend") || lower.includes("total") || lower.includes("cost") || lower.includes("expenses")) {
    const spendingData = await toolGetCategorySpending(groupId, matchedCat);

    const citations: AssistantCitation[] = spendingData.expenses.map((e) => ({
      id: e.id,
      title: e.description,
      amount: e.amount,
      date: e.date,
      paidBy: e.paidByName,
      category: e.category,
      receiptUrl: e.receiptImageUrl,
    }));

    if (matchedCat) {
      const catTotal = spendingData.categoryTotals[matchedCat] || 0;
      return {
        answer: `In total, the group has spent **$${catTotal.toFixed(2)}** on **${matchedCat}** across ${spendingData.expenses.length} recorded expense(s).`,
        citations,
        toolExecuted: "getCategorySpending",
        data: spendingData,
      };
    } else {
      const breakdownText = Object.entries(spendingData.categoryTotals)
        .map(([cat, amt]) => `• **${cat.toUpperCase()}**: $${amt.toFixed(2)}`)
        .join("\n");

      return {
        answer: `The group has recorded a total expenditure of **$${spendingData.totalSpent.toFixed(2)}**.\n\nCategory Breakdown:\n${breakdownText}`,
        citations,
        toolExecuted: "getCategorySpending",
        data: spendingData,
      };
    }
  }

  // 3. Search / Query question (e.g., "who paid for the villa", "seafood receipt")
  const searchResult = await toolSearchExpenses(groupId);
  // Match query words
  const words = lower.split(/\s+/).filter((w) => w.length > 3);
  const matched = searchResult.expenses.filter((e) =>
    words.some((w) => e.description.toLowerCase().includes(w) || e.category.toLowerCase().includes(w))
  );

  if (matched.length > 0) {
    const top = matched[0];
    const citations: AssistantCitation[] = [
      {
        id: top.id,
        title: top.description,
        amount: top.amount,
        date: top.date,
        paidBy: top.paidByName,
        category: top.category,
        receiptUrl: top.receiptImageUrl,
        items: top.items,
      },
    ];

    return {
      answer: `Found **${top.description}**: total of **$${top.amount.toFixed(2)}** paid by **${top.paidByName}** on ${top.date}.${
        top.items.length > 0 ? ` It includes ${top.items.length} line items (e.g., ${top.items.map((i) => i.name).slice(0, 2).join(", ")}).` : ""
      }`,
      citations,
      toolExecuted: "searchExpenses",
      data: top,
    };
  }

  // Default: Fallback to general group overview
  const overview = await toolSearchExpenses(groupId);
  return {
    answer: `Here is the current verified ledger summary: the group has **${overview.count}** recorded expenses totaling **$${overview.expenses.reduce((s, e) => s + e.amount, 0).toFixed(2)}**. You can ask me specific questions like *"how much do I owe Sarah"*, *"what did we spend on food"*, or *"who paid for the villa"*!`,
    citations: overview.expenses.slice(0, 2).map((e) => ({
      id: e.id,
      title: e.description,
      amount: e.amount,
      date: e.date,
      paidBy: e.paidByName,
      category: e.category,
      receiptUrl: e.receiptImageUrl,
    })),
    toolExecuted: "searchExpenses",
    data: overview,
  };
}
