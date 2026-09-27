import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getAuthSecret } from "@/lib/auth-secret";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const secret = getAuthSecret();
  const token = await getToken({ req, secret });

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isProtectedPage = pathname === "/" || pathname.startsWith("/groups");
  const isProtectedApi =
    pathname.startsWith("/api/groups") ||
    pathname.startsWith("/api/assistant") ||
    pathname.startsWith("/api/receipts");

  // 1. API Protection: Return 401 Unauthorized for unauthenticated API requests
  if (isProtectedApi && !token) {
    return NextResponse.json(
      { error: "Unauthorized. A valid session is required." },
      { status: 401 }
    );
  }

  // 2. Page Protection: Redirect unauthenticated page requests to /login
  if (isProtectedPage && !token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Authenticated users should not revisit login or signup
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/groups/:path*",
    "/api/groups/:path*",
    "/api/assistant/:path*",
    "/api/receipts/:path*",
    "/login",
    "/signup",
  ],
};
