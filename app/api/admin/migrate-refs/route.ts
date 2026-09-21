import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-firebase';

function makeRef(nom: string): string {
  const base = nom
    .toUpperCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Z]/g, '')
    .slice(0, 8);
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  return `${base}${digits}`;
}

export async function POST(req: NextRequest) {
  try {
    await verifySession();

    // Migrate dossiers
    const dossiersSnap = await adminDb.collection('dossiers').get();
    const clientCache: Record<string, any> = {};
    let updated = 0;

    for (const doc of dossiersSnap.docs) {
      const data = doc.data();
      if (data.reference?.startsWith('DOS-')) {
        const clientId = data.clientId;
        if (!clientCache[clientId]) {
          const cDoc = await adminDb.collection('clients').doc(clientId).get();
          clientCache[clientId] = cDoc.exists ? cDoc.data() : null;
        }
        const client = clientCache[clientId];
        const nom = client?.nom || client?.raison_sociale || 'DOS';
        const newRef = makeRef(nom);
        await doc.ref.update({ reference: newRef });
        updated++;
      }
    }

    // Migrate clients
    const clientsSnap = await adminDb.collection('clients').get();
    let updatedClients = 0;
    for (const doc of clientsSnap.docs) {
      const data = doc.data();
      if (data.reference?.startsWith('CLT-')) {
        const nom = data.nom || data.raison_sociale || 'CLT';
        const newRef = makeRef(nom);
        await doc.ref.update({ reference: newRef });
        updatedClients++;
      }
    }

    return NextResponse.json({ success: true, dossiersUpdated: updated, clientsUpdated: updatedClients });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
