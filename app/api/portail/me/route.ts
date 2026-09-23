import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyClientSession } from '@/lib/auth-firebase';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET() {
  try {
    const { clientId, email } = await verifyClientSession();

    const doc = await adminDb.collection('clients').doc(clientId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 });
    }

    const data = doc.data()!;
    return NextResponse.json({
      id: doc.id,
      nom: data.nom ?? '',
      prenom: data.prenom ?? '',
      email: data.email ?? email,
      telephone: data.telephone ?? '',
      adresse: data.adresse ?? '',
      typeClient: data.typeClient ?? 'particulier',
      entreprise: data.entreprise ?? '',
      reference: data.reference ?? '',
      photoURL: data.photoURL ?? null,
      createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() ?? null,
    });
  } catch (error: any) {
    if (error.message?.includes('session') || error.message?.includes('token')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    console.error('GET /api/portail/me error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
