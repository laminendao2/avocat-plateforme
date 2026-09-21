import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-firebase';
import { FieldValue } from 'firebase-admin/firestore';

type Params = { params: Promise<{ id: string; docId: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await verifySession();
    const { id: dossierId, docId } = await params;

    const docRef = adminDb
      .collection('dossiers')
      .doc(dossierId)
      .collection('documents')
      .doc(docId);

    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });
    }

    const { storagePath } = docSnap.data()!;

    // Delete from Storage
    if (storagePath) {
      try {
        await adminStorage.bucket().file(storagePath).delete();
      } catch {
        // File may already be gone — continue
      }
    }

    // Delete Firestore record
    await docRef.delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes('session')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    console.error('DELETE /api/dossiers/[id]/documents/[docId] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH — toggle visibleClient / visibleAssocies (owner only)
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const claims = await verifySession();
    const { id: dossierId, docId } = await params;

    // Must be dossier owner
    const dossierDoc = await adminDb.collection('dossiers').doc(dossierId).get();
    if (!dossierDoc.exists || dossierDoc.data()?.avocatId !== claims.uid) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const update: Record<string, boolean> = {};
    if (typeof body.visibleClient === 'boolean') update.visibleClient = body.visibleClient;
    if (typeof body.visibleAssocies === 'boolean') update.visibleAssocies = body.visibleAssocies;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 });
    }

    await adminDb
      .collection('dossiers').doc(dossierId)
      .collection('documents').doc(docId)
      .update({ ...update, updatedAt: FieldValue.serverTimestamp() });

    return NextResponse.json({ success: true, ...update });
  } catch (error: any) {
    if (error.message?.includes('session')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
