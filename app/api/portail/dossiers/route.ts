import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyClientSession } from '@/lib/auth-firebase';
import { Timestamp } from 'firebase-admin/firestore';

function ser(id: string, d: any) {
  return { id, ...d,
    createdAt: (d.createdAt as Timestamp)?.toDate().toISOString() ?? null,
    updatedAt: (d.updatedAt as Timestamp)?.toDate().toISOString() ?? null,
    dateEcheance: d.dateEcheance ? (d.dateEcheance as Timestamp)?.toDate().toISOString() : null,
  };
}

export async function GET() {
  try {
    const { clientId } = await verifyClientSession();
    const snap = await adminDb.collection('dossiers').where('clientId', '==', clientId).get();
    const dossiers = snap.docs.map(d => ser(d.id, d.data()))
      .sort((a: any, b: any) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    return NextResponse.json({ dossiers });
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
}
