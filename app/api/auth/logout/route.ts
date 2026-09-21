import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { SESSION_COOKIE_NAME, revokeUserSessions } from '@/lib/auth-firebase';
import { cookies } from 'next/headers';

export async function POST(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (sessionCookie) {
      try {
        // Verify the cookie to get the UID, then revoke all sessions for that user
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
        await revokeUserSessions(decodedClaims.uid);
      } catch {
        // Cookie already invalid — proceed to clear it anyway
      }
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la déconnexion' },
      { status: 500 }
    );
  }
}
