import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { adminDb } from '@/lib/firebase-admin';

const CLIENT_COOKIE = 'client_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 14; // 14 days in seconds

function getJwtSecret(): Uint8Array {
  const secret = process.env.PORTAL_JWT_SECRET;
  if (!secret) throw new Error('PORTAL_JWT_SECRET not set');
  return new TextEncoder().encode(secret);
}

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();
  if (!email || !password)
    return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });

  // Find the client document by email.
  // Note: a client can have multiple documents (one per avocat) — we check all of them
  // and pick the first one that has portal access enabled (portalPasswordHash set).
  const snap = await adminDb.collection('clients').where('email', '==', email).get();
  if (snap.empty)
    return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 });

  // Find the client document with portal access and matching password
  let matchedClientId: string | null = null;
  for (const doc of snap.docs) {
    const data = doc.data();
    if (!data.portalPasswordHash) continue;
    const valid = await bcrypt.compare(password, data.portalPasswordHash);
    if (valid) {
      matchedClientId = doc.id;
      break;
    }
  }

  if (!matchedClientId)
    return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 });

  // Sign a JWT containing the clientId — no Firebase Auth involved
  const token = await new SignJWT({ clientId: matchedClientId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('14d')
    .setIssuedAt()
    .sign(getJwtSecret());

  const res = NextResponse.json({ success: true, clientId: matchedClientId });
  res.cookies.set(CLIENT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(CLIENT_COOKIE);
  return res;
}
