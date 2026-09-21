import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-firebase';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET(_request: NextRequest) {
  try {
    const claims = await verifySession();
    const uid = claims.uid;

    const [clientsSnap, dossiersSnap, agendaSnap] = await Promise.all([
      adminDb.collection('clients').where('createdBy', '==', uid).get(),
      adminDb.collection('dossiers').where('avocatId', '==', uid).get(),
      adminDb
        .collection('agenda')
        .where('createdBy', '==', uid)
        .get(),
    ]);

    const totalClients = clientsSnap.size;
    const dossiers = dossiersSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.createdAt?.toDate?.() ?? 0) > (a.createdAt?.toDate?.() ?? 0) ? 1 : -1);
    const totalDossiers = dossiers.length;

    let enCours = 0, clotures = 0;
    const categorieCount: Record<string, number> = {};

    for (const d of dossiers as any[]) {
      if (d.statut === 'en_cours') enCours++;
      if (d.statut === 'cloture') clotures++;
      const cat = d.categorie ?? 'autre';
      categorieCount[cat] = (categorieCount[cat] ?? 0) + 1;
    }

    const parCategorie = Object.entries(categorieCount).map(([categorie, n]) => ({ categorie, n }));

    // Last 10 dossiers (already sorted desc)
    const dossiersRecents = (dossiers as any[]).slice(0, 10).map((d) => ({
      id: d.id,
      reference: d.reference,
      objet: d.objet,
      categorie: d.categorie,
      statut: d.statut,
      client_nom: d.client_nom ?? '',
      client_prenom: d.client_prenom ?? '',
    }));

    const now = new Date();
    const agendaProchain = agendaSnap.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          titre: data.titre,
          date_debut: (data.date_debut as Timestamp)?.toDate().toISOString() ?? null,
          type: data.type ?? '',
        };
      })
      .filter((e) => e.date_debut && new Date(e.date_debut) >= now)
      .sort((a, b) => (a.date_debut ?? '').localeCompare(b.date_debut ?? ''))
      .slice(0, 5);

    return NextResponse.json({
      totalClients,
      totalDossiers,
      enCours,
      clotures,
      parCategorie,
      dossiersRecents,
      agendaProchain,
    });
  } catch (error: any) {
    console.error('GET /api/stats error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
