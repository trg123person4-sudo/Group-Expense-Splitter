import { prisma } from "./prisma";
import { calculateNetBalances, simplifyDebts } from "./settlement";
import Anthropic from "@anthropic-ai/sdk";

export interface AssistantCitation {
  id: string;
  title: string;
  amount: number;
  date: string | Date;
  paidBy: string;
  category?: string;
  receiptUrl?: string;
}

export interface AssistantResponse {
  answer: string;
  citations: AssistantCitation[];
  toolExecuted?: string;
  data?: any;
}

/**
 * Tool 1: Get User Net Balance & Direct Counterparty Debts
 */
export async function toolGetUserBalance(groupId: string, userId: string, targetUserName?: string) {
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
    name: m.user.name || "Member",
    avatarUrl: m.user.avatarUrl,
  }));

  const netBalances = calculateNetBalances(members, group.expenses, group.settlements);
  const myNet = netBalances[userId] || 0;
  const userMap = new Map(members.map((m) => [m.id, m]));
  const simplified = simplifyDebts(members, netBalances);

  let targetUser = null;
  if (targetUserName) {
    const search = targetUserName.toLowerCase().trim();
    targetUser = members.find((m) => (m.name || "").toLowerCase().includes(search));
  }

  // Relevant simplified transactions involving this user
  const myTransactions = simplified.filter(
    (t) => t.fromUser === userId || t.toUser === userId
  );

  return {
    userNetBalance: myNet,
    currency: group.currency,
    targetUser: targetUser ? { id: targetUser.id, name: targetUser.name } : null,
    simplifiedSettlements: myTransactions.map((t) => ({
      fromId: t.fromUser,
      fromName: userMap.get(t.fromUser)?.name || "Unknown",
      toId: t.toUser,
      toName: userMap.get(t.toUser)?.name || "Unknown",
      amount: t.amount,
      iOweThem: t.fromUser === userId,
    })),
  };
}

/**
 * Tool 2: Get Category Breakdown & Spending Totals
 */
export async function toolGetCategorySpending(groupId: string, category?: string) {
  const whereClause: any = { groupId };
  if (category) {
    whereClause.category = category.toLowerCase().trim();
  }

  const expenses = await prisma.expense.findMany({
    where: whereClause,
    include: { payer: true },
    orderBy: { date: "desc" },
  });

  const categoryTotals: Record<string, number> = {};
  let totalAmount = 0;

  for (const exp of expenses) {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    totalAmount += exp.amount;
  }

  return {
    totalSpent: totalAmount,
    categoryTotals,
    categoryFiltered: category || null,
    expenses: expenses.map((e) => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      category: e.category,
      paidByName: e.payer.name || "Member",
      receiptImageUrl: e.receiptImageUrl || undefined,
      date: e.date,
    })),
  };
}

/**
 * Tool 3: Search Expenses by Keyword or Description
 */
export async function toolSearchExpenses(groupId: string, query?: string, limit: number = 10) {
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
    take: limit,
  });

  return {
    count: expenses.length,
    expenses: expenses.map((e) => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      category: e.category,
      paidByName: e.payer.name || "Member",
      receiptImageUrl: e.receiptImageUrl || undefined,
      date: e.date,
      splitType: e.splitType,
      itemsCount: e.items.length,
    })),
  };
}

/**
 * Tool 4: Get Settlement Plan ($O(n-1)$ Debt Simplification)
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
    name: m.user.name || "Member",
    avatarUrl: m.user.avatarUrl,
  }));

  const userMap = new Map(members.map((m) => [m.id, m]));
  const netBalances = calculateNetBalances(members, group.expenses, group.settlements);
  const transactions = simplifyDebts(members, netBalances);

  return {
    currency: group.currency,
    netBalances,
    transactions: transactions.map((t) => ({
      fromId: t.fromUser,
      fromName: userMap.get(t.fromUser)?.name || "Unknown",
      toId: t.toUser,
      toName: userMap.get(t.toUser)?.name || "Unknown",
      amount: t.amount,
    })),
  };
}

const CLAUDE_TOOLS: Anthropic.Tool[] = [
  {
    name: "getUserBalance",
    description: "Look up user net balance, who they owe, or who owes them in the group. Supports querying specific member by name.",
    input_schema: {
      type: "object",
      properties: {
        targetUserName: {
          type: "string",
          description: "Optional name of the member to check balances with (e.g. 'Sarah', 'David'). Can be any group member.",
        },
      },
    },
  },
  {
    name: "getCategorySpending",
    description: "Get total spending broken down by category (food, travel, lodging, entertainment, utilities, groceries, shopping) or overall group spending.",
    input_schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Optional category filter like 'food', 'travel', 'lodging', 'utilities', etc.",
        },
      },
    },
  },
  {
    name: "searchExpenses",
    description: "Search specific expense records by description or keyword, or list recent expenses in the group.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Keyword or description to search for (e.g. 'dinner', 'villa', 'flight')",
        },
        limit: {
          type: "number",
          description: "Maximum number of expenses to retrieve (default 10)",
        },
      },
    },
  },
  {
    name: "getSettlementPlan",
    description: "Get the complete debt-simplification settlement plan showing all minimal optimal payments needed to settle all group debts.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
];

/**
 * Main Ledger Assistant Dispatcher
 * Calls Claude with dynamic tool definitions. Generates final response from genuine tool output.
 */
