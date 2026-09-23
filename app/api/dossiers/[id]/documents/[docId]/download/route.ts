import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-firebase';
import { getAccessToken } from '@/lib/google-drive';

type Params = { params: Promise<{ id: string; docId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const claims = await verifySession();
    const { id: dossierId, docId } = await params;

    // Vérifier accès au dossier
    const dossierDoc = await adminDb.collection('dossiers').doc(dossierId).get();
    if (!dossierDoc.exists) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
    const dd = dossierDoc.data()!;
    if (dd.avocatId !== claims.uid && !(dd.associes ?? []).includes(claims.uid)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Récupérer le document
    const docSnap = await adminDb.collection('dossiers').doc(dossierId).collection('documents').doc(docId).get();
    if (!docSnap.exists) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });
    const doc = docSnap.data()!;

    // Firebase Storage : streamer via admin SDK (pas de redirection vers URL publique)
    if (doc.storageType !== 'drive' || !doc.driveFileId) {
      const storagePath = doc.storagePath ?? doc.url;
      const bucket = adminStorage.bucket();
      const fileRef = bucket.file(storagePath);
      const [buffer] = await fileRef.download();
      const contentType = doc.type ?? 'application/octet-stream';
      const fileName = encodeURIComponent(doc.nom ?? doc.nomOriginal ?? 'document');
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${fileName}"`,
          'Cache-Control': 'private, no-store',
        },
      });
    }

    // Proxy Drive : utiliser le token de l'avocat propriétaire
    const accessToken = await getAccessToken(dd.avocatId as string);
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${doc.driveFileId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!driveRes.ok) {
      return NextResponse.json({ error: 'Impossible de récupérer le fichier' }, { status: 502 });
    }

    const contentType = driveRes.headers.get('content-type') ?? doc.type ?? 'application/octet-stream';
    const fileName = encodeURIComponent(doc.nom ?? doc.nomOriginal ?? 'document');

    return new NextResponse(driveRes.body, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error: any) {
    if (error.message?.includes('session')) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    console.error('Drive proxy avocat error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
