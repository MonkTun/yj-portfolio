import { NextResponse, type NextRequest } from "next/server";

/**
 * Dev-only gate for the editor (Next 16 "proxy" convention).
 *
 * The admin surfaces (`/admin/*` and `/api/admin/*`) are only reachable when
 * the server is running in development mode (i.e. `npm run dev` on the user's
 * own machine). Any production build — including Vercel deploys — returns a
 * 404 for those paths, so the editor cannot be reached over the public
 * internet. The repo's git push permissions are the real auth boundary.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function proxy(_req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