export const answerLedgerQuestion = queryLedgerAssistant;

export async function queryLedgerAssistant(
  groupId: string,
  currentUserId: string,
  userPrompt: string
): Promise<AssistantResponse> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: { include: { user: true } },
    },
  });

  if (!group) throw new Error("Group not found");

  const currentUser = group.members.find((m) => m.user.id === currentUserId)?.user;
  const currentUserName = currentUser?.name || "Current User";
  const memberNames = group.members.map((m) => m.user.name || "Member").join(", ");

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    try {
      const anthropic = new Anthropic({ apiKey });

      const systemPrompt = `You are Tally's verified ledger assistant.
You have access to real financial database query tools for the group "${group.name}".
Currency: ${group.currency}
Current logged-in user: ${currentUserName} (ID: ${currentUserId})
All group members: ${memberNames}

Always choose the appropriate tool(s) to answer financial questions accurately.
Never fabricate or hallucinate financial numbers. All figures must be grounded in tool results.
Explain the answer clearly and concisely in natural language based on the returned tool data.`;

      const initialMessage = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        tools: CLAUDE_TOOLS,
      });

      const toolUseBlock = initialMessage.content.find((c) => c.type === "tool_use");

      if (toolUseBlock && toolUseBlock.type === "tool_use") {
        const toolName = toolUseBlock.name;
        const toolInput = toolUseBlock.input as any;

        let toolResult: any = null;
        const citations: AssistantCitation[] = [];

        if (toolName === "getUserBalance") {
          toolResult = await toolGetUserBalance(groupId, currentUserId, toolInput.targetUserName);
          const recent = await toolSearchExpenses(groupId, undefined, 2);
          for (const exp of recent.expenses) {
            citations.push({
              id: exp.id,
              title: exp.description,
              amount: exp.amount,
              date: exp.date,
              paidBy: exp.paidByName,
              receiptUrl: exp.receiptImageUrl,
            });
          }
        } else if (toolName === "getCategorySpending") {
          toolResult = await toolGetCategorySpending(groupId, toolInput.category);
          for (const exp of toolResult.expenses.slice(0, 5)) {
            citations.push({
              id: exp.id,
              title: exp.description,
              amount: exp.amount,
              date: exp.date,
              paidBy: exp.paidByName,
              category: exp.category,
              receiptUrl: exp.receiptImageUrl,
            });
          }
        } else if (toolName === "searchExpenses") {
          toolResult = await toolSearchExpenses(groupId, toolInput.query, toolInput.limit || 10);
          for (const exp of toolResult.expenses) {
            citations.push({
              id: exp.id,
              title: exp.description,
              amount: exp.amount,
              date: exp.date,
              paidBy: exp.paidByName,
              category: exp.category,
              receiptUrl: exp.receiptImageUrl,
            });
          }
        } else if (toolName === "getSettlementPlan") {
          toolResult = await toolGetSettlementPlan(groupId);
          const recent = await toolSearchExpenses(groupId, undefined, 2);
          for (const exp of recent.expenses) {
            citations.push({
              id: exp.id,
              title: exp.description,
              amount: exp.amount,
              date: exp.date,
              paidBy: exp.paidByName,
              receiptUrl: exp.receiptImageUrl,
            });
          }
        }

        // Send tool results back to Claude for final synthesized response
        const followup = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            { role: "user", content: userPrompt },
            { role: "assistant", content: initialMessage.content },
            {
              role: "user",
              content: [
                {
                  type: "tool_result",
                  tool_use_id: toolUseBlock.id,
                  content: JSON.stringify(toolResult),
                },
              ],
            },
          ],
        });

        const textBlock = followup.content.find((c) => c.type === "text");
        const answer = textBlock && textBlock.type === "text" ? textBlock.text : "Processed request successfully.";

        return {
          answer,
          citations,
          toolExecuted: toolName,
          data: toolResult,
        };
      } else {
        const textBlock = initialMessage.content.find((c) => c.type === "text");
        return {
          answer: textBlock && textBlock.type === "text" ? textBlock.text : "How can I help you analyze the group ledger?",
          citations: [],
        };
      }
    } catch (err: any) {
      console.warn("Claude tool calling error, falling back to local grounded execution:", err.message);
    }
  }

  // Grounded database execution fallback if no ANTHROPIC_API_KEY is configured
  return executeGroundedFallback(groupId, currentUserId, userPrompt, group.members);
}

