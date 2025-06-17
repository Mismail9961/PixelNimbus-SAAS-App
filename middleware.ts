import { auth, clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicPage = createRouteMatcher(["/", "/home", "/sign-in", "/sign-up"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const url = new URL(req.url);
  const pathname = url.pathname;
  const isApi = pathname.startsWith("/api");

  // Redirect signed-in users from "/" to "/home"
  if (userId && pathname === "/") {
    return NextResponse.redirect(new URL("/home", req.url));
  }

  // Unauthenticated user access control
  if (!userId) {
    if (!isApi && !isPublicPage(req)) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    if (isApi) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/api/(.*)"],
};
