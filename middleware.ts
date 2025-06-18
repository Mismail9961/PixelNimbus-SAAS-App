import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  "/sign-in",
  "/sign-up",
  "/",
  "/home"
]);

const isPublicApiRoute = createRouteMatcher([
  "/api/videos"
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  const currentUrl = new URL(req.url);
  const isAccessingDashboard = currentUrl.pathname === "/home";
  const isLandingPage = currentUrl.pathname === "/";
  const isApiRequest = currentUrl.pathname.startsWith("/api");

  // ✅ Let logged-in users stay on `/` (landing page), only redirect from sign-in/up
  if (userId && isPublicRoute(req) && !isAccessingDashboard && !isLandingPage) {
    return NextResponse.redirect(new URL("/home", req.url));
  }

  if (!userId) {
    if (!isPublicRoute(req) && !isPublicApiRoute(req)) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    if (isApiRequest && !isPublicApiRoute(req)) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
