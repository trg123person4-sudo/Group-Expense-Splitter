import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { queryLedgerAssistant } from "../src/lib/ai-assistant";
import * as prismaModule from "../src/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

vi.mock("@anthropic-ai/sdk");

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    group: {
      findUnique: vi.fn(),
    },
    expense: {
      findMany: vi.fn(),
    },
    settlement: {
      findMany: vi.fn(),
    },
  },
}));

describe("AI Ledger Assistant Agentic Loop (src/lib/ai-assistant.ts)", () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalKey;
  });

  it("executes multi-tool agentic loop and collects citations across multiple tool calls", async () => {
    process.env.ANTHROPIC_API_KEY = "test-api-key";

    // Mock group data
    vi.mocked(prismaModule.prisma.group.findUnique).mockResolvedValue({
      id: "group-1",
      name: "Apartment 402",
      currency: "USD",
      members: [
        { user: { id: "user-1", name: "Alex Chen", avatarUrl: null } },
        { user: { id: "user-2", name: "Sarah Miller", avatarUrl: null } },
      ],
      expenses: [
        {
          id: "exp-1",
          description: "Whole Foods Groceries",
          amount: 120,
          date: new Date("2026-03-01"),
          paidBy: "user-1",
          category: "groceries",
          splits: [{ userId: "user-1", shareAmount: 60 }, { userId: "user-2", shareAmount: 60 }],
        },
      ],
      settlements: [],
    } as any);

    vi.mocked(prismaModule.prisma.expense.findMany).mockResolvedValue([
      {
        id: "exp-1",
        description: "Whole Foods Groceries",
        amount: 120,
        date: new Date("2026-03-01"),
        paidBy: "user-1",
        category: "groceries",
        payer: { name: "Alex Chen" },
        splits: [],
      } as any,
    ]);

    // Mock Anthropic SDK sequence:
    // Turn 1: tool_use for getCategorySpending
    // Turn 2: tool_use for getUserBalance
    // Turn 3: final text response
    const mockMessagesCreate = vi
      .fn()
      .mockResolvedValueOnce({
        content: [
          {
            type: "tool_use",
            id: "call_1",
            name: "getCategorySpending",
            input: { category: "groceries" },
          },
        ],
      })
      .mockResolvedValueOnce({
        content: [
          {
            type: "tool_use",
            id: "call_2",
            name: "getUserBalance",
            input: { targetUserName: "Sarah" },
          },
        ],
      })
      .mockResolvedValueOnce({
        content: [
          {
            type: "text",
            text: "You spent $120 on groceries, and Sarah owes you $60.",
          },
        ],
      });

    vi.mocked(Anthropic).mockImplementation(
      () =>
        ({
          messages: {
            create: mockMessagesCreate,
          },
        } as any)
    );

    const result = await queryLedgerAssistant(
      "group-1",
      "user-1",
      "What did we spend on groceries and how much does Sarah owe?"
    );

    // Verify 3 turns occurred in the agentic loop
    expect(mockMessagesCreate).toHaveBeenCalledTimes(3);

    // Verify both tools were recorded as executed
    expect(result.toolExecuted).toContain("getCategorySpending");
    expect(result.toolExecuted).toContain("getUserBalance");

    // Verify final synthesized answer
    expect(result.answer).toBe("You spent $120 on groceries, and Sarah owes you $60.");

    // Verify citations were collected and deduplicated
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.citations[0].id).toBe("exp-1");
  });
});
