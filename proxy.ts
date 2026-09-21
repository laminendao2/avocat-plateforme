import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - /login, /register (public auth pages)
     * - /api/auth/* (auth API routes)
     * - /_next/*, /favicon.ico, /public/* (Next.js internals & static files)
     */
    '/((?!login|register|portail|api/auth|api/portail|_next/static|_next/image|favicon.ico|public).*)',
  ],
};

const SESSION_COOKIE_NAME = 'session';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow API routes (they handle auth internally)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return redirectToLogin(request);
  }

  try {
    // Verify the session cookie. Pass checkRevoked=true to catch revoked tokens.
    await adminAuth.verifySessionCookie(sessionCookie, true);
    return NextResponse.next();
  } catch (error) {
    // Cookie is invalid, expired, or revoked — redirect to login
    const response = redirectToLogin(request);
    // Clear the invalid cookie
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    return response;
  }
}

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL('/login', request.url);
  // Preserve the originally requested path so we can redirect back after login
  loginUrl.searchParams.set('from', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}
