import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyClientSession } from '@/lib/auth-firebase';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET() {
  try {
    const { clientId } = await verifyClientSession();

    // Get all dossier IDs for this client
    const dossiersSnap = await adminDb.collection('dossiers').where('clientId', '==', clientId).get();
    const dossierIds = dossiersSnap.docs.map(d => d.id);

    // Get upcoming agenda events linked to those dossiers
    const snap = await adminDb.collection('agenda')
      .where('date_debut', '>=', new Date())
      .orderBy('date_debut', 'asc')
      .get();

    const events = snap.docs
      .map(d => ({
        id: d.id, ...d.data(),
        date_debut: (d.data().date_debut as Timestamp)?.toDate().toISOString() ?? null,
        date_fin: (d.data().date_fin as Timestamp)?.toDate().toISOString() ?? null,
      }))
      .filter((e: any) => e.dossier_id && dossierIds.includes(e.dossier_id));

    return NextResponse.json({ events });
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
}
