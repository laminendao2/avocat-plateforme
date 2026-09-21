import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-firebase';

const ADMIN_EMAILS = ['laminendao2@gmail.com', 'laminendao2@hotmail.com'];

async function requireAdmin() {
  const claims = await verifySession();
  const userDoc = await adminDb.collection('users').doc(claims.uid).get();
  const email = userDoc.data()?.email ?? claims.email ?? '';
  if (!ADMIN_EMAILS.includes(email)) {
    throw new Error('Accès refusé — administrateur requis');
  }
  return claims;
}

// GET — liste tous les avocats/assistants
export async function GET() {
  try {
    await requireAdmin();
    const snap = await adminDb
      .collection('users')
      .orderBy('createdAt', 'desc')
      .get();

    const users = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
    }));

    return NextResponse.json({ users });
  } catch (e: any) {
    const status = e.message?.includes('refusé') ? 403 : e.message?.includes('session') ? 401 : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}

// POST — créer un nouvel avocat
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { displayName, email, password, role } = await req.json();

    if (!email || !password || !displayName) {
      return NextResponse.json({ error: 'Nom, email et mot de passe requis' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 6 caractères' }, { status: 400 });
    }

    // Créer dans Firebase Auth
    const userRecord = await adminAuth.createUser({ email, password, displayName });

    // Créer dans Firestore
    await adminDb.collection('users').doc(userRecord.uid).set({
      email,
      displayName,
      role: role ?? 'avocat',
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, id: userRecord.uid });
  } catch (e: any) {
    if (e.code === 'auth/email-already-exists') {
      return NextResponse.json({ error: 'Un compte avec cet email existe déjà' }, { status: 409 });
    }
    const status = e.message?.includes('refusé') ? 403 : e.message?.includes('session') ? 401 : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}

// DELETE — supprimer un avocat
export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

    // Vérifier que ce n'est pas un admin
    const userDoc = await adminDb.collection('users').doc(id).get();
    const email = userDoc.data()?.email ?? '';
    if (ADMIN_EMAILS.includes(email)) {
      return NextResponse.json({ error: 'Impossible de supprimer un administrateur' }, { status: 403 });
    }

    await adminAuth.deleteUser(id);
    await adminDb.collection('users').doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (e: any) {
    const status = e.message?.includes('refusé') ? 403 : e.message?.includes('session') ? 401 : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
