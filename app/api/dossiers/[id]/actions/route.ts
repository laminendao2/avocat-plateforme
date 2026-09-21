import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-firebase';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const claims = await verifySession();
    const { id } = await params;

    const dossierDoc = await adminDb.collection('dossiers').doc(id).get();
    if (!dossierDoc.exists) {
      return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
    }
    const dossierData = dossierDoc.data()!;
    const isOwner = dossierData.avocatId === claims.uid;
    const isAssocie = (dossierData.associes ?? []).includes(claims.uid);
    if (!isOwner && !isAssocie) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const actionsSnapshot = await adminDb
      .collection('dossiers')
      .doc(id)
      .collection('actions')
      .orderBy('createdAt', 'desc')
      .get();

    const allActions = actionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: (doc.data().createdAt as Timestamp)?.toDate().toISOString(),
    }));

    // Associés only see actions where visibleAssocies !== false
    const actions = isOwner
      ? allActions
      : allActions.filter((a: any) => a.visibleAssocies !== false);

    return NextResponse.json({ actions });
  } catch (error: any) {
    if (error.message?.includes('session')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    console.error('GET /api/dossiers/[id]/actions error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const claims = await verifySession();
    const { id } = await params;

    const dossierDoc = await adminDb.collection('dossiers').doc(id).get();
    if (!dossierDoc.exists) {
      return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
    }

    const body = await request.json();
    const { type, description, heures, montant } = body;

    if (!type || !description) {
      return NextResponse.json(
        { error: 'Type et description sont requis' },
        { status: 400 }
      );
    }

    const validTypes = [
      'consultation',
      'audience',
      'redaction',
      'correspondance',
      'recherche',
      'note_interne',
      'autre',
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Type d'action invalide" }, { status: 400 });
    }

    const newAction = {
      type,
      description,
      heures: heures ?? 0,
      montant: montant ?? 0,
      auteurId: claims.uid,
      createdAt: FieldValue.serverTimestamp(),
      visibleClient: false,
      visibleAssocies: true,
    };

    const actionRef = await adminDb
      .collection('dossiers')
      .doc(id)
      .collection('actions')
      .add(newAction);

    // Update the dossier's updatedAt timestamp
    await adminDb.collection('dossiers').doc(id).update({
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      {
        id: actionRef.id,
        ...newAction,
        createdAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message?.includes('session')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    console.error('POST /api/dossiers/[id]/actions error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
