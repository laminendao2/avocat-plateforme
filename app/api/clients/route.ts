import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-firebase';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

function generateClientRef(nom: string, prenom?: string): string {
  const base = (nom + (prenom ? prenom[0] : ''))
    .toUpperCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Z]/g, '')
    .slice(0, 8);
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  return `${base}${digits}`;
}

export async function GET(request: NextRequest) {
  try {
    const claims = await verifySession();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() ?? '';
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = parseInt(searchParams.get('limit') ?? '20', 10);

    let query = adminDb.collection('clients').orderBy('createdAt', 'desc');

    // Firestore doesn't support full-text search natively.
    // For basic name/email filtering, we fetch and filter in-memory.
    // For production, consider Algolia or Firestore's new vector search.
    const snapshot = await query.get();

    let clients = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: (doc.data().createdAt as Timestamp)?.toDate().toISOString(),
    }));

    clients = clients.filter((c: any) => c.createdBy === claims.uid);
    if (search) {
      clients = clients.filter(
        (c: any) =>
          c.nom?.toLowerCase().includes(search) ||
          c.prenom?.toLowerCase().includes(search) ||
          c.email?.toLowerCase().includes(search) ||
          c.reference?.toLowerCase().includes(search) ||
          c.telephone?.toLowerCase().includes(search) ||
          c.raison_sociale?.toLowerCase().includes(search)
      );
    }

    const total = clients.length;
    const offset = (page - 1) * limit;
    const paginated = clients.slice(offset, offset + limit);

    return NextResponse.json({
      clients: paginated,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    if (error.message?.includes('session')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    console.error('GET /api/clients error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const claims = await verifySession();

    const body = await request.json();
    const { nom, prenom, email, telephone, adresse, typeClient, entreprise, notes } = body;

    if (!nom || !prenom || !email) {
      return NextResponse.json(
        { error: 'Nom, prénom et email sont requis' },
        { status: 400 }
      );
    }

    // Check for duplicate email
    const existing = await adminDb
      .collection('clients')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!existing.empty) {
      return NextResponse.json(
        { error: 'Un client avec cet email existe déjà' },
        { status: 409 }
      );
    }

    const reference = generateClientRef(nom, prenom);

    const newClient = {
      nom,
      prenom,
      email,
      telephone: telephone ?? '',
      adresse: adresse ?? '',
      typeClient: typeClient ?? 'particulier',
      entreprise: entreprise ?? '',
      notes: notes ?? '',
      reference,
      createdBy: claims.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('clients').add(newClient);

    return NextResponse.json(
      { id: docRef.id, ...newClient, createdAt: new Date().toISOString() },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message?.includes('session')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    console.error('POST /api/clients error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
