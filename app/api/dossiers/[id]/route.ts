import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-firebase';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

type Params = { params: Promise<{ id: string }> };

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


async function hasAccess(dossierId: string, uid: string): Promise<{ doc: FirebaseFirestore.DocumentSnapshot; isOwner: boolean } | null> {
  const doc = await adminDb.collection('dossiers').doc(dossierId).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  const isOwner = data.avocatId === uid;
  const isAssocie = (data.associes ?? []).includes(uid);
  if (!isOwner && !isAssocie) return null;
  return { doc, isOwner };
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const claims = await verifySession();
    const { id } = await params;

    const access = await hasAccess(id, claims.uid);
    if (!access) {
      return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
    }
    const { doc } = access;

    // Also fetch the associated client
    const data = doc.data()!;
    let client = null;
    if (data.clientId) {
      const clientDoc = await adminDb.collection('clients').doc(data.clientId).get();
      if (clientDoc.exists) {
        client = { id: clientDoc.id, ...clientDoc.data() };
      }
    }

    // Enrich associes with user info (Firestore first, Firebase Auth fallback)
    const associeIds: string[] = data.associes ?? [];
    const associesData = await Promise.all(
      associeIds.map(async (uid) => {
        const u = await adminDb.collection('users').doc(uid).get();
        if (u.exists) {
          return { id: uid, displayName: u.data()?.displayName ?? u.data()?.email ?? uid, email: u.data()?.email ?? '' };
        }
        try {
          const authUser = await adminAuth.getUser(uid);
          return { id: uid, displayName: authUser.displayName ?? authUser.email ?? uid, email: authUser.email ?? '' };
        } catch {
          return { id: uid, displayName: uid, email: '' };
        }
      })
    );

    return NextResponse.json({ ...serializeDoc(doc.id, data), client, associesData, isOwner: access.isOwner });
  } catch (error: any) {
    if (error.message?.includes('session')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    console.error('GET /api/dossiers/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const claims = await verifySession();
    const { id } = await params;

    const doc = await adminDb.collection('dossiers').doc(id).get();
    if (!doc.exists || doc.data()?.avocatId !== claims.uid) {
      return NextResponse.json({ error: 'Dossier introuvable ou accès refusé' }, { status: 404 });
    }

    const body = await request.json();
    const { id: _id, reference, createdAt, ...updateData } = body;

    // Convert dateEcheance string to Date if provided
    if (updateData.dateEcheance) {
      updateData.dateEcheance = new Date(updateData.dateEcheance);
    }

    await adminDb.collection('dossiers').doc(id).update({
      ...updateData,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const updated = await adminDb.collection('dossiers').doc(id).get();
    return NextResponse.json(serializeDoc(updated.id, updated.data()!));
  } catch (error: any) {
    if (error.message?.includes('session')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    console.error('PUT /api/dossiers/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
