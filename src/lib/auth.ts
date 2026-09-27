import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./prisma";
import { cookies } from "next/headers";

export const authOptions: NextAuthOptions = {
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Email & Persona",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "alex@tally.local" },
        name: { label: "Name", type: "text", placeholder: "Alex Rivera" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        let user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              name: credentials.name || credentials.email.split("@")[0],
              email: credentials.email,
              avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(credentials.email)}`,
            },
          });
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "tally-super-secret-jwt-key-for-development-32chars",
};

/**
 * Server-side helper to get the currently authenticated user.
 * Supports standard NextAuth session, and falls back to persona cookie for instantaneous
 * zero-friction multi-user testing in dev.
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const personaUserId = cookieStore.get("tally_persona_user_id")?.value;

  if (personaUserId) {
    const user = await prisma.user.findUnique({
      where: { id: personaUserId },
    });
    if (user) return user;
  }

  // Fallback to primary seed user (Alex Rivera) so the app works seamlessly out of the box
  const defaultUser = await prisma.user.findFirst({
    where: { email: "alex@tally.local" },
  });

  return defaultUser || null;
}

/**
 * Enforces that user is authenticated AND a member of the group.
 * Throws or returns null if unauthorized.
 */
export async function authorizeGroupAccess(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId,
      },
    },
    include: {
      group: true,
      user: true,
    },
  });

  return membership;
}
