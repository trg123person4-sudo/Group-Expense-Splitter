import { NextResponse } from "next/server";
import { getCurrentUser, authorizeGroupAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInvitationEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;
    const membership = await authorizeGroupAccess(groupId, user.id);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden: Not a group member" }, { status: 403 });
    }

    const { email } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if target user is already an active member of this group
    const existingMember = await prisma.groupMember.findFirst({
      where: {
        groupId,
        user: { email: normalizedEmail },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "This person is already a member of the group." },
        { status: 400 }
      );
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.invitation.upsert({
      where: {
        groupId_email: {
          groupId,
          email: normalizedEmail,
        },
      },
      create: {
        groupId,
        email: normalizedEmail,
        token,
        invitedBy: user.id,
        status: "pending",
        expiresAt,
      },
      update: {
        token,
        status: "pending",
        expiresAt,
        invitedBy: user.id,
      },
      include: {
        group: true,
      },
    });

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
    const inviteUrl = `${protocol}://${host}/invite/${token}`;

    // Dispatch real email
    await sendInvitationEmail({
      toEmail: normalizedEmail,
      groupName: membership.group.name,
      inviterName: user.name || user.email,
      inviteUrl,
    });

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        token: invitation.token,
        expiresAt: invitation.expiresAt,
        status: invitation.status,
      },
      inviteUrl,
    });
  } catch (err: any) {
    console.error("Invitation creation error:", err);
    return NextResponse.json({ error: err.message || "Failed to create invitation" }, { status: 500 });
  }
}
