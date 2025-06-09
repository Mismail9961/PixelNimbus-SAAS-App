import {
  auth,
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicPage = createRouteMatcher(["/", "/home", "/sign-in", "/sign-up"]);
const isPublicApi = createRouteMatcher(["/api/videos"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const url = new URL(req.url);
  const pathname = url.pathname;
  const isApi = pathname.startsWith("/api");

  // Redirect root "/" to "/home"
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/home", req.url));
  }

  // Remove previous logged-in redirect on public API

  if (!userId) {
    if (!isApi && !isPublicPage(req)) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
    if (isApi && !isPublicApi(req)) {
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
