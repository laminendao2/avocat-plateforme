import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-firebase';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { isDriveConnected, getOrCreateDossierFolder, getAccessToken, uploadFileToDrive } from '@/lib/google-drive';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const claims = await verifySession();
    const { id } = await params;

    const dossierDoc = await adminDb.collection('dossiers').doc(id).get();
    if (!dossierDoc.exists) {
      return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
    }
    const dd = dossierDoc.data()!;
    const isOwner = dd.avocatId === claims.uid;
    const isAssocie = (dd.associes ?? []).includes(claims.uid);
    if (!isOwner && !isAssocie) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const docsSnapshot = await adminDb
      .collection('dossiers')
      .doc(id)
      .collection('documents')
      .orderBy('uploadedAt', 'desc')
      .get();

    const allDocs = docsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      uploadedAt: (doc.data().uploadedAt as Timestamp)?.toDate().toISOString(),
    }));

    // Associés only see documents where visibleAssocies !== false
    const documents = isOwner
      ? allDocs
      : allDocs.filter((d: any) => d.visibleAssocies !== false);

    return NextResponse.json({ documents });
  } catch (error: any) {
    if (error.message?.includes('session')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    console.error('GET /api/dossiers/[id]/documents error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const claims = await verifySession();
    const { id: dossierId } = await params;

    const dossierDoc = await adminDb.collection('dossiers').doc(dossierId).get();
    if (!dossierDoc.exists) {
      return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
    }
    const dd2 = dossierDoc.data()!;
    if (dd2.avocatId !== claims.uid && !(dd2.associes ?? []).includes(claims.uid)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const nom = formData.get('nom') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });
    }

    const MAX_SIZE_MB = 20;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `La taille maximale est ${MAX_SIZE_MB}MB` },
        { status: 413 }
      );
    }

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non autorisé. PDF, images et Word uniquement.' },
        { status: 415 }
      );
    }

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._À-ɏ-]/g, '_');
    const fileName = `${timestamp}_${sanitizedName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // ── Essayer Google Drive en priorité ──────────────────────────────────────
    const avocatUid: string = dd2.avocatId ?? claims.uid;
    let url: string;
    let driveFileId: string | null = null;
    let storagePath: string | null = null;
    let storageType: 'drive' | 'firebase' = 'firebase';

    if (await isDriveConnected(avocatUid)) {
      try {
        const dossierRef = dd2.reference ?? dossierId;
        const folderId = await getOrCreateDossierFolder(avocatUid, dossierRef, dossierId);
        const accessToken = await getAccessToken(avocatUid);
        const result = await uploadFileToDrive(accessToken, folderId, fileName, file.type, buffer);
        url = result.webViewLink;
        driveFileId = result.fileId;
        storageType = 'drive';
      } catch (driveErr) {
        console.warn('Drive upload échoué (avocat), fall-back Firebase :', driveErr);
        const fb = await uploadToFirebase(dossierId, fileName, file.type, buffer, claims.uid);
        url = fb.url;
        storagePath = fb.storagePath;
      }
    } else {
      const fb = await uploadToFirebase(dossierId, fileName, file.type, buffer, claims.uid);
      url = fb.url;
      storagePath = fb.storagePath;
    }

    // Store document metadata in Firestore sub-collection
    const docMeta: Record<string, any> = {
      nom: nom ?? file.name,
      nomOriginal: file.name,
      url,
      type: file.type,
      taille: file.size,
      storageType,
      uploadedBy: claims.uid,
      uploadedAt: FieldValue.serverTimestamp(),
      visibleClient: false,
      visibleAssocies: true,
    };
    if (driveFileId) docMeta.driveFileId = driveFileId;
    if (storagePath) docMeta.storagePath = storagePath;

    const metaRef = await adminDb
      .collection('dossiers')
      .doc(dossierId)
      .collection('documents')
      .add(docMeta);

    // Update dossier updatedAt
    await adminDb.collection('dossiers').doc(dossierId).update({
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      {
        id: metaRef.id,
        ...docMeta,
        uploadedAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message?.includes('session')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    console.error('POST /api/dossiers/[id]/documents error:', error);
    return NextResponse.json({ error: 'Erreur lors du téléversement' }, { status: 500 });
  }
}


// ─── Helper Firebase Storage fall-back ───────────────────────────────────────
async function uploadToFirebase(
  dossierId: string,
  fileName: string,
  contentType: string,
  buffer: Buffer,
  uid: string,
): Promise<{ url: string; storagePath: string }> {
  const storagePath = `dossiers/${dossierId}/${fileName}`;
  const bucket = adminStorage.bucket();
  const fileRef = bucket.file(storagePath);
  await fileRef.save(buffer, {
    metadata: { contentType, metadata: { uploadedBy: uid, dossierId } },
  });
  // Pas de makePublic() — accès via proxy authentifié uniquement
  return { url: storagePath, storagePath };
}
