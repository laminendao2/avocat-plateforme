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

    if (!doc.exists) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 });
    }

    const data = doc.data()!;
    // Never expose the password hash to the frontend — return a boolean instead
    const { portalPasswordHash, uid, ...safeData } = data;
    return NextResponse.json({
      id: doc.id,
      ...safeData,
      portalPasswordHash: !!(portalPasswordHash || uid), // true = portal access enabled
      createdAt: (data.createdAt as Timestamp)?.toDate().toISOString(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate().toISOString(),
    });
  } catch (error: any) {
    if (error.message?.includes('session')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    console.error('GET /api/clients/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await verifySession();
    const { id } = await params;

    const doc = await adminDb.collection('clients').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 });
    }

    const body = await request.json();

    // Prevent overwriting immutable fields
    const { id: _id, reference, createdAt, ...updateData } = body;

    await adminDb.collection('clients').doc(id).update({
      ...updateData,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const updated = await adminDb.collection('clients').doc(id).get();
    const data = updated.data()!;
    const { portalPasswordHash, uid, ...safeData } = data;
    return NextResponse.json({
      id: updated.id,
      ...safeData,
      portalPasswordHash: !!(portalPasswordHash || uid),
      createdAt: (data.createdAt as Timestamp)?.toDate().toISOString(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate().toISOString(),
    });
  } catch (error: any) {
    if (error.message?.includes('session')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    console.error('PUT /api/clients/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const claims = await verifySession();
    const { id } = await params;

    const doc = await adminDb.collection('clients').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 });
    }

    // Bloquer si le client a des dossiers existants
    const dossiersSnap = await adminDb.collection('dossiers')
      .where('clientId', '==', id)
      .limit(1)
      .get();
    if (!dossiersSnap.empty) {
      return NextResponse.json(
        { error: 'Impossible de supprimer : ce client a des dossiers associés. Supprimez d'abord les dossiers.' },
        { status: 409 }
      );
    }

    // Supprimer l'accès portail Firebase Auth si existant
    const data = doc.data()!;
    if (data.uid) {
      try { await adminAuth.deleteUser(data.uid); } catch {}
    }

    // Supprimer le document client
    await adminDb.collection('clients').doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes('session')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    console.error('DELETE /api/clients/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const claims = await verifySession();
    const { id } = await params;

    const doc = await adminDb.collection('clients').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 });
    }

    // Ensure client belongs to this avocat
    if (doc.data()?.avocatId !== claims.uid) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Block deletion if the client has active dossiers
    const dossiersSnap = await adminDb.collection('dossiers')
      .where('clientId', '==', id)
      .limit(1)
      .get();
    if (!dossiersSnap.empty) {
      return NextResponse.json(
        { error: 'Ce client a des dossiers actifs. Supprimez-les d\'abord.' },
        { status: 409 }
      );
    }

    // Delete Firebase Auth user if exists
    const uid = doc.data()?.uid;
    if (uid) {
      try { await adminAuth.deleteUser(uid); } catch { /* already deleted */ }
    }

    await adminDb.collection('clients').doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes('session')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    console.error('DELETE /api/clients/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
