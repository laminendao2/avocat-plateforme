import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-firebase';

export async function GET() {
  try {
    const claims = await verifySession();

    const snap = await adminDb
      .collection('users')
      .where('role', 'in', ['avocat', 'admin', 'assistant'])
      .get();

    const avocats = snap.docs
      .filter(doc => doc.id !== claims.uid) // exclude self
      .map(doc => ({
        id: doc.id,
        displayName: doc.data().displayName ?? doc.data().email,
        email: doc.data().email,
        role: doc.data().role,
      }));

    return NextResponse.json({ avocats });
  } catch (error: any) {
    if (error.message?.includes('session')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
