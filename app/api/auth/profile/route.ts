import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-firebase';

export async function PUT(request: NextRequest) {
  try {
    const claims = await verifySession();
    const uid = claims.uid;
    const body = await request.json();

    // Update display name
    if (body.displayName !== undefined) {
      await adminAuth.updateUser(uid, { displayName: body.displayName });
      await adminDb.collection('users').doc(uid).update({ displayName: body.displayName });
      return NextResponse.json({ success: true });
    }

    // Change password: re-authenticate via REST API then update
    if (body.newPassword && body.currentPassword) {
      // Get user email
      const userRecord = await adminAuth.getUser(uid);
      const email = userRecord.email!;
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;

      // Re-authenticate to verify current password
      const reAuthRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: body.currentPassword, returnSecureToken: true }),
        }
      );
      if (!reAuthRes.ok) {
        return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 401 });
      }

      // Update password via Admin SDK
      await adminAuth.updateUser(uid, { password: body.newPassword });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
