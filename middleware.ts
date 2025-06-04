import {
  auth,
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define routes that don't require login
const isPublicPage = createRouteMatcher(["/", "/home", "/sign-in", "/sign-up"]);
// Define API routes that are publicly accessible
const isPublicApi = createRouteMatcher(["/api/videos"]);

export default clerkMiddleware(async(auth, req) => {
  const { userId } = await auth();
  const url = new URL(req.url);
  const isApi = url.pathname.startsWith("/api");

  // Redirect logged-in users away from public API if needed
  if (userId && isPublicApi(req)) {
    return NextResponse.redirect(new URL("/home", req.url));
  }

  // If the user is not logged in
  if (!userId) {
    if (!isApi && !isPublicPage(req)) {
      // Redirect unauthenticated users from protected pages
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    if (isApi && !isPublicApi(req)) {
      // For protected APIs, return 401 instead of redirecting
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
  }

  return NextResponse.next();
});

// Apply middleware to all pages and API routes except static files and Next internals
export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
