import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/** First gate for the admin area and the engine API. Pages and route handlers check again (defence in depth). */
export function proxy(request: NextRequest) {
  if (verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ status: "ERROR", errors: ["Not signed in"] }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/admin/:path*", "/api/lifecycle/:path*", "/api/lifecycle"] };
