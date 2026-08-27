import { NextResponse, type NextRequest } from "next/server";

/**
 * Dev-only gate for the editor (Next 16 "proxy" convention).
 *
 * The admin surfaces (`/admin/*` and `/api/admin/*`) are only reachable when
 * the server is running in development mode (i.e. `npm run dev` on the user's
 * own machine). Any production build — including Vercel deploys — returns a
 * 404 for those paths, so the editor cannot be reached over the public
 * internet. The repo's git push permissions are the real auth boundary.
 *
 * Dev convenience: appending `/edit` to any public page URL jumps into the
 * admin editor for that page — `/work/overdawn/edit` → `/admin/edit/work/overdawn`.
 * Bare `/edit` lands on the pages index. In production these paths fall under
 * the same 404 as the rest of admin, which is what a nonexistent page would
 * return anyway.
 */
export function proxy(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }

  const { pathname } = req.nextUrl;
  if (pathname.endsWith("/edit") && !pathname.startsWith("/admin")) {
    const slug = pathname.slice(1, -"/edit".length).replace(/\/$/, "");
    const url = req.nextUrl.clone();
    url.pathname = slug ? `/admin/edit/${slug}` : "/admin/pages";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/:path*/edit"],
};
