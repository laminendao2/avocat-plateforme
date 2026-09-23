import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-firebase';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET() {
  try {
    const claims = await verifySession();

    // Tous les dossiers accessibles à l'utilisateur
    const snapshot = await adminDb.collection('dossiers').get();
    const dossiers = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as any))
      .filter(d => d.avocatId === claims.uid || (d.associes ?? []).includes(claims.uid));

    // Infos clients (nom, prenom, telephone)
    const clientIds = [...new Set(dossiers.map((d: any) => d.clientId).filter(Boolean))] as string[];
    const clientMap: Record<string, { nom: string; prenom: string; telephone: string }> = {};
    await Promise.all(clientIds.map(async (cid) => {
      const cDoc = await adminDb.collection('clients').doc(cid).get();
      if (cDoc.exists) {
        const c = cDoc.data()!;
        clientMap[cid] = {
          nom: c.nom ?? c.raison_sociale ?? '',
          prenom: c.prenom ?? '',
          telephone: c.telephone ?? c.tel ?? '',
        };
      }
    }));

    // Tous les documents de ces dossiers
    const allDocuments: any[] = [];
    await Promise.all(dossiers.map(async (dossier: any) => {
      const docsSnap = await adminDb
        .collection('dossiers').doc(dossier.id)
        .collection('documents')
        .orderBy('uploadedAt', 'desc')
        .get();
      const client = clientMap[dossier.clientId] ?? { nom: '', prenom: '', telephone: '' };
      const isOwner = dossier.avocatId === claims.uid;
      docsSnap.docs.forEach(doc => {
        const data = doc.data();
        if (!isOwner && data.visibleAssocies === false) return;
        allDocuments.push({
          id: doc.id,
          dossierId: dossier.id,
          dossierRef: dossier.reference ?? dossier.id,
          clientNom: client.nom,
          clientPrenom: client.prenom,
          clientTelephone: client.telephone,
          ...data,
          uploadedAt: (data.uploadedAt as Timestamp)?.toDate().toISOString() ?? null,
        });
      });
    }));

    allDocuments.sort((a, b) => {
      if (!a.uploadedAt) return 1;
      if (!b.uploadedAt) return -1;
      return b.uploadedAt.localeCompare(a.uploadedAt);
    });

    return NextResponse.json({ documents: allDocuments });
  } catch (error: any) {
    if (error.message?.includes('session')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    console.error('GET /api/documents error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
