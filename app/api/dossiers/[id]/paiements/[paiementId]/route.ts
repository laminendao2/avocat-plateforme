import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-firebase';
import { FieldValue } from 'firebase-admin/firestore';

type Params = { params: Promise<{ id: string; paiementId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const claims = await verifySession();
    const { id: dossierId, paiementId } = await params;

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
      .collection('paiements').doc(paiementId)
      .update({ ...update, updatedAt: FieldValue.serverTimestamp() });

    return NextResponse.json({ success: true, ...update });
  } catch (error: any) {
    if (error.message?.includes('session')) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await verifySession();
    const { id, paiementId } = await params;
    await adminDb.collection('dossiers').doc(id).collection('paiements').doc(paiementId).delete();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message?.includes('session')) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
