import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-firebase';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

function serializeEvent(id: string, data: FirebaseFirestore.DocumentData) {
  return {
    id,
    ...data,
    date_debut: (data.date_debut as Timestamp)?.toDate().toISOString() ?? data.date_debut,
    date_fin: (data.date_fin as Timestamp)?.toDate().toISOString() ?? data.date_fin ?? null,
    createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const claims = await verifySession();
    const { searchParams } = new URL(request.url);

    const mois = searchParams.get('mois'); // format YYYY-MM
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const dossierId = searchParams.get('dossierId');

    let query: FirebaseFirestore.Query = adminDb
      .collection('agenda')
      .orderBy('date_debut', 'asc');

    if (mois) {
      const [year, month] = mois.split('-').map(Number);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      query = query.where('date_debut', '>=', start).where('date_debut', '<', end);
    } else {
      if (from) query = query.where('date_debut', '>=', new Date(from));
      if (to) query = query.where('date_debut', '<=', new Date(to));
    }
    if (dossierId) query = query.where('dossier_id', '==', dossierId);

    const snapshot = await query.get();
    const events = snapshot.docs
      .map((doc) => serializeEvent(doc.id, doc.data()))
      .filter((e: any) => e.createdBy === claims.uid);

    return NextResponse.json({ events });
  } catch (error: any) {
    if (error.message?.includes('session')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    console.error('GET /api/agenda error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const claims = await verifySession();
    const body = await request.json();

    const { titre, description, date_debut, date_fin, type, dossier_id } = body;

    if (!titre || !date_debut || !type) {
      return NextResponse.json(
        { error: 'Titre, date de début et type sont requis' },
        { status: 400 }
      );
    }

    const newEvent = {
      titre,
      description: description ?? '',
      date_debut: new Date(date_debut),
      date_fin: date_fin ? new Date(date_fin) : null,
      type,
      dossier_id: dossier_id ?? null,
      createdBy: claims.uid,
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('agenda').add(newEvent);

    return NextResponse.json(
      {
        id: docRef.id,
        ...newEvent,
        date_debut: new Date(date_debut).toISOString(),
        date_fin: date_fin ? new Date(date_fin).toISOString() : null,
        createdAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message?.includes('session')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    console.error('POST /api/agenda error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
