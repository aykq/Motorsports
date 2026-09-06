// Auth/locale middleware runs on everything EXCEPT API routes, Next internals,
// and any path that looks like a static file (contains a dot). The `public/`
// tree — driver/circuit photos, icons, manifest, sw.js — must stay reachable
// without a login redirect, or the image optimizer can't fetch its sources.
export const MIDDLEWARE_MATCHER = "/((?!api|_next/static|_next/image|.*\\..*).*)";
