import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-firebase';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await verifySession();
    const { id } = await params;
    const doc = await adminDb.collection('clients').doc(id).get();
    if (!doc.exists) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 });
    const data = doc.data()!;
    const { portalPasswordHash, uid, ...safeData } = data;
    return NextResponse.json({
      id: doc.id, ...safeData,
      portalPasswordHash: !!(portalPasswordHash || uid),
      createdAt: (data.createdAt as Timestamp)?.toDate().toISOString(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate().toISOString(),
    });
  } catch (error: any) {
    if (error.message?.includes('session')) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await verifySession();
    const { id } = await params;
    const doc = await adminDb.collection('clients').doc(id).get();
    if (!doc.exists) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 });
    const body = await request.json();
    const { id: _id, reference, createdAt, ...updateData } = body;
    await adminDb.collection('clients').doc(id).update({ ...updateData, updatedAt: FieldValue.serverTimestamp() });
    const updated = await adminDb.collection('clients').doc(id).get();
    const data = updated.data()!;
    const { portalPasswordHash, uid, ...safeData } = data;
    return NextResponse.json({
      id: updated.id, ...safeData,
      portalPasswordHash: !!(portalPasswordHash || uid),
      createdAt: (data.createdAt as Timestamp)?.toDate().toISOString(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate().toISOString(),
    });
  } catch (error: any) {
    if (error.message?.includes('session')) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const claims = await verifySession();
    const { id } = await params;
    const doc = await adminDb.collection('clients').doc(id).get();
    if (!doc.exists) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 });

    // clients use createdBy (not avocatId)
    const data = doc.data()!;
    if (data.createdBy !== claims.uid) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const dossiersSnap = await adminDb.collection('dossiers')
      .where('clientId', '==', id)
      .get();
    const activeDossiers = dossiersSnap.docs.filter(d => !d.data().deleted);
    if (activeDossiers.length > 0) {
      return NextResponse.json(
        { error: "Ce client a des dossiers actifs. Archivez-les d'abord." },
        { status: 409 }
      );
    }

    // Soft delete — move to corbeille
    await adminDb.collection('clients').doc(id).update({
      deleted: true,
      deletedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes('session')) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    console.error('DELETE /api/clients/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
