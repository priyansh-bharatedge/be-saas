import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { Role } from "@prisma/client";
import { canAccessModule } from "@/lib/auth/rbac";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets and internal next routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/public") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Retrieve token via NextAuth
  const token = await getToken({
    req: request,
    secret:
      process.env.AUTH_SECRET ||
      process.env.NEXTAUTH_SECRET ||
      "bharatedge-enterprise-super-secure-jwt-key-2026-edge-saas",
  });

  const isAuthenticated = !!token;
  const userRole = (token?.role as Role) || null;

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/verify-otp") ||
    pathname.startsWith("/forgot-password");

  // If visiting / and user is logged in, redirect to portal; if not, go to login
  if (pathname === "/") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/portal", request.url));
    } else {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // If already logged in and visiting login pages, redirect to central dashboard hub
  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  // Protected routes: require authentication
  const isProtectedRoute =
    pathname.startsWith("/portal") ||
    pathname.startsWith("/crm") ||
    pathname.startsWith("/hrms") ||
    pathname.startsWith("/support");

  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Strict Role-Based Access Control (RBAC) Route Guards:
  if (isAuthenticated && token) {
    const authUser: any = {
      id: token.id,
      role: token.role,
      systemRole: token.systemRole,
      department: token.department,
    };

    if (pathname.startsWith("/crm") && !canAccessModule(authUser, pathname)) {
      const portalUrl = new URL("/portal", request.url);
      portalUrl.searchParams.set("denied", pathname.startsWith("/crm/operations") ? "operations" : "crm");
      return NextResponse.redirect(portalUrl);
    }

    if (pathname.startsWith("/hrms") && !canAccessModule(authUser, pathname)) {
      const portalUrl = new URL("/portal", request.url);
      portalUrl.searchParams.set("denied", "hrms");
      return NextResponse.redirect(portalUrl);
    }

    if (pathname.startsWith("/support") && !canAccessModule(authUser, pathname)) {
      const portalUrl = new URL("/portal", request.url);
      portalUrl.searchParams.set("denied", "support");
      return NextResponse.redirect(portalUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
