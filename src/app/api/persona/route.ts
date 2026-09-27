import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
  });

  const cookieStore = await cookies();
  const currentPersonaId = cookieStore.get("tally_persona_user_id")?.value;
  const current = users.find((u) => u.id === currentPersonaId) || users[0] || null;

  return NextResponse.json({
    users,
    current,
  });
}

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const cookieStore = await cookies();
    cookieStore.set("tally_persona_user_id", user.id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return NextResponse.json({ success: true, current: user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
