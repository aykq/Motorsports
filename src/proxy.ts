import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authConfig } from "@/auth.config";

const COOKIE_NAME = "NEXT_LOCALE";
const LOCALES = ["tr", "en"] as const;
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

function detectLocale(acceptLanguage: string): string {
  const preferred = acceptLanguage.toLowerCase();
  if (preferred.includes("tr")) return "tr";
  return "en";
}

function applyLocaleCookie(request: NextRequest, response: NextResponse) {
  const localeCookie = request.cookies.get(COOKIE_NAME);

  if (!localeCookie) {
    const acceptLanguage = request.headers.get("accept-language") ?? "";
    response.cookies.set(COOKIE_NAME, detectLocale(acceptLanguage), {
      maxAge: COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
    });
  } else if (!(LOCALES as readonly string[]).includes(localeCookie.value)) {
    response.cookies.set(COOKIE_NAME, "tr", {
      maxAge: COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
    });
  }

  return response;
}

const AUTH_EXEMPT_PATHS = ["/login", "/blocked", "/pending", "/force-signout"];

function isAuthExempt(pathname: string): boolean {
  return AUTH_EXEMPT_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (!isAuthExempt(req.nextUrl.pathname)) {
    const status = req.auth?.user?.status;

    if (!req.auth) {
      return applyLocaleCookie(req, NextResponse.redirect(new URL("/login", req.url)));
    }
    if (status === "blocked") {
      return applyLocaleCookie(req, NextResponse.redirect(new URL("/blocked", req.url)));
    }
    if (status !== "approved") {
      return applyLocaleCookie(req, NextResponse.redirect(new URL("/pending", req.url)));
    }
  }

  return applyLocaleCookie(req, NextResponse.next());
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js).*)"],
};
