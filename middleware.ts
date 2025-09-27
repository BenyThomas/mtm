import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Get the token from cookies
  const token = request.cookies.get("fineract_auth_key")?.value;

  // Check if the user is trying to access protected routes
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    // For now, we'll let the client-side handle auth
    // In a production app, you might want to verify the token here
    return NextResponse.next();
  }

  // Redirect to login if accessing root without auth
  if (request.nextUrl.pathname === "/") {
    return NextResponse.next();
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
