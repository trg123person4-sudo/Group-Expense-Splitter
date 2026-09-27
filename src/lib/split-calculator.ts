export interface UserShare {
  userId: string;
  amount: number; // in dollars/currency units
}

export interface ItemizedReceiptItem {
  id?: string;
  name: string;
  price: number;
  assignedUserIds: string[];
}

export interface ItemizedSplitInput {
  items: ItemizedReceiptItem[];
  taxAmount: number;
  tipAmount: number;
  memberIds: string[];
}

export interface SplitResult {
  shares: UserShare[];
  total: number;
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Distributes integer remainder cents across participant shares
 * so that sum(shares) === totalCents exactly.
 */
function distributeRemainderCents(
  baseShares: { userId: string; cents: number }[],
  targetTotalCents: number
): UserShare[] {
  const currentTotal = baseShares.reduce((sum, s) => sum + s.cents, 0);
  let diff = targetTotalCents - currentTotal;

  // Clone to avoid mutating input
  const adjusted = baseShares.map((s) => ({ ...s }));

  let idx = 0;
  while (diff !== 0 && adjusted.length > 0) {
    if (diff > 0) {
      adjusted[idx % adjusted.length].cents += 1;
      diff -= 1;
    } else {
      if (adjusted[idx % adjusted.length].cents > 0) {
        adjusted[idx % adjusted.length].cents -= 1;
        diff += 1;
      }
    }
    idx++;
  }

  return adjusted.map((s) => ({
    userId: s.userId,
    amount: s.cents / 100,
  }));
}

/**
 * Calculate Equal Split
 */
export function calculateEqualSplit(totalAmount: number, userIds: string[]): SplitResult {
  if (userIds.length === 0) {
    return { shares: [], total: totalAmount, isValid: false, errorMessage: "At least one participant required" };
  }

  const totalCents = Math.round(totalAmount * 100);
  const baseCentsPerPerson = Math.floor(totalCents / userIds.length);

  const baseShares = userIds.map((userId) => ({
    userId,
    cents: baseCentsPerPerson,
  }));

  const shares = distributeRemainderCents(baseShares, totalCents);
  return { shares, total: totalAmount, isValid: true };
}

/**
 * Calculate Exact Split
 */
export function calculateExactSplit(
  totalAmount: number,
  exactAmounts: Record<string, number>
): SplitResult {
  const userIds = Object.keys(exactAmounts);
  const totalCents = Math.round(totalAmount * 100);

  const shares: UserShare[] = userIds.map((userId) => ({
    userId,
    amount: Math.round((exactAmounts[userId] || 0) * 100) / 100,
  }));

  const enteredCents = shares.reduce((sum, s) => sum + Math.round(s.amount * 100), 0);

  if (enteredCents !== totalCents) {
    const diff = (totalCents - enteredCents) / 100;
    return {
      shares,
      total: totalAmount,
      isValid: false,
      errorMessage: `Exact shares do not sum to total. Difference: ${diff > 0 ? `+$${diff.toFixed(2)} remaining` : `-$${Math.abs(diff).toFixed(2)} over`}`,
    };
  }

  return { shares, total: totalAmount, isValid: true };
}

/**
 * Calculate Percentage Split
 */
export function calculatePercentageSplit(
  totalAmount: number,
  percentages: Record<string, number>
): SplitResult {
  const userIds = Object.keys(percentages);
  const totalPercentage = userIds.reduce((sum, id) => sum + (percentages[id] || 0), 0);

  if (Math.abs(totalPercentage - 100) > 0.01) {
    return {
      shares: [],
      total: totalAmount,
      isValid: false,
      errorMessage: `Percentages must add up to 100% (currently ${totalPercentage.toFixed(1)}%)`,
    };
  }

  const totalCents = Math.round(totalAmount * 100);
  const baseShares = userIds.map((userId) => {
    const pct = percentages[userId] || 0;
    return {
      userId,
      cents: Math.floor((totalCents * pct) / 100),
    };
  });

  const shares = distributeRemainderCents(baseShares, totalCents);
  return { shares, total: totalAmount, isValid: true };
}

/**
 * Calculate Shares (Ratio) Split
 */
export function calculateSharesSplit(
  totalAmount: number,
  sharesCount: Record<string, number>
): SplitResult {
  const userIds = Object.keys(sharesCount);
  const totalShares = userIds.reduce((sum, id) => sum + (sharesCount[id] || 0), 0);

  if (totalShares <= 0) {
    return {
      shares: [],
      total: totalAmount,
      isValid: false,
      errorMessage: "Total shares must be greater than zero",
    };
  }

  const totalCents = Math.round(totalAmount * 100);
  const baseShares = userIds.map((userId) => {
    const userPortion = sharesCount[userId] || 0;
    return {
      userId,
      cents: Math.floor((totalCents * userPortion) / totalShares),
    };
  });

  const shares = distributeRemainderCents(baseShares, totalCents);
  return { shares, total: totalAmount, isValid: true };
}

/**
 * Calculate Itemized Receipt Split
 * - Splits each line item evenly among its assigned users.
 * - Distributes tax and tip proportionally based on each person's item subtotal.
 * - Properly allocates any remainder pennies so the grand total matches to the cent.
 */
export function calculateItemizedSplit(input: ItemizedSplitInput): SplitResult & {
  breakdown: Record<string, { itemSubtotal: number; taxShare: number; tipShare: number; total: number }>;
} {
  const { items, taxAmount, tipAmount, memberIds } = input;

  // Initialize subtotals for each member
  const memberItemCents: Record<string, number> = {};
  for (const id of memberIds) {
    memberItemCents[id] = 0;
  }

  // Calculate each member's item subtotal
  for (const item of items) {
    const assignees = item.assignedUserIds.filter((id) => memberIds.includes(id));
    if (assignees.length === 0) continue;

    const itemTotalCents = Math.round(item.price * 100);
    const centsPerAssignee = Math.floor(itemTotalCents / assignees.length);
    const remainder = itemTotalCents % assignees.length;

    assignees.forEach((userId, i) => {
      // distribute item-level remainder cents to the first assignees
      const share = centsPerAssignee + (i < remainder ? 1 : 0);
      memberItemCents[userId] = (memberItemCents[userId] || 0) + share;
    });
  }

  const totalItemCents = Object.values(memberItemCents).reduce((sum, c) => sum + c, 0);
  const taxCents = Math.round(taxAmount * 100);
  const tipCents = Math.round(tipAmount * 100);
  const grandTotalCents = totalItemCents + taxCents + tipCents;

  const breakdown: Record<string, { itemSubtotal: number; taxShare: number; tipShare: number; total: number }> = {};
  const baseShares: { userId: string; cents: number }[] = [];

  for (const id of memberIds) {
    const itemSubtotalCents = memberItemCents[id] || 0;
    let userTaxCents = 0;
    let userTipCents = 0;

    if (totalItemCents > 0) {
      userTaxCents = Math.round((taxCents * itemSubtotalCents) / totalItemCents);
      userTipCents = Math.round((tipCents * itemSubtotalCents) / totalItemCents);
    }

    const userTotalCents = itemSubtotalCents + userTaxCents + userTipCents;
    baseShares.push({ userId: id, cents: userTotalCents });

    breakdown[id] = {
      itemSubtotal: itemSubtotalCents / 100,
      taxShare: userTaxCents / 100,
      tipShare: userTipCents / 100,
      total: userTotalCents / 100,
    };
  }

  const shares = distributeRemainderCents(baseShares, grandTotalCents);

  // Sync breakdown with final adjusted cents
  for (const share of shares) {
    if (breakdown[share.userId]) {
      breakdown[share.userId].total = share.amount;
    }
  }

  return {
    shares,
    total: grandTotalCents / 100,
    isValid: true,
    breakdown,
  };
}
