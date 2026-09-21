import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-firebase';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

type Categorie = 'creation_entreprise' | 'contentieux' | 'conseil_rh' | 'foncier';
type Statut = 'ouvert' | 'en_cours' | 'en_attente' | 'cloture';
type Priorite = 'normale' | 'urgente' | 'haute';

function generateDossierRef(clientNom: string): string {
  const base = clientNom
    .toUpperCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Z]/g, '')
    .slice(0, 8);
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  return `${base}${digits}`;
}

function serializeDoc(id: string, data: FirebaseFirestore.DocumentData) {
  return {
    id,
    ...data,
    createdAt: (data.createdAt as Timestamp)?.toDate().toISOString(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate().toISOString(),
    dateEcheance: data.dateEcheance
      ? (data.dateEcheance as Timestamp)?.toDate().toISOString()
      : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const claims = await verifySession();
    const { searchParams } = new URL(request.url);

    const statut = searchParams.get('statut') as Statut | null;
    const categorie = searchParams.get('categorie') as Categorie | null;
    const priorite = searchParams.get('priorite') as Priorite | null;
    const clientId = searchParams.get('clientId');
    const search = searchParams.get('search')?.toLowerCase() ?? '';

    // Build query — avoid composite index by using clientId-only query when filtering by client
    let query: FirebaseFirestore.Query = adminDb.collection('dossiers');

    if (clientId) {
      query = query.where('clientId', '==', clientId);
    } else {
      // No compound filters with orderBy to avoid composite index requirement
      // Filter in JS instead
      query = query.orderBy('createdAt', 'desc');
    }

    const snapshot = await query.get();

    const rawDossiers = snapshot.docs.map((doc) => serializeDoc(doc.id, doc.data()));

    // Fetch client names for all dossiers
    const clientIds = [...new Set(rawDossiers.map((d: any) => d.clientId).filter(Boolean))];
    const clientMap: Record<string, any> = {};
    await Promise.all(clientIds.map(async (cid: any) => {
      const cDoc = await adminDb.collection('clients').doc(cid).get();
      if (cDoc.exists) clientMap[cid] = cDoc.data();
    }));

    let dossiers = rawDossiers
      .map((d: any) => {
        const c = clientMap[d.clientId];
        return {
          ...d,
          clientNom: c ? (c.nom || c.raison_sociale || '') : '',
          clientPrenom: c ? (c.prenom || '') : '',
          clientTypePersonne: c ? (c.type_personne || '') : '',
          clientRaisonSociale: c ? (c.raison_sociale || '') : '',
        };
      })
      .sort((a: any, b: any) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));

    // Apply filters in JS (avoids composite index requirement)
    dossiers = dossiers.filter((d: any) => d.avocatId === claims.uid || (d.associes ?? []).includes(claims.uid));
    if (statut) dossiers = dossiers.filter((d: any) => d.statut === statut);
    if (categorie) dossiers = dossiers.filter((d: any) => d.categorie === categorie);
    if (priorite) dossiers = dossiers.filter((d: any) => d.priorite === priorite);

    if (search) {
      dossiers = dossiers.filter(
        (d: any) =>
          d.titre?.toLowerCase().includes(search) ||
          d.objet?.toLowerCase().includes(search) ||
          d.reference?.toLowerCase().includes(search) ||
          d.description?.toLowerCase().includes(search) ||
          d.clientNom?.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ dossiers, total: dossiers.length });
  } catch (error: any) {
    if (error.message?.includes('session')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    console.error('GET /api/dossiers error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const claims = await verifySession();
    const body = await request.json();

    const {
      titre,
      clientId,
      categorie,
      description,
      priorite,
      dateEcheance,
      montantHonoraires,
      avocatId,
    } = body;

    if (!titre || !clientId || !categorie) {
      return NextResponse.json(
        { error: 'Titre, clientId et catégorie sont requis' },
        { status: 400 }
      );
    }

    const validCategories: Categorie[] = [
      'creation_entreprise',
      'contentieux',
      'conseil_rh',
      'foncier',
    ];
    if (!validCategories.includes(categorie)) {
      return NextResponse.json({ error: 'Catégorie invalide' }, { status: 400 });
    }

    // Verify client exists
    const clientDoc = await adminDb.collection('clients').doc(clientId).get();
    if (!clientDoc.exists) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 });
    }

    const clientData = clientDoc.data()!;
    const clientNom = clientData.nom || clientData.raison_sociale || 'DOS';
    const reference = generateDossierRef(clientNom);

    const newDossier = {
      titre,
      clientId,
      categorie: categorie as Categorie,
      description: description ?? '',
      statut: 'ouvert' as Statut,
      priorite: (priorite ?? 'normale') as Priorite,
      reference,
      dateEcheance: dateEcheance ? new Date(dateEcheance) : null,
      montantHonoraires: montantHonoraires ?? 0,
      avocatId: avocatId ?? claims.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('dossiers').add(newDossier);

    return NextResponse.json(
      { id: docRef.id, ...newDossier, createdAt: new Date().toISOString() },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message?.includes('session')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    console.error('POST /api/dossiers error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
