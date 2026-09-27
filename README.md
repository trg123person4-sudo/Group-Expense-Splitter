# Tally — Next-Gen Group Expense Splitter & AI Ledger

A modern, deployable full-stack group expense splitter engineered to feel fundamentally different from legacy splitters like Splitwise.

---

## 🌟 3 Core Differentiators

### 1. One-Shot Receipt-to-Split (OCR)
- Upload or snap any receipt photograph.
- Powered by Vision API (Gemini / Claude / local fallback parser).
- Automatically extracts line items, subtotal, tax, and tip.
- **Interactive Tap-to-Assign Matrix**: Tap which person(s) each item belongs to (shared items split evenly among selected members).
- **Proportional Tax & Tip Allocation**: Automatically computes each member's exact fair share of tax and tip based on their personal item subtotal ($Subtotal_u / Subtotal_{items}$), distributing integer remainder pennies without rounding error.

### 2. Ask-Your-Ledger AI Assistant
- Conversational chat box with strict **database ground-truth execution**.
- Runs real backend database query functions (`getUserBalance`, `getCategorySpending`, `searchExpenses`, `getSettlementPlan`).
- **Never hallucinates financial figures**.
- Every response provides verifiable citation cards displaying the underlying expense, date, payer, line items, and receipt snapshot.

### 3. Smart Settle-Up Visualized ($O(n-1)$ Debt Simplification)
- Replaces naive pairwise $N^2$ IOUs with a greedy debt-simplification algorithm.
- Computes exact net balances across expenses and completed settlements.
- Greedily matches the largest-magnitude debtor against the largest-magnitude creditor.
- **Animated Directed Graph**: Rendered as interactive circular SVG nodes with directed animated flow arrows showing who pays whom, how much, with one-click deep link settlement (UPI, PayPal.me, Venmo, Cash).

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript
- **Database & ORM**: PostgreSQL / SQLite via Prisma ORM with relational migrations
- **Authentication**: NextAuth (Auth.js) session model + Multi-User Persona Switcher (instant testing between Alex, Sarah, David, Priya)
- **Styling**: Tailwind CSS with custom **Warm Terracotta** (`#E05D38`) & **Deep Forest** (`#1C3F3A`) palette
- **Animation & Motion**: Framer Motion + SVG animated flow paths + Canvas Confetti
- **Testing**: Vitest unit test suite covering greedy debt simplification and exact itemized split math

---

## 🚀 Quick Start Guide

### 1. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env`:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="tally-super-secret-jwt-key-for-development-32chars"
NEXTAUTH_URL="http://localhost:3000"

# Optional AI API keys for live cloud OCR & LLM reasoning:
GEMINI_API_KEY=""
ANTHROPIC_API_KEY=""
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Database Migrations & Realistic Seed Data
```bash
# Push schema to SQLite database
npx prisma db push

# Seed realistic multi-month data (Alex, Sarah, David, Priya, Goa Trip, Flat 402, Alpine Trek)
npx prisma db seed
```

### 4. Run Vitest Unit Tests
Verify mathematical accuracy of the settlement and split engines:
```bash
npm test
```

### 5. Launch Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing Multi-User Perspectives
Use the **"Viewing as: [Name]"** pill in the top navigation bar to switch between:
- **Alex Rivera** (Payer of villa booking and bulk groceries)
- **Sarah Chen** (Payer of seafood dinner and fiber broadband)
- **David Miller** (Payer of scuba diving charter)
- **Priya Patel** (Payer of airport van and alpine permits)

Notice how balances, IOU arrows, and ledger assistant answers dynamically adapt to whoever is logged in!
