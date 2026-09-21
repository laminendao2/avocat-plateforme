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
  const snap = await adminDb.collection('users').where('email', '==', email).limit(1).get();
  if (!snap.empty) {
    const d = snap.docs[0];
    return { id: d.id, displayName: d.data().displayName ?? email, email: d.data().email };
  }
  try {
    const authUser = await adminAuth.getUserByEmail(email);
    return { id: authUser.uid, displayName: authUser.displayName ?? email, email: authUser.email ?? email };
  } catch {
    return null;
  }
}

// GET — list pending invitations for this dossier (owner only)
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const claims = await verifySession();
    const { id } = await params;

    const dossierDoc = await adminDb.collection('dossiers').doc(id).get();
    if (!dossierDoc.exists) {
      return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
    }
    const data = dossierDoc.data()!;
    const isOwner = data.avocatId === claims.uid;
    const isAssocie = (data.associes ?? []).includes(claims.uid);
    if (!isOwner && !isAssocie) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const snap = await adminDb
      .collection('invitations')
      .where('dossierId', '==', id)
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();

    const invitations = snap.docs.map((d) => ({
      id: d.id,
      email: d.data().email,
      createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? null,
    }));

    return NextResponse.json({ invitations });
  } catch (error: any) {
    if (error.message?.includes('session')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST — invite a confrère by email (creates pending invitation if no account)
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

    // Check if they already have a pending invitation for this dossier
    const existingInvite = await adminDb
      .collection('invitations')
      .where('dossierId', '==', id)
      .where('email', '==', email)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!existingInvite.empty) {
      return NextResponse.json({ error: 'Une invitation est déjà en attente pour cet email' }, { status: 400 });
    }

    // Check if they already have an account
    const target = await findUserByEmail(email);
    if (target) {
      // They exist! Add them directly as associate instead
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
      return NextResponse.json({ type: 'added', ...target });
    }

    // No account — store pending invitation
    const inviterDoc = await adminDb.collection('users').doc(claims.uid).get();
    const inviterName = inviterDoc.data()?.displayName ?? 'Un avocat';

    await adminDb.collection('invitations').add({
      dossierId: id,
      dossierTitre: dossier.data()?.titre ?? dossier.data()?.objet ?? id,
      email,
      invitedByUid: claims.uid,
      invitedByName: inviterName,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ type: 'invited', email });
  } catch (error: any) {
    if (error.message?.includes('session')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE — cancel a pending invitation (owner only)
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const claims = await verifySession();
    const { id } = await params;

    const dossier = await getOwnerDossier(id, claims.uid);
    if (!dossier) {
      return NextResponse.json({ error: 'Dossier introuvable ou accès refusé' }, { status: 404 });
    }

    const { invitationId } = await request.json();
    if (!invitationId) {
      return NextResponse.json({ error: 'invitationId requis' }, { status: 400 });
    }

    const invDoc = await adminDb.collection('invitations').doc(invitationId).get();
    if (!invDoc.exists || invDoc.data()?.dossierId !== id) {
      return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 });
    }

    await adminDb.collection('invitations').doc(invitationId).update({
      status: 'cancelled',
      cancelledAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes('session')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
