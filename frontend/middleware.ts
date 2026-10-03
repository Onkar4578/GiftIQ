import { NextRequest, NextResponse } from "next/server";

// Public pages — accessible without login (customer-facing portals)
const PUBLIC_PATHS = ["/quote/", "/compare/", "/login", "/icon.svg"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes through
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for auth token in cookie (set by the login page) or Authorization header
  const token = req.cookies.get("giftiq_token")?.value;

  if (!token) {
    // Redirect unauthenticated users to login
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on all routes except Next.js internals and static files
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
