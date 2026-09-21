import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { verifyClientSession } from '@/lib/auth-firebase';
import { Timestamp } from 'firebase-admin/firestore';

type P = { params: Promise<{ id: string }> };

function serTimestamp(v: any): string | null {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate().toISOString();
  return null;
}

function ser(id: string, d: any) {
  return {
    id,
    ...d,
    createdAt: serTimestamp(d.createdAt),
    updatedAt: serTimestamp(d.updatedAt),
    dateEcheance: serTimestamp(d.dateEcheance),
  };
}

async function getUserInfo(uid: string) {
  try {
    const u = await adminDb.collection('users').doc(uid).get();
    if (u.exists) {
      const data = u.data()!;
      return { id: uid, displayName: data.displayName ?? data.email ?? uid, email: data.email ?? '' };
    }
  } catch {}
  try {
    const authUser = await adminAuth.getUser(uid);
    return { id: uid, displayName: authUser.displayName ?? authUser.email ?? uid, email: authUser.email ?? '' };
  } catch {}
  return { id: uid, displayName: uid, email: '' };
}

export async function GET(_req: NextRequest, { params }: P) {
  try {
    const { clientId } = await verifyClientSession();
    const { id } = await params;

    const doc = await adminDb.collection('dossiers').doc(id).get();
    if (!doc.exists || doc.data()?.clientId !== clientId)
      return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

    const data = doc.data()!;

    // Équipe
    const avocatInfo = await getUserInfo(data.avocatId);
    const associesVisibleClient: boolean = data.associesVisibleClient !== false; // default true
    const equipe: any[] = [{ ...avocatInfo, role: 'Avocat principal' }];
    if (associesVisibleClient) {
      const associeIds: string[] = data.associes ?? [];
      const associesInfo = await Promise.all(associeIds.map(getUserInfo));
      equipe.push(...associesInfo.map(a => ({ ...a, role: 'Associé' })));
    }

    // Paiements — only visible to client
    const pSnap = await adminDb.collection('dossiers').doc(id).collection('paiements').orderBy('date', 'asc').get();
    const paiements = pSnap.docs
      .map(p => ({ id: p.id, ...p.data(), date: serTimestamp(p.data().date) }))
      .filter((p: any) => p.visibleClient === true);

    // Documents — visible to client OR uploaded by client
    const dSnap = await adminDb.collection('dossiers').doc(id).collection('documents').get();
    const documents = dSnap.docs
      .map(d => ({ id: d.id, ...d.data(), uploadedAt: serTimestamp(d.data().uploadedAt) }))
      .filter((d: any) => d.visibleClient === true || d.uploadedByClient === true);

    const result = { ...ser(doc.id, data), paiements, documents, equipe };
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('GET /api/portail/dossiers/[id] error:', error);
    if (error.message?.includes('session') || error.message?.includes('client')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
