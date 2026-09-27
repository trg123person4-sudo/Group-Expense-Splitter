import { describe, it, expect } from "vitest";
import {
  calculateNetBalances,
  simplifyDebts,
  getSettlementSummary,
  BalanceMember,
  BalanceExpense,
  BalanceSettlement,
} from "../src/lib/settlement";

describe("Settlement Algorithm - Exact Greedy Debt Simplification", () => {
  const alice: BalanceMember = { id: "u1", name: "Alice" };
  const bob: BalanceMember = { id: "u2", name: "Bob" };
  const charlie: BalanceMember = { id: "u3", name: "Charlie" };
  const david: BalanceMember = { id: "u4", name: "David" };
  const members = [alice, bob, charlie, david];

  it("calculates net balances correctly for equal split expense", () => {
    // Alice paid $100 for dinner split equally across Alice, Bob, Charlie, David ($25 each)
    const expenses: BalanceExpense[] = [
      {
        paidBy: "u1",
        amount: 100,
        splits: [
          { userId: "u1", shareAmount: 25 },
          { userId: "u2", shareAmount: 25 },
          { userId: "u3", shareAmount: 25 },
          { userId: "u4", shareAmount: 25 },
        ],
      },
    ];

    const balances = calculateNetBalances(members, expenses);

    // Alice paid $100, owes $25 => Net +$75
    expect(balances["u1"]).toBe(75);
    // Bob owes $25 => Net -$25
    expect(balances["u2"]).toBe(-25);
    expect(balances["u3"]).toBe(-25);
    expect(balances["u4"]).toBe(-25);

    // Sum of all net balances in any group must ALWAYS be 0
    const sum = Object.values(balances).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum)).toBeLessThan(0.001);
  });

  it("simplifies circular debts efficiently to at most n-1 transactions", () => {
    // Circular debts scenario:
    // Alice pays $30 for Bob ($30)
    // Bob pays $30 for Charlie ($30)
    // Charlie pays $30 for Alice ($30)
    // Net should be: 0 for all, 0 transactions needed!
    const circularExpenses: BalanceExpense[] = [
      { paidBy: "u1", amount: 30, splits: [{ userId: "u2", shareAmount: 30 }] },
      { paidBy: "u2", amount: 30, splits: [{ userId: "u3", shareAmount: 30 }] },
      { paidBy: "u3", amount: 30, splits: [{ userId: "u1", shareAmount: 30 }] },
    ];

    const summary = getSettlementSummary([alice, bob, charlie], circularExpenses);

    expect(summary.netBalances["u1"]).toBe(0);
    expect(summary.netBalances["u2"]).toBe(0);
    expect(summary.netBalances["u3"]).toBe(0);
    expect(summary.transactions.length).toBe(0);
  });

  it("caps transactions at n - 1 for n participants", () => {
    // 4 participants with complex uneven debts:
    // Net: Alice +60, Bob +40, Charlie -70, David -30
    const balances = {
      u1: 60,
      u2: 40,
      u3: -70,
      u4: -30,
    };

    const txns = simplifyDebts(members, balances);

    // Transactions must be <= 3 (n - 1 = 4 - 1 = 3)
    expect(txns.length).toBeLessThanOrEqual(3);

    // Largest debtor (Charlie: -70) matches with largest creditor (Alice: +60)
    // Charlie pays Alice $60. Alice is cleared. Charlie has -$10 left.
    // Next, Charlie pays Bob $10. Charlie is cleared. Bob has +$30 left.
    // David pays Bob $30. Both cleared.
    expect(txns).toEqual([
      expect.objectContaining({ fromUser: "u3", toUser: "u1", amount: 60 }),
      expect.objectContaining({ fromUser: "u4", toUser: "u2", amount: 30 }),
      expect.objectContaining({ fromUser: "u3", toUser: "u2", amount: 10 }),
    ]);

    // Total transaction amount equals total debt
    const totalSettled = txns.reduce((sum, t) => sum + t.amount, 0);
    expect(totalSettled).toBe(100);
  });

  it("accounts for completed settlements", () => {
    // Alice paid $100 for Bob ($50) and Alice ($50). Bob's balance is -50.
    const expenses: BalanceExpense[] = [
      {
        paidBy: "u1",
        amount: 100,
        splits: [
          { userId: "u1", shareAmount: 50 },
          { userId: "u2", shareAmount: 50 },
        ],
      },
    ];

    // Bob settles $30 via Venmo
    const settlements: BalanceSettlement[] = [
      {
        fromUser: "u2",
        toUser: "u1",
        amount: 30,
        status: "completed",
      },
    ];

    const balances = calculateNetBalances([alice, bob], expenses, settlements);

    // Bob originally owed $50, paid $30, now owes $20 (-20)
    expect(balances["u2"]).toBe(-20);
    // Alice is now owed $20 (+20)
    expect(balances["u1"]).toBe(20);

    const txns = simplifyDebts([alice, bob], balances);
    expect(txns.length).toBe(1);
    expect(txns[0]).toEqual(
      expect.objectContaining({
        fromUser: "u2",
        toUser: "u1",
        amount: 20,
      })
    );
  });
});
