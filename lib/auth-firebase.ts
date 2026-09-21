import { adminAuth, adminDb } from './firebase-admin';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export const SESSION_COOKIE_NAME = 'session';
export const SESSION_DURATION_MS = 60 * 60 * 24 * 14 * 1000; // 14 days

/**
 * Verify the session cookie from the request and return the decoded claims.
 * Throws if the cookie is missing or invalid.
 */
export async function verifySession(): Promise<admin.auth.DecodedIdToken> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    throw new Error('No session cookie found');
  }

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decodedClaims;
  } catch {
    throw new Error('Invalid or expired session cookie');
  }
}

/**
 * Get the current authenticated user record from Firestore.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<FirestoreUser | null> {
  try {
    const claims = await verifySession();
    const userDoc = await adminDb.collection('users').doc(claims.uid).get();

    if (!userDoc.exists) {
      return null;
    }

    const data = userDoc.data()!;
    return {
      id: userDoc.id,
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    } as FirestoreUser;
  } catch {
    return null;
  }
}

/**
 * Create a session cookie from a Firebase ID token.
 */
export async function createSessionCookie(idToken: string): Promise<string> {
  return adminAuth.createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION_MS,
  });
}

/**
 * Revoke all refresh tokens for a user (used on logout).
 */
export async function revokeUserSessions(uid: string): Promise<void> {
  await adminAuth.revokeRefreshTokens(uid);
}

export interface FirestoreUser {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'avocat' | 'assistant';
  createdAt: string;
}

// Re-export admin types for convenience
import type admin from 'firebase-admin';

// ─── Client portal auth ───────────────────────────────────────────────────────
// Portal sessions use a signed JWT (HS256) — completely independent of Firebase Auth.
// This avoids conflicts when the same person is both an avocat and a client,
// or when a client works with multiple avocats (multiple client documents in Firestore).

export const CLIENT_COOKIE_NAME = 'client_session';

function getPortalJwtSecret(): Uint8Array {
  const secret = process.env.PORTAL_JWT_SECRET;
  if (!secret) throw new Error('PORTAL_JWT_SECRET not set');
  return new TextEncoder().encode(secret);
}

export async function verifyClientSession(): Promise<{ clientId: string; email: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CLIENT_COOKIE_NAME)?.value;
  if (!token) throw new Error('No client session');

  const { payload } = await jwtVerify(token, getPortalJwtSecret());
  if (!payload.clientId || typeof payload.clientId !== 'string') throw new Error('Invalid token');

  return { clientId: payload.clientId, email: payload.email as string };
}
