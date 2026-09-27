import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-firebase';
import { FieldValue } from 'firebase-admin/firestore';

async function getFacture(id: string, uid: string) {
  const ref = adminDb.collection('factures').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data() as any;
  if (data.avocatId !== uid || data.deleted) return null;
  return { ref, data };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const claims = await verifySession();
    

    const result = await getFacture(params.id, claims.uid);
    if (!result) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 });

    const { data } = result;

    // Enrich
    let clientNom = '';
    let dossierTitre = '';
    let clientAdresse = '';
    let clientEmail = '';
    let clientTel = '';

    if (data.clientId) {
      const cSnap = await adminDb.collection('clients').doc(data.clientId).get();
      if (cSnap.exists) {
        const cd = cSnap.data() as any;
        clientNom = cd.nom || cd.prenom ? `${cd.prenom || ''} ${cd.nom || ''}`.trim() : '';
        clientAdresse = cd.adresse || '';
        clientEmail = cd.email || '';
        clientTel = cd.telephone || cd.tel || '';
      }
    }
    if (data.dossierId) {
      const dSnap = await adminDb.collection('dossiers').doc(data.dossierId).get();
      if (dSnap.exists) {
        const dd = dSnap.data() as any;
        dossierTitre = dd.titre || dd.reference || '';
      }
    }

    return NextResponse.json({
      facture: {
        id: params.id,
        ...data,
        clientNom, dossierTitre, clientAdresse, clientEmail, clientTel,
        dateEmission: data.dateEmission?.toDate?.()?.toISOString() ?? data.dateEmission ?? null,
        dateEcheance: data.dateEcheance?.toDate?.()?.toISOString() ?? data.dateEcheance ?? null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt ?? null,
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const claims = await verifySession();
    

    const result = await getFacture(params.id, claims.uid);
    if (!result) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 });

    const body = await req.json();
    const { lignes, statut, dateEmission, dateEcheance, notes, dossierId, clientId } = body;

    const updates: any = { updatedAt: FieldValue.serverTimestamp() };
    if (lignes) {
      updates.lignes = lignes.map((l: any) => ({
        description: l.description || '',
        quantite: Number(l.quantite) || 1,
        prixUnitaire: Number(l.prixUnitaire) || 0,
        total: Number(l.quantite) * Number(l.prixUnitaire),
      }));
      updates.montantTotal = updates.lignes.reduce((s: number, l: any) => s + l.total, 0);
    }
    if (statut) updates.statut = statut;
    if (dateEmission !== undefined) updates.dateEmission = dateEmission;
    if (dateEcheance !== undefined) updates.dateEcheance = dateEcheance;
    if (notes !== undefined) updates.notes = notes;
    if (dossierId !== undefined) updates.dossierId = dossierId;
    if (clientId !== undefined) updates.clientId = clientId;

    await result.ref.update(updates);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const claims = await verifySession();
    

    const result = await getFacture(params.id, claims.uid);
    if (!result) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 });

    await result.ref.update({ deleted: true, updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
