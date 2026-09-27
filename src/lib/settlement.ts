export interface BalanceMember {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface BalanceExpenseSplit {
  userId: string;
  shareAmount: number;
}

export interface BalanceExpense {
  paidBy: string;
  amount: number;
  splits: BalanceExpenseSplit[];
}

export interface BalanceSettlement {
  fromUser: string;
  toUser: string;
  amount: number;
  status: string; // "completed" or "pending"
}

export interface SimplifiedTransaction {
  id: string;
  fromUser: string;
  fromName: string;
  fromAvatar?: string | null;
  toUser: string;
  toName: string;
  toAvatar?: string | null;
  amount: number;
}

export interface SettlementSummary {
  netBalances: Record<string, number>; // positive = creditor (is owed), negative = debtor (owes)
  transactions: SimplifiedTransaction[];
  totalVolume: number;
  unsimplifiedTransactionCount: number;
}

/**
 * Computes net balances for each group member:
 * Net Balance = (Total Paid in Expenses) - (Total Owed across Splits)
 *             + (Total Sent in Completed Settlements) - (Total Received in Completed Settlements)
 */
export function calculateNetBalances(
  members: BalanceMember[],
  expenses: BalanceExpense[],
  settlements: BalanceSettlement[] = []
): Record<string, number> {
  const balances: Record<string, number> = {};

  // Initialize all members with 0.00
  for (const member of members) {
    balances[member.id] = 0;
  }

  // Factor in expenses
  for (const exp of expenses) {
    // Payer is credited the total amount they paid upfront
    if (balances[exp.paidBy] !== undefined) {
      balances[exp.paidBy] += exp.amount;
    }

    // Split participants are debited their respective share
    for (const split of exp.splits) {
      if (balances[split.userId] !== undefined) {
        balances[split.userId] -= split.shareAmount;
      }
    }
  }

  // Factor in completed settlements
  for (const s of settlements) {
    if (s.status === "completed") {
      // fromUser paid money towards their debt, so their balance improves (+ amount)
      if (balances[s.fromUser] !== undefined) {
        balances[s.fromUser] += s.amount;
      }
      // toUser received repayment, so what they are owed decreases (- amount)
      if (balances[s.toUser] !== undefined) {
        balances[s.toUser] -= s.amount;
      }
    }
  }

  // Clean up floating point precision issues
  for (const id of Object.keys(balances)) {
    balances[id] = Math.round(balances[id] * 100) / 100;
  }

  return balances;
}

/**
 * Greedy Debt-Simplification Algorithm
 * 1. Categorize members into debtors (net balance < 0) and creditors (net balance > 0).
 * 2. Greedily match the largest-magnitude debtor against the largest-magnitude creditor.
 * 3. Transfer min(|debt|, credit), update both balances, and repeat until all balances are zero (~0.005).
 * Guaranteed to produce at most n - 1 transactions.
 */
export function simplifyDebts(
  members: BalanceMember[],
  netBalances: Record<string, number>
): SimplifiedTransaction[] {
  const memberMap = new Map<string, BalanceMember>(members.map((m) => [m.id, m]));

  // Separate into debtors and creditors
  // Represent amounts in cents (integers) to avoid rounding drift
  const debtors: { id: string; amountCents: number }[] = [];
  const creditors: { id: string; amountCents: number }[] = [];

  for (const [id, balance] of Object.entries(netBalances)) {
    const cents = Math.round(balance * 100);
    if (cents < 0) {
      debtors.push({ id, amountCents: -cents }); // store magnitude as positive cents
    } else if (cents > 0) {
      creditors.push({ id, amountCents: cents });
    }
  }

  const transactions: SimplifiedTransaction[] = [];
  let txnIndex = 1;

  while (debtors.length > 0 && creditors.length > 0) {
    // Sort descending by magnitude to match largest debtor with largest creditor
    debtors.sort((a, b) => b.amountCents - a.amountCents);
    creditors.sort((a, b) => b.amountCents - a.amountCents);

    const largestDebtor = debtors[0];
    const largestCreditor = creditors[0];

    const settleCents = Math.min(largestDebtor.amountCents, largestCreditor.amountCents);
    const settleDollars = settleCents / 100;

    const fromMember = memberMap.get(largestDebtor.id) || { id: largestDebtor.id, name: "Unknown" };
    const toMember = memberMap.get(largestCreditor.id) || { id: largestCreditor.id, name: "Unknown" };

    transactions.push({
      id: `txn-${txnIndex++}`,
      fromUser: largestDebtor.id,
      fromName: fromMember.name,
      fromAvatar: fromMember.avatarUrl,
      toUser: largestCreditor.id,
      toName: toMember.name,
      toAvatar: toMember.avatarUrl,
      amount: settleDollars,
    });

    largestDebtor.amountCents -= settleCents;
    largestCreditor.amountCents -= settleCents;

    if (largestDebtor.amountCents === 0) {
      debtors.shift();
    }
    if (largestCreditor.amountCents === 0) {
      creditors.shift();
    }
  }

  return transactions;
}

/**
 * Full settlement pipeline
 */
export function getSettlementSummary(
  members: BalanceMember[],
  expenses: BalanceExpense[],
  settlements: BalanceSettlement[] = []
): SettlementSummary {
  const netBalances = calculateNetBalances(members, expenses, settlements);
  const transactions = simplifyDebts(members, netBalances);

  const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0);

  // Naive pairwise IOUs count estimation
  const debtorCount = Object.values(netBalances).filter((b) => b < -0.01).length;
  const creditorCount = Object.values(netBalances).filter((b) => b > 0.01).length;
  const unsimplifiedTransactionCount = debtorCount * creditorCount;

  return {
    netBalances,
    transactions,
    totalVolume: Math.round(totalVolume * 100) / 100,
    unsimplifiedTransactionCount,
  };
}
