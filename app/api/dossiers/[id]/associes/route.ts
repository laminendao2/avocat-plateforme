import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-firebase';
import { FieldValue } from 'firebase-admin/firestore';

type Params = { params: Promise<{ id: string }> };

async function getOwnerDossier(dossierId: string, uid: string) {
  const doc = await adminDb.collection('dossiers').doc(dossierId).get();
  if (!doc.exists || doc.data()?.avocatId !== uid) return null;
  return doc;
}

async function findUserByEmail(email: string): Promise<{ id: string; displayName: string; email: string } | null> {
  // 1. Try Firestore users collection first
  const snap = await adminDb.collection('users').where('email', '==', email).limit(1).get();
  if (!snap.empty) {
    const d = snap.docs[0];
    return {
      id: d.id,
      displayName: d.data().displayName ?? d.data().email,
      email: d.data().email,
    };
  }

  // 2. Fallback: look up in Firebase Auth
  try {
    const authUser = await adminAuth.getUserByEmail(email);
    return {
      id: authUser.uid,
      displayName: authUser.displayName ?? authUser.email ?? email,
      email: authUser.email ?? email,
    };
  } catch {
    return null;
  }
}

// POST — add an associé by email (owner only)
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const claims = await verifySession();
    const { id } = await params;

    const dossier = await getOwnerDossier(id, claims.uid);
    if (!dossier) {
      return NextResponse.json({ error: 'Dossier introuvable ou accès refusé' }, { status: 404 });
    }

    const body = await request.json();
    const email = (body.email as string | undefined)?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const target = await findUserByEmail(email);
    if (!target) {
      return NextResponse.json(
        { error: `Aucun compte trouvé pour l'adresse ${email}` },
        { status: 404 }
      );
    }

    if (target.id === claims.uid) {
      return NextResponse.json({ error: 'Vous êtes déjà le titulaire de ce dossier' }, { status: 400 });
    }

    const existing: string[] = dossier.data()?.associes ?? [];
    if (existing.includes(target.id)) {
      return NextResponse.json({ error: 'Cet avocat est déjà associé à ce dossier' }, { status: 400 });
    }

    await adminDb.collection('dossiers').doc(id).update({
      associes: FieldValue.arrayUnion(target.id),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(target);
  } catch (error: any) {
    if (error.message?.includes('session')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE — remove an associé (owner only)
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const claims = await verifySession();
    const { id } = await params;

    const dossier = await getOwnerDossier(id, claims.uid);
    if (!dossier) {
      return NextResponse.json({ error: 'Dossier introuvable ou accès refusé' }, { status: 404 });
    }

    const { avocatId } = await request.json();
    if (!avocatId) {
      return NextResponse.json({ error: 'avocatId requis' }, { status: 400 });
    }

    await adminDb.collection('dossiers').doc(id).update({
      associes: FieldValue.arrayRemove(avocatId),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes('session')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