/**
 * Safe grounded fallback that extracts real member names and database queries
 * without keyword matching on hardcoded personas.
 */
async function executeGroundedFallback(
  groupId: string,
  currentUserId: string,
  userPrompt: string,
  members: any[]
): Promise<AssistantResponse> {
  const lower = userPrompt.toLowerCase();

  // 1. Detect if any actual group member's name was mentioned
  const mentionedMember = members.find((m) => {
    const firstName = (m.user.name || "").split(" ")[0].toLowerCase();
    return firstName.length > 1 && lower.includes(firstName);
  });

  if (lower.includes("owe") || lower.includes("balance") || lower.includes("net") || mentionedMember) {
    const balanceData = await toolGetUserBalance(groupId, currentUserId, mentionedMember?.user.name);
    const citations: AssistantCitation[] = [];
    const recent = await toolSearchExpenses(groupId, undefined, 2);
    for (const exp of recent.expenses) {
      citations.push({
        id: exp.id,
        title: exp.description,
        amount: exp.amount,
        date: exp.date,
        paidBy: exp.paidByName,
        receiptUrl: exp.receiptImageUrl,
      });
    }

    if (mentionedMember && balanceData.targetUser) {
      const txn = balanceData.simplifiedSettlements.find(
        (t) =>
          (t.fromId === currentUserId && t.toId === balanceData.targetUser?.id) ||
          (t.toId === currentUserId && t.fromId === balanceData.targetUser?.id)
      );

      if (txn) {
        if (txn.fromId === currentUserId) {
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
          answer: `You and **${balanceData.targetUser.name}** are currently square. No direct settlement is needed between you two.`,
          citations,
          toolExecuted: "getUserBalance",
          data: balanceData,
        };
      }
    }

    const netText = balanceData.userNetBalance >= 0
      ? `You are owed a total of **+$${balanceData.userNetBalance.toFixed(2)}** across the group.`
      : `You owe a total of **$${Math.abs(balanceData.userNetBalance).toFixed(2)}** to settle your share.`;

    const txnsSummary = balanceData.simplifiedSettlements.length > 0
      ? `\n\nYour recommended minimal transactions:\n` +
        balanceData.simplifiedSettlements
          .map((t) => `• ${t.fromName} pays ${t.toName} **$${t.amount.toFixed(2)}**`)
          .join("\n")
      : `\n\nAll your balances are currently settled!`;

    return {
      answer: `${netText}${txnsSummary}`,
      citations,
      toolExecuted: "getUserBalance",
      data: balanceData,
    };
  }

  // 2. Spending / category question
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
      return {
        answer: `The total recorded expenditure for this group is **$${spendingData.totalSpent.toFixed(2)}** across ${spendingData.expenses.length} expense(s).`,
        citations,
        toolExecuted: "getCategorySpending",
        data: spendingData,
      };
    }
  }

  // 3. Settle plan
  if (lower.includes("settle") || lower.includes("plan") || lower.includes("pay whom") || lower.includes("graph")) {
    const plan = await toolGetSettlementPlan(groupId);
    const txns = plan.transactions;
    const summary = txns.length > 0
      ? `Here is the optimal $O(n-1)$ settlement plan to settle all group debts in ${txns.length} payment(s):\n\n` +
        txns.map((t) => `• **${t.fromName}** pays **${t.toName}** **$${t.amount.toFixed(2)}**`).join("\n")
      : "All debts are completely settled! No payments needed.";

    return {
      answer: summary,
      citations: [],
      toolExecuted: "getSettlementPlan",
      data: plan,
    };
  }

  // 4. Default search
  const results = await toolSearchExpenses(groupId, undefined, 5);
  return {
    answer: `I found ${results.count} recent expenses in this group. You can ask me how much you owe any member, how much was spent on categories like food or travel, or ask for the minimal settle-up plan.`,
    citations: results.expenses.map((e) => ({
      id: e.id,
      title: e.description,
      amount: e.amount,
      date: e.date,
      paidBy: e.paidByName,
      category: e.category,
      receiptUrl: e.receiptImageUrl,
    })),
    toolExecuted: "searchExpenses",
    data: results,
  };
}
