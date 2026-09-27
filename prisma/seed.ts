import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with realistic demo data...");

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.expenseItemAssignment.deleteMany();
  await prisma.expenseItem.deleteMany();
  await prisma.expenseSplit.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Users
  const alex = await prisma.user.create({
    data: {
      id: "user-alex",
      name: "Alex Rivera",
      email: "alex@tally.local",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      defaultCurrency: "USD",
    },
  });

  const sarah = await prisma.user.create({
    data: {
      id: "user-sarah",
      name: "Sarah Chen",
      email: "sarah@tally.local",
      avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
      defaultCurrency: "USD",
    },
  });

  const david = await prisma.user.create({
    data: {
      id: "user-david",
      name: "David Miller",
      email: "david@tally.local",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      defaultCurrency: "USD",
    },
  });

  const priya = await prisma.user.create({
    data: {
      id: "user-priya",
      name: "Priya Patel",
      email: "priya@tally.local",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      defaultCurrency: "USD",
    },
  });

  console.log("Users created:", [alex.name, sarah.name, david.name, priya.name]);

  // 2. Create Group 1: Goa Beach Getaway
  const goaGroup = await prisma.group.create({
    data: {
      id: "group-goa",
      name: "Goa Sun & Surf 🌴",
      type: "trip",
      currency: "USD",
      budgetLimit: 2500,
      createdBy: alex.id,
      members: {
        create: [
          { userId: alex.id, role: "admin" },
          { userId: sarah.id, role: "member" },
          { userId: david.id, role: "member" },
          { userId: priya.id, role: "member" },
        ],
      },
    },
  });

  // Group 1 Expenses
  // Expense 1: Beachfront Villa (Equal split $210 each)
  const villaExpense = await prisma.expense.create({
    data: {
      id: "exp-goa-villa",
      groupId: goaGroup.id,
      description: "Beachfront Villa Booking (3 Nights)",
      amount: 840,
      currency: "USD",
      category: "lodging",
      paidBy: alex.id,
      date: new Date("2026-08-10T14:30:00Z"),
      splitType: "equal",
      receiptImageUrl: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&auto=format&fit=crop&q=80",
      splits: {
        create: [
          { userId: alex.id, shareAmount: 210 },
          { userId: sarah.id, shareAmount: 210 },
          { userId: david.id, shareAmount: 210 },
          { userId: priya.id, shareAmount: 210 },
        ],
      },
    },
  });

  await prisma.comment.createMany({
    data: [
      {
        expenseId: villaExpense.id,
        userId: sarah.id,
        text: "The infinity pool overlooking the Arabian sea is unreal!",
        createdAt: new Date("2026-08-10T16:00:00Z"),
      },
      {
        expenseId: villaExpense.id,
        userId: alex.id,
        text: "Included late checkout on Sunday too.",
        createdAt: new Date("2026-08-10T16:20:00Z"),
      },
    ],
  });

  // Expense 2: Seafood Shack & Barbecue (Itemized receipt split)
  // Items: Tiger Prawns $60 (Sarah, Alex), Butter Garlic Naan $20 (All 4), Grilled Kingfish $55 (David, Priya), Drinks $30 (Sarah, David)
  // Subtotal = $165, Tax = $9.50, Tip = $10.00 => Total = $184.50
  const seafoodExpense = await prisma.expense.create({
    data: {
      id: "exp-goa-seafood",
      groupId: goaGroup.id,
      description: "Fisherman's Wharf Seafood & Cocktails",
      amount: 184.5,
      currency: "USD",
      category: "food",
      paidBy: sarah.id,
      date: new Date("2026-08-11T20:15:00Z"),
      splitType: "itemized",
      receiptImageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80",
      splits: {
        create: [
          { userId: alex.id, shareAmount: 39.14 },
          { userId: sarah.id, shareAmount: 55.91 },
          { userId: david.id, shareAmount: 50.32 },
          { userId: priya.id, shareAmount: 39.13 },
        ],
      },
    },
  });

  const item1 = await prisma.expenseItem.create({
    data: {
      expenseId: seafoodExpense.id,
      name: "Jumbo Tiger Prawns Butter Garlic",
      price: 60.0,
      assignments: {
        create: [{ userId: sarah.id }, { userId: alex.id }],
      },
    },
  });

  const item2 = await prisma.expenseItem.create({
    data: {
      expenseId: seafoodExpense.id,
      name: "Garlic Naan & Rice Basket",
      price: 20.0,
      assignments: {
        create: [{ userId: alex.id }, { userId: sarah.id }, { userId: david.id }, { userId: priya.id }],
      },
    },
  });

  const item3 = await prisma.expenseItem.create({
    data: {
      expenseId: seafoodExpense.id,
      name: "Grilled Tandoori Kingfish",
      price: 55.0,
      assignments: {
        create: [{ userId: david.id }, { userId: priya.id }],
      },
    },
  });

  const item4 = await prisma.expenseItem.create({
    data: {
      expenseId: seafoodExpense.id,
      name: "Tropical Cocktails & Mocktails",
      price: 30.0,
      assignments: {
        create: [{ userId: sarah.id }, { userId: david.id }],
      },
    },
  });

  // Expense 3: Scuba Diving & Boat Charter
  await prisma.expense.create({
    data: {
      id: "exp-goa-scuba",
      groupId: goaGroup.id,
      description: "Grande Island Scuba Diving & Boat Trip",
      amount: 320,
      currency: "USD",
      category: "entertainment",
      paidBy: david.id,
      date: new Date("2026-08-12T10:00:00Z"),
      splitType: "equal",
      splits: {
        create: [
          { userId: alex.id, shareAmount: 80 },
          { userId: sarah.id, shareAmount: 80 },
          { userId: david.id, shareAmount: 80 },
          { userId: priya.id, shareAmount: 80 },
        ],
      },
    },
  });

  // Expense 4: Airport Transit
  await prisma.expense.create({
    data: {
      id: "exp-goa-cab",
      groupId: goaGroup.id,
      description: "Airport Van Shuttle to Resort",
      amount: 68,
      currency: "USD",
      category: "travel",
      paidBy: priya.id,
      date: new Date("2026-08-10T12:00:00Z"),
      splitType: "equal",
      splits: {
        create: [
          { userId: alex.id, shareAmount: 17 },
          { userId: sarah.id, shareAmount: 17 },
          { userId: david.id, shareAmount: 17 },
          { userId: priya.id, shareAmount: 17 },
        ],
      },
    },
  });

  // Settlement in Goa group: David paid $50 to Alex
  await prisma.settlement.create({
    data: {
      groupId: goaGroup.id,
      fromUser: david.id,
      toUser: alex.id,
      amount: 50,
      status: "completed",
      method: "UPI",
      settledAt: new Date("2026-08-13T18:00:00Z"),
    },
  });

  // 3. Create Group 2: Flat 402
  const flatGroup = await prisma.group.create({
    data: {
      id: "group-flat402",
      name: "Flat 402 — Downtown Loft 🏢",
      type: "home",
      currency: "USD",
      budgetLimit: 1800,
      createdBy: sarah.id,
      members: {
        create: [
          { userId: alex.id, role: "member" },
          { userId: sarah.id, role: "admin" },
          { userId: david.id, role: "member" },
        ],
      },
    },
  });

  // Flat 402 Expenses
  await prisma.expense.create({
    data: {
      id: "exp-flat-wifi",
      groupId: flatGroup.id,
      description: "Gigabit Fiber Broadband & Mesh Wi-Fi",
      amount: 75,
      currency: "USD",
      category: "utilities",
      paidBy: sarah.id,
      date: new Date("2026-09-01T09:00:00Z"),
      splitType: "equal",
      isRecurring: true,
      recurringPeriod: "monthly",
      splits: {
        create: [
          { userId: alex.id, shareAmount: 25 },
          { userId: sarah.id, shareAmount: 25 },
          { userId: david.id, shareAmount: 25 },
        ],
      },
    },
  });

  await prisma.expense.create({
    data: {
      id: "exp-flat-groceries",
      groupId: flatGroup.id,
      description: "Monthly Kitchen Essentials & Olive Oil",
      amount: 150,
      currency: "USD",
      category: "groceries",
      paidBy: alex.id,
      date: new Date("2026-09-05T17:30:00Z"),
      splitType: "equal",
      splits: {
        create: [
          { userId: alex.id, shareAmount: 50 },
          { userId: sarah.id, shareAmount: 50 },
          { userId: david.id, shareAmount: 50 },
        ],
      },
    },
  });

  // 4. Create Group 3: Alpine Trek
  const trekGroup = await prisma.group.create({
    data: {
      id: "group-trek",
      name: "Alpine Pass Camping 🏔️",
      type: "trip",
      currency: "USD",
      budgetLimit: 900,
      createdBy: priya.id,
      members: {
        create: [
          { userId: alex.id, role: "member" },
          { userId: priya.id, role: "admin" },
          { userId: david.id, role: "member" },
        ],
      },
    },
  });

  await prisma.expense.create({
    data: {
      id: "exp-trek-permits",
      groupId: trekGroup.id,
      description: "National Park Wilderness Permits & Trail Maps",
      amount: 120,
      currency: "USD",
      category: "travel",
      paidBy: priya.id,
      date: new Date("2026-09-18T11:00:00Z"),
      splitType: "equal",
      splits: {
        create: [
          { userId: alex.id, shareAmount: 40 },
          { userId: priya.id, shareAmount: 40 },
          { userId: david.id, shareAmount: 40 },
        ],
      },
    },
  });

  // Initial notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: alex.id,
        type: "expense_added",
        payload: JSON.stringify({
          groupName: "Goa Sun & Surf 🌴",
          description: "Fisherman's Wharf Seafood & Cocktails",
          amount: 184.5,
          paidByName: "Sarah Chen",
          yourShare: 39.14,
        }),
      },
      {
        userId: alex.id,
        type: "payment_received",
        payload: JSON.stringify({
          groupName: "Goa Sun & Surf 🌴",
          fromName: "David Miller",
          amount: 50.0,
          method: "UPI",
        }),
      },
    ],
  });

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
