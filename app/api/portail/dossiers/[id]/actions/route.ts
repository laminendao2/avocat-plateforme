import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyClientSession } from '@/lib/auth-firebase';
import { Timestamp } from 'firebase-admin/firestore';

type P = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: P) {
  try {
    const { clientId } = await verifyClientSession();
    const { id } = await params;

    const dossierDoc = await adminDb.collection('dossiers').doc(id).get();
    if (!dossierDoc.exists || dossierDoc.data()?.clientId !== clientId)
      return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

    const snap = await adminDb
      .collection('dossiers').doc(id)
      .collection('actions')
      .orderBy('createdAt', 'desc')
      .get();

    const actions = snap.docs
      .map(d => ({
        id: d.id, ...d.data(),
        createdAt: (d.data().createdAt as Timestamp)?.toDate().toISOString() ?? null,
      }))
      .filter((a: any) => a.visibleClient === true && !a.archived);

    return NextResponse.json({ actions });
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
}
