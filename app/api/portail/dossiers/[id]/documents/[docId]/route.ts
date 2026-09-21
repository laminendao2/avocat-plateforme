import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { verifyClientSession } from '@/lib/auth-firebase';
import { Timestamp } from 'firebase-admin/firestore';

type Params = { params: Promise<{ id: string; docId: string }> };

const GRACE_PERIOD_MS = 30 * 60 * 1000; // 30 minutes

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { clientId } = await verifyClientSession();
    const { id: dossierId, docId } = await params;

    // Verify dossier belongs to this client
    const dossierDoc = await adminDb.collection('dossiers').doc(dossierId).get();
    if (!dossierDoc.exists || dossierDoc.data()?.clientId !== clientId) {
      return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
    }

    const docRef = adminDb
      .collection('dossiers')
      .doc(dossierId)
      .collection('documents')
      .doc(docId);

    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });
    }

    const data = docSnap.data()!;

    // Only client-uploaded docs can be deleted by the client
    if (!data.uploadedByClient || data.uploadedByClientId !== clientId) {
      return NextResponse.json({ error: 'Vous ne pouvez pas supprimer ce document' }, { status: 403 });
    }

    // Enforce 30-minute grace period
    const uploadedAt = (data.uploadedAt as Timestamp)?.toDate();
    if (!uploadedAt || Date.now() - uploadedAt.getTime() > GRACE_PERIOD_MS) {
      return NextResponse.json(
        { error: 'Le délai de suppression (30 minutes) est dépassé' },
        { status: 403 }
      );
    }

    // Delete from Storage
    if (data.storagePath) {
      try {
        await adminStorage.bucket().file(data.storagePath).delete();
      } catch {
        // File may already be gone
      }
    }

    await docRef.delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes('session') || error.message?.includes('client')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    console.error('DELETE /api/portail/dossiers/[id]/documents/[docId] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
