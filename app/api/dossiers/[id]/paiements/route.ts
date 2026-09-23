import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-firebase';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

type Params = { params: Promise<{ id: string }> };

function serialize(id: string, data: FirebaseFirestore.DocumentData) {
  return {
    id,
    ...data,
    date: (data.date as Timestamp)?.toDate().toISOString() ?? new Date().toISOString(),
    createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() ?? null,
  };
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const claims = await verifySession();
    const { id } = await params;
    const dossierDoc = await adminDb.collection('dossiers').doc(id).get();
    if (!dossierDoc.exists) {
      return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
    }
    const dd = dossierDoc.data()!;
    const isOwner = dd.avocatId === claims.uid;
    const isAssocie = (dd.associes ?? []).includes(claims.uid);
    if (!isOwner && !isAssocie) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }
    const snap = await adminDb
      .collection('dossiers').doc(id)
      .collection('paiements')
      .orderBy('date', 'asc')
      .get();
    const allPaiements = snap.docs.map(d => serialize(d.id, d.data()));
    // Associés only see paiements where visibleAssocies !== false
    const paiements = isOwner
      ? allPaiements
      : allPaiements.filter((p: any) => p.visibleAssocies !== false);
    return NextResponse.json({ paiements });
  } catch (e: any) {
    if (e.message?.includes('session')) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const claims = await verifySession();
    const { id } = await params;
    const { montant, date, note } = await req.json();

    if (!montant || montant <= 0) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });

    const ref = await adminDb.collection('dossiers').doc(id).collection('paiements').add({
      montant: Number(montant),
      date: new Date(date || new Date()),
      note: note ?? '',
      createdBy: claims.uid,
      createdAt: FieldValue.serverTimestamp(),
      visibleClient: true,
      visibleAssocies: true,
    });

    return NextResponse.json({ id: ref.id }, { status: 201 });
  } catch (e: any) {
    if (e.message?.includes('session')) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
