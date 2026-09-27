import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-firebase';
import { FieldValue } from 'firebase-admin/firestore';

type Params = { params: Promise<{ type: string; id: string }> };

// RESTORE
export async function PUT(_request: NextRequest, { params }: Params) {
  try {
    const claims = await verifySession();
    const { type, id } = await params;
    const col = type === 'client' ? 'clients' : 'dossiers';
    const doc = await adminDb.collection(col).doc(id).get();
    if (!doc.exists) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

    const data = doc.data()!;
    const ownerField = type === 'client' ? 'createdBy' : 'avocatId';
    if (data[ownerField] !== claims.uid) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    await adminDb.collection(col).doc(id).update({
      deleted: FieldValue.delete(),
      deletedAt: FieldValue.delete(),
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes('session')) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PERMANENT DELETE
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const claims = await verifySession();
    const { type, id } = await params;
    const col = type === 'client' ? 'clients' : 'dossiers';
    const doc = await adminDb.collection(col).doc(id).get();
    if (!doc.exists) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

    const data = doc.data()!;
    const ownerField = type === 'client' ? 'createdBy' : 'avocatId';
    if (data[ownerField] !== claims.uid) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    if (type === 'dossier') {
      // Delete subcollections
      for (const sub of ['documents', 'actions', 'paiements', 'notes']) {
        const snap = await adminDb.collection('dossiers').doc(id).collection(sub).get();
        const batch = adminDb.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        if (!snap.empty) await batch.commit();
      }
    } else {
      // Delete Firebase Auth user if exists
      if (data.uid) {
        try { await adminAuth.deleteUser(data.uid); } catch { /* already gone */ }
      }
    }

    await adminDb.collection(col).doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes('session')) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
