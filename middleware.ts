import { auth, clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicPage = createRouteMatcher(["/", "/home", "/sign-in", "/sign-up"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const url       = new URL(req.url);
  const pathname  = url.pathname;
  const isApi     = pathname.startsWith("/api");

  // 1. Redirect "/" → "/home"
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/home", req.url));
  }

  // 2. Un-authenticated access control
  if (!userId) {
    // Visiting any non-public page → redirect to sign-in
    if (!isApi && !isPublicPage(req)) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    // Calling ANY API while logged-out → 401 JSON
    if (isApi) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
});

// Match every request except _next assets & static files
export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/api/(.*)"],
};
