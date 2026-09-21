import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-firebase';

// POST /api/admin/migrate-owner
// Attaches all orphan clients/dossiers/agenda to the calling avocat
export async function POST() {
  try {
    const claims = await verifySession();
    const uid = claims.uid;

    let clients = 0, dossiers = 0, agenda = 0;

    // Clients without createdBy
    const clientsSnap = await adminDb.collection('clients').get();
    for (const doc of clientsSnap.docs) {
      if (!doc.data().createdBy) {
        await doc.ref.update({ createdBy: uid });
        clients++;
      }
    }

    // Dossiers without avocatId
    const dossiersSnap = await adminDb.collection('dossiers').get();
    for (const doc of dossiersSnap.docs) {
      if (!doc.data().avocatId) {
        await doc.ref.update({ avocatId: uid });
        dossiers++;
      }
    }

    // Agenda without createdBy
    const agendaSnap = await adminDb.collection('agenda').get();
    for (const doc of agendaSnap.docs) {
      if (!doc.data().createdBy) {
        await doc.ref.update({ createdBy: uid });
        agenda++;
      }
    }

    return NextResponse.json({ success: true, clients, dossiers, agenda });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
