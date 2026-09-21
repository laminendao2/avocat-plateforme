import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { createSessionCookie, SESSION_COOKIE_NAME, SESSION_DURATION_MS } from '@/lib/auth-firebase';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }

    // Use Firebase Auth REST API to sign in with email/password
    // (Server-side: can't use client SDK signInWithEmailAndPassword here)
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;
    const signInRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );

    if (!signInRes.ok) {
      const errorData = await signInRes.json();
      const firebaseError = errorData?.error?.message ?? 'Authentication failed';

      if (
        firebaseError === 'EMAIL_NOT_FOUND' ||
        firebaseError === 'INVALID_PASSWORD' ||
        firebaseError === 'INVALID_LOGIN_CREDENTIALS'
      ) {
        return NextResponse.json(
          { error: 'Email ou mot de passe incorrect' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: 'Erreur lors de la connexion' },
        { status: 401 }
      );
    }

    const { idToken, localId: uid } = await signInRes.json();

    // Create a session cookie valid for 14 days
    const sessionCookie = await createSessionCookie(idToken);

    // Fetch user profile from Firestore
    const userDoc = await adminDb.collection('users').doc(uid).get();
    const userProfile = userDoc.exists ? userDoc.data() : null;

    // Reject if user has no avocat profile (e.g. client portal accounts)
    if (!userProfile || !['avocat', 'admin', 'assistant'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Accès non autorisé. Utilisez le portail client pour vous connecter.' },
        { status: 403 }
      );
    }

    // Resolve any pending invitations for this email → auto-add as associé
    try {
      const pendingInvites = await adminDb
        .collection('invitations')
        .where('email', '==', email.toLowerCase())
        .where('status', '==', 'pending')
        .get();

      if (!pendingInvites.empty) {
        const batch = adminDb.batch();
        for (const inv of pendingInvites.docs) {
          const { dossierId } = inv.data();
          const dossierRef = adminDb.collection('dossiers').doc(dossierId);
          batch.update(dossierRef, {
            associes: FieldValue.arrayUnion(uid),
            updatedAt: FieldValue.serverTimestamp(),
          });
          batch.update(inv.ref, {
            status: 'resolved',
            resolvedUid: uid,
            resolvedAt: FieldValue.serverTimestamp(),
          });
        }
        await batch.commit();
      }
    } catch (inviteError) {
      // Non-fatal: log but don't block login
      console.error('Error resolving pending invitations:', inviteError);
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: uid,
        email: userProfile.email,
        displayName: userProfile.displayName,
        role: userProfile.role,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION_MS / 1000,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
