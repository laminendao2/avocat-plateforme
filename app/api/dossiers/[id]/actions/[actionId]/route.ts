import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-firebase';
import { FieldValue } from 'firebase-admin/firestore';

type Params = { params: Promise<{ id: string; actionId: string }> };

const VALID_TYPES = ['consultation','audience','redaction','correspondance','recherche','note_interne','autre'];

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const claims = await verifySession();
    const { id: dossierId, actionId } = await params;

    const dossierDoc = await adminDb.collection('dossiers').doc(dossierId).get();
    if (!dossierDoc.exists || dossierDoc.data()?.avocatId !== claims.uid) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const update: Record<string, any> = {};

    if (typeof body.visibleClient === 'boolean') update.visibleClient = body.visibleClient;
    if (typeof body.visibleAssocies === 'boolean') update.visibleAssocies = body.visibleAssocies;
    if (typeof body.archived === 'boolean') update.archived = body.archived;

    if (body.type !== undefined) {
      if (!VALID_TYPES.includes(body.type)) return NextResponse.json({ error: "Type invalide" }, { status: 400 });
      update.type = body.type;
    }
    if (body.description !== undefined) update.description = body.description;
    if (body.heures !== undefined) update.heures = Number(body.heures);
    if (body.montant !== undefined) update.montant = Number(body.montant);

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 });
    }

    await adminDb
      .collection('dossiers').doc(dossierId)
      .collection('actions').doc(actionId)
      .update({ ...update, updatedAt: FieldValue.serverTimestamp() });

    // Return only serializable data (no FieldValue in the response)
    return NextResponse.json({ success: true, ...update, updatedAt: new Date().toISOString() });
  } catch (error: any) {
    if (error.message?.includes('session')) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    console.error('PATCH action error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const claims = await verifySession();
    const { id: dossierId, actionId } = await params;

    const dossierDoc = await adminDb.collection('dossiers').doc(dossierId).get();
    if (!dossierDoc.exists || dossierDoc.data()?.avocatId !== claims.uid) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    await adminDb.collection('dossiers').doc(dossierId).collection('actions').doc(actionId).delete();
    await adminDb.collection('dossiers').doc(dossierId).update({ updatedAt: FieldValue.serverTimestamp() });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes('session')) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
