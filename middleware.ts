import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  "/sign-in",
  "/sign-up",
  "/",
]);

const isPublicApiRoute = createRouteMatcher([
  "/api/videos"
]);

export default clerkMiddleware(async (auth, req) => {
  try {
    const { userId } = await auth();

    const currentUrl = new URL(req.url);
    const path = currentUrl.pathname;

    const isAccessingDashboard = path === "/home";
    const isLandingPage = path === "/";
    const isApiRequest = path.startsWith("/api");

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
  } catch (err) {
    console.error("Middleware Error:", err);
    return NextResponse.next(); 
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
