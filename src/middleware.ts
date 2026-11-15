import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = [
  '/dashboard',
  '/schedule',
  '/medications',
  '/care-circle',
  '/appointments',
  '/health-journal',
  '/reports',
  '/settings',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get('carenest_session')?.value;

  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Intercept unauthorized access to protected routes
  if (isProtected) {
    if (!sessionToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);

      // Prevent caching of protected redirects
      redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      redirectResponse.headers.set('Pragma', 'no-cache');
      redirectResponse.headers.set('Expires', '0');
      return redirectResponse;
    }

    // Append strict no-cache headers to protected pages so browser never caches them in bfcache/history
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/schedule/:path*',
    '/medications/:path*',
    '/care-circle/:path*',
    '/appointments/:path*',
    '/health-journal/:path*',
    '/reports/:path*',
    '/settings/:path*',
  ],
};
