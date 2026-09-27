import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        group: {
          include: {
            members: { include: { user: true } },
          },
        },
        inviter: true,
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found or link is invalid." }, { status: 404 });
    }

    if (invitation.status === "accepted") {
      return NextResponse.json({
        invitation: {
          id: invitation.id,
          status: "accepted",
          group: { id: invitation.group.id, name: invitation.group.name },
        },
        alreadyAccepted: true,
      });
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      return NextResponse.json({ error: "This invitation link has expired." }, { status: 410 });
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        inviterName: invitation.inviter?.name || "A group member",
        group: {
          id: invitation.group.id,
          name: invitation.group.name,
          type: invitation.group.type,
          currency: invitation.group.currency,
          memberCount: invitation.group.members.length,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch invitation" }, { status: 500 });
  }
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized: Sign in required to accept" }, { status: 401 });
    }

    const { token } = await params;

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { group: true },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      return NextResponse.json({ error: "Invitation has expired" }, { status: 410 });
    }

    // Add user as GroupMember
    await prisma.groupMember.upsert({
      where: {
        groupId_userId: {
          groupId: invitation.groupId,
          userId: user.id,
        },
      },
      create: {
        groupId: invitation.groupId,
        userId: user.id,
        role: "member",
      },
      update: {},
    });

    // Mark invitation as accepted
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "accepted" },
    });

    return NextResponse.json({
      success: true,
      groupId: invitation.groupId,
      groupName: invitation.group.name,
    });
  } catch (err: any) {
    console.error("Accept invite error:", err);
    return NextResponse.json({ error: err.message || "Failed to accept invitation" }, { status: 500 });
  }
}
