import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Authentication middleware for Next.js
 * Protects routes and handles authentication state
 */

// Routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/clients",
  "/loans",
  "/reports",
  "/tellers",
  "/offices",
  "/staff",
  "/products",
  "/accounting",
  "/shares",
  "/config",
  "/delinquency",
  "/organization",
  "/collateral-management",
];

// Routes that should redirect to dashboard if authenticated
const authRoutes = ["/"];

// Public routes that don't require authentication
const publicRoutes = ["/login", "/register", "/forgot-password"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get authentication cookies
  const authKey = request.cookies.get("fineract_auth_key")?.value;
  const username = request.cookies.get("fineract_username")?.value;
  const isAuthenticated = !!(authKey && username);

  // Check if current path is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if current path is an auth route
  const isAuthRoute = authRoutes.includes(pathname);

  // Check if current path is public
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Redirect unauthenticated users from protected routes to login
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users from auth routes to dashboard
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Allow access to public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // For any other route, check authentication
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
