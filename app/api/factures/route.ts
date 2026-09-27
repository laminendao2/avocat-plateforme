import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getAuthClaims } from '@/lib/auth-utils';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET(req: NextRequest) {
  try {
    const claims = await getAuthClaims(req);
    if (!claims) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const statut = searchParams.get('statut');
    const dossierId = searchParams.get('dossierId');

    let query: any = adminDb.collection('factures').where('avocatId', '==', claims.uid).where('deleted', '!=', true);

    const snap = await query.get();
    let factures = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    // Filter deleted
    factures = factures.filter((f: any) => !f.deleted);

    // Filter by statut if provided
    if (statut) factures = factures.filter((f: any) => f.statut === statut);
    if (dossierId) factures = factures.filter((f: any) => f.dossierId === dossierId);

    // Enrich with client/dossier names
    const clientIds = [...new Set(factures.map((f: any) => f.clientId).filter(Boolean))];
    const dossierIds = [...new Set(factures.map((f: any) => f.dossierId).filter(Boolean))];

    const clientsMap: Record<string, string> = {};
    const dossiersMap: Record<string, string> = {};

    await Promise.all([
      ...clientIds.map(async (cid: any) => {
        const snap = await adminDb.collection('clients').doc(cid).get();
        if (snap.exists) {
          const d = snap.data() as any;
          clientsMap[cid] = d.nom || d.prenom ? `${d.prenom || ''} ${d.nom || ''}`.trim() : 'Client inconnu';
        }
      }),
      ...dossierIds.map(async (did: any) => {
        const snap = await adminDb.collection('dossiers').doc(did).get();
        if (snap.exists) {
          const d = snap.data() as any;
          dossiersMap[did] = d.titre || d.reference || 'Dossier sans titre';
        }
      }),
    ]);

    factures = factures.map((f: any) => ({
      ...f,
      clientNom: clientsMap[f.clientId] || '',
      dossierTitre: dossiersMap[f.dossierId] || '',
      dateEmission: f.dateEmission?.toDate?.()?.toISOString() ?? f.dateEmission ?? null,
      dateEcheance: f.dateEcheance?.toDate?.()?.toISOString() ?? f.dateEcheance ?? null,
      createdAt: f.createdAt?.toDate?.()?.toISOString() ?? f.createdAt ?? null,
    }));

    // Sort by creation desc
    factures.sort((a: any, b: any) => (b.createdAt || '') > (a.createdAt || '') ? 1 : -1);

    return NextResponse.json({ factures });
  } catch (err: any) {
    console.error('GET /api/factures error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const claims = await getAuthClaims(req);
    if (!claims) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const body = await req.json();
    const { dossierId, clientId, lignes, dateEmission, dateEcheance, notes, statut } = body;

    if (!clientId || !lignes?.length) {
      return NextResponse.json({ error: 'Client et lignes requis' }, { status: 400 });
    }

    // Generate reference
    const year = new Date().getFullYear();
    const countSnap = await adminDb.collection('factures').where('avocatId', '==', claims.uid).get();
    const count = countSnap.size + 1;
    const reference = `FAC-${year}-${String(count).padStart(4, '0')}`;

    const montantTotal = lignes.reduce((sum: number, l: any) => sum + (Number(l.quantite) * Number(l.prixUnitaire)), 0);

    const facture = {
      avocatId: claims.uid,
      dossierId: dossierId || null,
      clientId,
      reference,
      lignes: lignes.map((l: any) => ({
        description: l.description || '',
        quantite: Number(l.quantite) || 1,
        prixUnitaire: Number(l.prixUnitaire) || 0,
        total: Number(l.quantite) * Number(l.prixUnitaire),
      })),
      montantTotal,
      statut: statut || 'brouillon',
      dateEmission: dateEmission || new Date().toISOString(),
      dateEcheance: dateEcheance || null,
      notes: notes || '',
      deleted: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const ref = await adminDb.collection('factures').add(facture);
    return NextResponse.json({ id: ref.id, reference }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/factures error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
