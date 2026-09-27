import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET as getGroup, PATCH as patchGroup, DELETE as deleteGroup } from "../src/app/api/groups/[id]/route";
import { POST as assistantChat } from "../src/app/api/assistant/chat/route";
import { POST as receiptParse } from "../src/app/api/receipts/parse/route";
import { POST as recurringCron } from "../src/app/api/cron/recurring/route";
import * as auth from "../src/lib/auth";
import * as prismaModule from "../src/lib/prisma";
import { checkRateLimit, resetRateLimits } from "../src/lib/rate-limiter";

vi.mock("../src/lib/auth", () => ({
  getCurrentUser: vi.fn(),
  authorizeGroupAccess: vi.fn(),
}));

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    group: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    groupMember: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    expense: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
    },
  },
}));

vi.mock("../src/lib/ai-assistant", () => ({
  answerLedgerQuestion: vi.fn().mockResolvedValue({
    text: "Answer from assistant",
    citations: [],
    toolCalls: [],
  }),
}));

vi.mock("../src/lib/receipt-parser", () => ({
  parseReceiptImage: vi.fn().mockResolvedValue({
    merchant: "Test Merchant",
    date: "2026-03-01",
    total: 25.5,
    items: [],
  }),
}));

describe("Route Authorization & Security Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
  });

  describe("Group Access & RBAC (/api/groups/[id])", () => {
    it("returns 401 Unauthorized for unauthenticated GET request", async () => {
      vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(null);

      const req = new Request("http://localhost/api/groups/group-1");
      const res = await getGroup(req, { params: Promise.resolve({ id: "group-1" }) });

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("returns 403 Forbidden when authenticated user is not a member of the group", async () => {
      vi.mocked(auth.getCurrentUser).mockResolvedValueOnce({
        id: "user-stranger",
        name: "Stranger",
        email: "stranger@example.com",
      } as any);
      vi.mocked(auth.authorizeGroupAccess).mockResolvedValueOnce(null);

      const req = new Request("http://localhost/api/groups/group-1");
      const res = await getGroup(req, { params: Promise.resolve({ id: "group-1" }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Forbidden");
    });

    it("returns 403 Forbidden when a non-admin member attempts PATCH (settings or member removal)", async () => {
      vi.mocked(auth.getCurrentUser).mockResolvedValueOnce({
        id: "user-regular",
        name: "Regular Member",
        email: "regular@example.com",
      } as any);
      vi.mocked(auth.authorizeGroupAccess).mockResolvedValueOnce({
        id: "membership-1",
        userId: "user-regular",
        groupId: "group-1",
        role: "member", // regular member, not admin
      } as any);

      const req = new Request("http://localhost/api/groups/group-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Hacked Group Name" }),
      });
      const res = await patchGroup(req, { params: Promise.resolve({ id: "group-1" }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Admin access required");
    });

    it("returns 403 Forbidden when a non-admin member attempts DELETE group", async () => {
      vi.mocked(auth.getCurrentUser).mockResolvedValueOnce({
        id: "user-regular",
        name: "Regular Member",
        email: "regular@example.com",
      } as any);
      vi.mocked(auth.authorizeGroupAccess).mockResolvedValueOnce({
        id: "membership-1",
        userId: "user-regular",
        groupId: "group-1",
        role: "member",
      } as any);

      const req = new Request("http://localhost/api/groups/group-1", {
        method: "DELETE",
      });
      const res = await deleteGroup(req, { params: Promise.resolve({ id: "group-1" }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("group admins can delete");
    });

    it("allows admin member to DELETE group", async () => {
      vi.mocked(auth.getCurrentUser).mockResolvedValueOnce({
        id: "user-admin",
        name: "Admin User",
        email: "admin@example.com",
      } as any);
      vi.mocked(auth.authorizeGroupAccess).mockResolvedValueOnce({
        id: "membership-admin",
        userId: "user-admin",
        groupId: "group-1",
        role: "admin",
      } as any);
      vi.mocked(prismaModule.prisma.group.delete).mockResolvedValueOnce({} as any);

      const req = new Request("http://localhost/api/groups/group-1", {
        method: "DELETE",
      });
      const res = await deleteGroup(req, { params: Promise.resolve({ id: "group-1" }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe("Assistant & OCR Security & Rate Limiting", () => {
    it("returns 401 when unauthenticated user queries assistant", async () => {
      vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(null);

      const req = new Request("http://localhost/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: "group-1", prompt: "Who owes what?" }),
      });
      const res = await assistantChat(req);

      expect(res.status).toBe(401);
    });

    it("returns 403 when user queries assistant for a group they do not belong to", async () => {
      vi.mocked(auth.getCurrentUser).mockResolvedValueOnce({
        id: "user-outsider",
      } as any);
      vi.mocked(auth.authorizeGroupAccess).mockResolvedValueOnce(null);

      const req = new Request("http://localhost/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: "group-secret", prompt: "Summarize expenses" }),
      });
      const res = await assistantChat(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Forbidden");
    });

    it("returns 429 Too Many Requests when assistant rate limit (10 req/min) is exceeded", async () => {
      const user = { id: "user-spammer" };
      vi.mocked(auth.getCurrentUser).mockResolvedValue(user as any);
      vi.mocked(auth.authorizeGroupAccess).mockResolvedValue({ id: "mem-1" } as any);

      // Make 10 permitted requests
      for (let i = 0; i < 10; i++) {
        const req = new Request("http://localhost/api/assistant/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId: "group-1", prompt: `Question ${i}` }),
        });
        const res = await assistantChat(req);
        expect(res.status).toBe(200);
      }

      // 11th request must be rate limited with 429
      const blockedReq = new Request("http://localhost/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: "group-1", prompt: "One too many" }),
      });
      const blockedRes = await assistantChat(blockedReq);
      expect(blockedRes.status).toBe(429);
      const json = await blockedRes.json();
      expect(json.error).toContain("Rate limit exceeded");
    });

    it("returns 401 when unauthenticated user calls receipt parse", async () => {
      vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(null);

      const req = new Request("http://localhost/api/receipts/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: "data:image/png;base64,123" }),
      });
      const res = await receiptParse(req);

      expect(res.status).toBe(401);
    });

    it("returns 429 when receipt parse rate limit is exceeded", async () => {
      const user = { id: "user-ocr-spammer" };
      vi.mocked(auth.getCurrentUser).mockResolvedValue(user as any);

      for (let i = 0; i < 10; i++) {
        const req = new Request("http://localhost/api/receipts/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: "data:image/png;base64,123" }),
        });
        const res = await receiptParse(req);
        expect(res.status).toBe(200);
      }

      const blockedReq = new Request("http://localhost/api/receipts/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: "data:image/png;base64,123" }),
      });
      const blockedRes = await receiptParse(blockedReq);
      expect(blockedRes.status).toBe(429);
      const json = await blockedRes.json();
      expect(json.error).toContain("Rate limit exceeded");
    });
  });

  describe("Rate Limiter Unit Mechanics", () => {
    it("tracks sliding window correctly and resets", async () => {
      const id = "test-client";
      const res1 = await checkRateLimit(id, { limit: 2, windowMs: 1000 });
      expect(res1.success).toBe(true);
      expect(res1.remaining).toBe(1);

      const res2 = await checkRateLimit(id, { limit: 2, windowMs: 1000 });
      expect(res2.success).toBe(true);
      expect(res2.remaining).toBe(0);

      const res3 = await checkRateLimit(id, { limit: 2, windowMs: 1000 });
      expect(res3.success).toBe(false);
      expect(res3.remaining).toBe(0);

      resetRateLimits();
      const res4 = await checkRateLimit(id, { limit: 2, windowMs: 1000 });
      expect(res4.success).toBe(true);
      expect(res4.remaining).toBe(1);
    });
  });

  describe("Recurring Cron Security (/api/cron/recurring)", () => {
    const originalEnv = process.env.CRON_SECRET;

    afterEach(() => {
      process.env.CRON_SECRET = originalEnv;
    });

    it("fails closed with 500 when CRON_SECRET is not configured in environment", async () => {
      delete process.env.CRON_SECRET;

      const req = new Request("http://localhost/api/cron/recurring", {
        method: "POST",
      });
      const res = await recurringCron(req);

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toContain("CRON_SECRET must be configured");
    });

    it("returns 401 Unauthorized when CRON_SECRET is set but Authorization header is missing", async () => {
      process.env.CRON_SECRET = "super-secret-token";

      const req = new Request("http://localhost/api/cron/recurring", {
        method: "POST",
      });
      const res = await recurringCron(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain("Invalid cron secret");
    });

    it("returns 401 Unauthorized when Authorization header does not match CRON_SECRET", async () => {
      process.env.CRON_SECRET = "super-secret-token";

      const req = new Request("http://localhost/api/cron/recurring", {
        method: "POST",
        headers: { Authorization: "Bearer wrong-token" },
      });
      const res = await recurringCron(req);

      expect(res.status).toBe(401);
    });

    it("succeeds with 200 when valid Authorization header matches CRON_SECRET", async () => {
      process.env.CRON_SECRET = "super-secret-token";

      const req = new Request("http://localhost/api/cron/recurring", {
        method: "POST",
        headers: { Authorization: "Bearer super-secret-token" },
      });
      const res = await recurringCron(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });
});
