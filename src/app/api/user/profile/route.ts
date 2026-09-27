import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import { isValidCountryCode, isValidCurrencyCode } from "@/lib/countries";

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  defaultCountry: z
    .string()
    .length(2)
    .refine((val) => isValidCountryCode(val), { message: "Invalid ISO country code" })
    .optional(),
  defaultCurrency: z
    .string()
    .refine((val) => isValidCurrencyCode(val), { message: "Invalid ISO 4217 currency code" })
    .optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const freshUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      defaultCurrency: true,
      defaultCountry: true,
      avatarUrl: true,
    },
  });

  return NextResponse.json({ user: freshUser });
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = updateProfileSchema.parse(body);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(validated.name ? { name: validated.name } : {}),
        ...(validated.defaultCountry ? { defaultCountry: validated.defaultCountry.toUpperCase() } : {}),
        ...(validated.defaultCurrency ? { defaultCurrency: validated.defaultCurrency.toUpperCase() } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        defaultCurrency: true,
        defaultCountry: true,
        avatarUrl: true,
      },
    });

    return NextResponse.json({ user: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update profile" }, { status: 400 });
  }
}
