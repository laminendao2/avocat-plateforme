import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-firebase';
import { Timestamp } from 'firebase-admin/firestore';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await verifySession();
    const { id } = await params;
    const doc = await adminDb.collection('agenda').doc(id).get();
    if (!doc.exists) return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 });
    await adminDb.collection('agenda').doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes('session')) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await verifySession();
    const { id } = await params;
    const doc = await adminDb.collection('agenda').doc(id).get();
    if (!doc.exists) return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 });

    const body = await request.json();
    const { id: _id, createdBy, createdAt, ...rest } = body;

    const updateData: any = { ...rest };
    if (updateData.date_debut) updateData.date_debut = new Date(updateData.date_debut);
    if (updateData.date_fin) updateData.date_fin = new Date(updateData.date_fin);

    await adminDb.collection('agenda').doc(id).update(updateData);

    const updated = (await adminDb.collection('agenda').doc(id).get()).data()!;
    return NextResponse.json({
      id,
      ...updated,
      date_debut: (updated.date_debut as Timestamp)?.toDate().toISOString() ?? null,
      date_fin: (updated.date_fin as Timestamp)?.toDate().toISOString() ?? null,
      createdAt: (updated.createdAt as Timestamp)?.toDate().toISOString() ?? null,
    });
  } catch (error: any) {
    if (error.message?.includes('session')) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
