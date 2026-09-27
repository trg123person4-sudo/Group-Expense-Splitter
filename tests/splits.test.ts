import { describe, it, expect } from "vitest";
import {
  calculateEqualSplit,
  calculateExactSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
  calculateItemizedSplit,
} from "../src/lib/split-calculator";

describe("Split Calculations - Domain Math Verification", () => {
  it("splits equally with remainder penny distribution", () => {
    // $10 split among 3 people: $3.34, $3.33, $3.33
    const result = calculateEqualSplit(10.0, ["u1", "u2", "u3"]);
    expect(result.isValid).toBe(true);
    expect(result.shares.length).toBe(3);

    const sum = result.shares.reduce((acc, s) => acc + s.amount, 0);
    expect(sum).toBe(10.0);

    const amounts = result.shares.map((s) => s.amount);
    expect(amounts).toContain(3.34);
    expect(amounts.filter((a) => a === 3.33).length).toBe(2);
  });

  it("validates exact split sums strictly", () => {
    // Valid exact split
    const valid = calculateExactSplit(50.0, { u1: 30.0, u2: 20.0 });
    expect(valid.isValid).toBe(true);

    // Invalid exact split (doesn't sum to total)
    const invalid = calculateExactSplit(50.0, { u1: 30.0, u2: 15.0 });
    expect(invalid.isValid).toBe(false);
    expect(invalid.errorMessage).toContain("Difference");
  });

  it("calculates percentage split with 100% check", () => {
    const valid = calculatePercentageSplit(100.0, { u1: 50, u2: 30, u3: 20 });
    expect(valid.isValid).toBe(true);
    expect(valid.shares.find((s) => s.userId === "u1")?.amount).toBe(50.0);
    expect(valid.shares.find((s) => s.userId === "u2")?.amount).toBe(30.0);
    expect(valid.shares.find((s) => s.userId === "u3")?.amount).toBe(20.0);

    const invalid = calculatePercentageSplit(100.0, { u1: 50, u2: 30 });
    expect(invalid.isValid).toBe(false);
  });

  it("calculates shares ratio split accurately", () => {
    // $90 split: u1 has 2 shares, u2 has 1 share => 2/3 of 90 = $60, 1/3 of 90 = $30
    const result = calculateSharesSplit(90.0, { u1: 2, u2: 1 });
    expect(result.isValid).toBe(true);
    expect(result.shares.find((s) => s.userId === "u1")?.amount).toBe(60.0);
    expect(result.shares.find((s) => s.userId === "u2")?.amount).toBe(30.0);
  });

  it("calculates itemized receipt with proportional tax and tip", () => {
    // Scenario:
    // Item 1: Pizza ($30) assigned to Alice and Bob ($15 each)
    // Item 2: Salad ($10) assigned only to Bob ($10)
    // Item 3: Drink ($5) assigned only to Charlie ($5)
    // Subtotals: Alice: $15, Bob: $25, Charlie: $5. Total items = $45
    // Tax = $4.50 (10% of items)
    // Tip = $9.00 (20% of items)
    // Grand Total = $45 + $4.50 + $9.00 = $58.50
    // Proportions:
    // Alice has 15/45 = 1/3 of items -> Tax = $1.50, Tip = $3.00 => Total = $19.50
    // Bob has 25/45 = 5/9 of items -> Tax = $2.50, Tip = $5.00 => Total = $32.50
    // Charlie has 5/45 = 1/9 of items -> Tax = $0.50, Tip = $1.00 => Total = $6.50
    const input = {
      items: [
        { name: "Pizza", price: 30.0, assignedUserIds: ["alice", "bob"] },
        { name: "Salad", price: 10.0, assignedUserIds: ["bob"] },
        { name: "Drink", price: 5.0, assignedUserIds: ["charlie"] },
      ],
      taxAmount: 4.5,
      tipAmount: 9.0,
      memberIds: ["alice", "bob", "charlie"],
    };

    const result = calculateItemizedSplit(input);
    expect(result.isValid).toBe(true);

    const aliceShare = result.shares.find((s) => s.userId === "alice")?.amount;
    const bobShare = result.shares.find((s) => s.userId === "bob")?.amount;
    const charlieShare = result.shares.find((s) => s.userId === "charlie")?.amount;

    expect(aliceShare).toBe(19.5);
    expect(bobShare).toBe(32.5);
    expect(charlieShare).toBe(6.5);

    // Sum of all shares must equal exactly $58.50
    const totalSum = result.shares.reduce((sum, s) => sum + s.amount, 0);
    expect(totalSum).toBe(58.5);

    // Breakdown details
    expect(result.breakdown["alice"].taxShare).toBe(1.5);
    expect(result.breakdown["alice"].tipShare).toBe(3.0);
    expect(result.breakdown["bob"].taxShare).toBe(2.5);
    expect(result.breakdown["bob"].tipShare).toBe(5.0);
    expect(result.breakdown["charlie"].taxShare).toBe(0.5);
    expect(result.breakdown["charlie"].tipShare).toBe(1.0);
  });
});
