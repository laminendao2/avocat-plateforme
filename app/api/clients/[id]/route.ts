import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
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
