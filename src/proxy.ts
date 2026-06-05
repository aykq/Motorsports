import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "NEXT_LOCALE";
const LOCALES = ["tr", "en"] as const;
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

function detectLocale(acceptLanguage: string): string {
  const preferred = acceptLanguage.toLowerCase();
  if (preferred.includes("tr")) return "tr";
  return "en";
}

export function proxy(request: NextRequest) {
  const localeCookie = request.cookies.get(COOKIE_NAME);

  if (!localeCookie) {
    const acceptLanguage = request.headers.get("accept-language") ?? "";
    const locale = detectLocale(acceptLanguage);
    const response = NextResponse.next();
    response.cookies.set(COOKIE_NAME, locale, {
      maxAge: COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
    });
    return response;
  }

  const storedLocale = localeCookie.value;
  if (!(LOCALES as readonly string[]).includes(storedLocale)) {
    const response = NextResponse.next();
    response.cookies.set(COOKIE_NAME, "tr", {
      maxAge: COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js).*)"],
};
