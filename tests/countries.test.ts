import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  COUNTRIES,
  ALL_CURRENCIES,
  getCountryByCode,
  isValidCountryCode,
  isValidCurrencyCode,
} from "../src/lib/countries";
import { POST as createGroup } from "../src/app/api/groups/route";
import { GET as getProfile, PATCH as updateProfile } from "../src/app/api/user/profile/route";
import * as auth from "../src/lib/auth";
import * as prismaModule from "../src/lib/prisma";

vi.mock("../src/lib/auth", () => ({
  getCurrentUser: vi.fn(),
  authorizeGroupAccess: vi.fn(),
}));

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    group: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    invitation: {
      upsert: vi.fn(),
    },
  },
}));

describe("Countries & Currency Module (src/lib/countries.ts)", () => {
  it("ships full world-countries catalog with ISO codes, flags, and currencies", () => {
    expect(COUNTRIES.length).toBeGreaterThanOrEqual(240);
    expect(ALL_CURRENCIES.length).toBeGreaterThanOrEqual(140);
  });

  it("resolves primary national currency correctly for major countries", () => {
    const us = getCountryByCode("US");
    expect(us).toBeDefined();
    expect(us?.name).toBe("United States");
    expect(us?.currencyCode).toBe("USD");
    expect(us?.currencySymbol).toBe("$");
    expect(us?.flag).toBe("🇺🇸");

    const india = getCountryByCode("IN");
    expect(india).toBeDefined();
    expect(india?.name).toBe("India");
    expect(india?.currencyCode).toBe("INR");
    expect(india?.currencySymbol).toBe("₹");
    expect(india?.flag).toBe("🇮🇳");

    const germany = getCountryByCode("DE");
    expect(germany).toBeDefined();
    expect(germany?.currencyCode).toBe("EUR");
    expect(germany?.currencySymbol).toBe("€");
  });

  it("handles countries with multiple official currencies by picking primary first", () => {
    const bhutan = getCountryByCode("BT");
    expect(bhutan).toBeDefined();
    expect(bhutan?.currencyCode).toBe("BTN");
    expect(bhutan?.allCurrencies.length).toBeGreaterThanOrEqual(2);
    expect(bhutan?.allCurrencies.some((c) => c.code === "INR")).toBe(true);
  });

  it("validates ISO country codes strictly", () => {
    expect(isValidCountryCode("US")).toBe(true);
    expect(isValidCountryCode("us")).toBe(true); // case-insensitive
    expect(isValidCountryCode("IN")).toBe(true);
    expect(isValidCountryCode("FR")).toBe(true);
    expect(isValidCountryCode("ZZ")).toBe(false);
    expect(isValidCountryCode("XYZ")).toBe(false);
    expect(isValidCountryCode("")).toBe(false);
  });

  it("validates ISO 4217 currency codes strictly", () => {
    expect(isValidCurrencyCode("USD")).toBe(true);
    expect(isValidCurrencyCode("usd")).toBe(true);
    expect(isValidCurrencyCode("EUR")).toBe(true);
    expect(isValidCurrencyCode("INR")).toBe(true);
    expect(isValidCurrencyCode("GBP")).toBe(true);
    expect(isValidCurrencyCode("FAKE")).toBe(false);
    expect(isValidCurrencyCode("123")).toBe(false);
  });
});

describe("Group Creation API with Country & Currency Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts valid country and auto-resolved currency", async () => {
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce({
      id: "user-1",
      email: "alex@example.com",
    } as any);

    vi.mocked(prismaModule.prisma.group.create).mockResolvedValueOnce({
      id: "group-in",
      name: "Goa Trip",
      type: "trip",
      country: "IN",
      currency: "INR",
      budgetLimit: null,
      createdBy: "user-1",
    } as any);

    vi.mocked(prismaModule.prisma.group.findUnique).mockResolvedValueOnce({
      id: "group-in",
      name: "Goa Trip",
      country: "IN",
      currency: "INR",
      members: [],
      invitations: [],
    } as any);

    const req = new Request("http://localhost/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Goa Trip",
        type: "trip",
        country: "IN",
        currency: "INR",
      }),
    });

    const res = await createGroup(req);
    expect(res.status).toBe(201);
    expect(prismaModule.prisma.group.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          country: "IN",
          currency: "INR",
        }),
      })
    );
  });

  it("rejects invalid country codes with 400 Bad Request", async () => {
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce({
      id: "user-1",
      email: "alex@example.com",
    } as any);

    const req = new Request("http://localhost/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Mars Trip",
        country: "ZZ", // Invalid ISO code
        currency: "USD",
      }),
    });

    const res = await createGroup(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid ISO");
  });

  it("rejects invalid currency codes with 400 Bad Request", async () => {
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce({
      id: "user-1",
      email: "alex@example.com",
    } as any);

    const req = new Request("http://localhost/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Invalid Currency Group",
        country: "US",
        currency: "NOT_REAL", // Invalid ISO 4217 code
      }),
    });

    const res = await createGroup(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid ISO 4217");
  });
});

describe("User Profile API (defaultCountry and defaultCurrency)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates user defaultCountry and defaultCurrency", async () => {
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce({
      id: "user-1",
    } as any);

    vi.mocked(prismaModule.prisma.user.update).mockResolvedValueOnce({
      id: "user-1",
      name: "Alex Chen",
      email: "alex@example.com",
      defaultCountry: "GB",
      defaultCurrency: "GBP",
      avatarUrl: null,
    } as any);

    const req = new Request("http://localhost/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        defaultCountry: "GB",
        defaultCurrency: "GBP",
      }),
    });

    const res = await updateProfile(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.defaultCountry).toBe("GB");
    expect(data.user.defaultCurrency).toBe("GBP");
  });

  it("rejects invalid country or currency on profile update", async () => {
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce({
      id: "user-1",
    } as any);

    const req = new Request("http://localhost/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        defaultCountry: "INVALID",
      }),
    });

    const res = await updateProfile(req);
    expect(res.status).toBe(400);
  });
});
