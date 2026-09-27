import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-firebase';
import { Timestamp } from 'firebase-admin/firestore';

const DAYS_30 = 30 * 24 * 60 * 60 * 1000;

function toISO(ts: any) {
  if (!ts) return null;
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  return null;
}

export async function GET() {
  try {
    const claims = await verifySession();

    // Deleted clients
    const clientsSnap = await adminDb.collection('clients')
      .where('createdBy', '==', claims.uid)
      .where('deleted', '==', true)
      .get();

    // Deleted dossiers
    const dossiersSnap = await adminDb.collection('dossiers')
      .where('avocatId', '==', claims.uid)
      .where('deleted', '==', true)
      .get();

    const now = Date.now();

    const clients = clientsSnap.docs.map(doc => {
      const d = doc.data();
      const deletedAt = toISO(d.deletedAt);
      const age = deletedAt ? now - new Date(deletedAt).getTime() : 0;
      return {
        id: doc.id, type: 'client',
        label: d.type_personne === 'morale' ? d.raison_sociale : `${d.nom || ''} ${d.prenom || ''}`.trim(),
        reference: d.reference,
        deletedAt,
        expiresIn: Math.max(0, Math.ceil((DAYS_30 - age) / (24 * 60 * 60 * 1000))),
      };
    });

    const dossiers = dossiersSnap.docs.map(doc => {
      const d = doc.data();
      const deletedAt = toISO(d.deletedAt);
      const age = deletedAt ? now - new Date(deletedAt).getTime() : 0;
      return {
        id: doc.id, type: 'dossier',
        label: d.titre || d.objet || d.reference,
        reference: d.reference,
        deletedAt,
        expiresIn: Math.max(0, Math.ceil((DAYS_30 - age) / (24 * 60 * 60 * 1000))),
      };
    });

    return NextResponse.json({ items: [...clients, ...dossiers].sort((a, b) =>
      (b.deletedAt ?? '').localeCompare(a.deletedAt ?? '')) });
  } catch (error: any) {
    if (error.message?.includes('session')) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
