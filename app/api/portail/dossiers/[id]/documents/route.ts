// app/api/portail/dossiers/[id]/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { verifyClientSession } from '@/lib/auth-firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { isDriveConnected, getOrCreateDossierFolder, getAccessToken, uploadFileToDrive } from '@/lib/google-drive';

type Params = { params: Promise<{ id: string }> };

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_SIZE_MB = 20;

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { clientId } = await verifyClientSession();
    const { id: dossierId } = await params;

    const dossierDoc = await adminDb.collection('dossiers').doc(dossierId).get();
    if (!dossierDoc.exists || dossierDoc.data()?.clientId !== clientId) {
      return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
    }

    const snap = await adminDb
      .collection('dossiers').doc(dossierId)
      .collection('documents')
      .orderBy('uploadedAt', 'desc')
      .get();

    const documents = snap.docs
      .map(d => ({
        id: d.id,
        ...d.data(),
        uploadedAt: d.data().uploadedAt?.toDate?.()?.toISOString() ?? null,
      }))
      .filter((d: any) => d.visibleClient === true || d.uploadedByClient === true);

    return NextResponse.json({ documents });
  } catch (error: any) {
    if (error.message?.includes('session') || error.message?.includes('client')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { clientId } = await verifyClientSession();
    const { id: dossierId } = await params;

    // Vérifier que le dossier appartient au client
    const dossierDoc = await adminDb.collection('dossiers').doc(dossierId).get();
    if (!dossierDoc.exists || dossierDoc.data()?.clientId !== clientId) {
      return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
    }
    const dossierData = dossierDoc.data()!;
    const avocatUid: string | null = dossierData.createdBy ?? dossierData.avocatId ?? null;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const nom  = formData.get('nom') as string | null;

    if (!file) return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });
    if (file.size > MAX_SIZE_MB * 1024 * 1024)
      return NextResponse.json({ error: `Taille maximale : ${MAX_SIZE_MB} Mo` }, { status: 413 });
    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json({ error: 'Type non autorisé. PDF, images et Word uniquement.' }, { status: 415 });

    const timestamp    = Date.now();
    const sanitized    = file.name.replace(/[^a-zA-Z0-9._À-ɏ-]/g, '_');
    const fileName     = `${timestamp}_${sanitized}`;
    const buffer       = Buffer.from(await file.arrayBuffer());

    let url: string;
    let driveFileId: string | null = null;
    let storagePath: string | null = null;
    let storageType: 'drive' | 'firebase' = 'firebase';

    // ── Essayer Google Drive en priorité ──────────────────────────────────────
    if (avocatUid && await isDriveConnected(avocatUid)) {
      try {
        const dossierRef = dossierData.reference ?? dossierId;
        const folderId   = await getOrCreateDossierFolder(avocatUid, dossierRef, dossierId);
        const accessToken = await getAccessToken(avocatUid);
        const result = await uploadFileToDrive(accessToken, folderId, fileName, file.type, buffer);

        url         = result.webViewLink;
        driveFileId = result.fileId;
        storageType = 'drive';
      } catch (driveErr) {
        console.warn('Drive upload échoué, fall-back Firebase :', driveErr);
        // Fall-back → Firebase Storage
        const fallback = await uploadToFirebase(dossierId, fileName, file.type, buffer, clientId);
        url         = fallback.url;
        storagePath = fallback.storagePath;
      }
    } else {
      // Pas de Drive connecté → Firebase Storage
      const fallback = await uploadToFirebase(dossierId, fileName, file.type, buffer, clientId);
      url         = fallback.url;
      storagePath = fallback.storagePath;
    }

    // ── Métadonnées Firestore ─────────────────────────────────────────────────
    const docMeta: Record<string, any> = {
      nom:              nom ?? file.name,
      nomOriginal:      file.name,
      url,
      type:             file.type,
      taille:           file.size,
      storageType,
      uploadedByClient: true,
      uploadedByClientId: clientId,
      uploadedAt:       FieldValue.serverTimestamp(),
      visibleClient:    true,
      visibleAssocies:  true,
    };
    if (driveFileId) docMeta.driveFileId = driveFileId;
    if (storagePath) docMeta.storagePath  = storagePath;

    const metaRef = await adminDb
      .collection('dossiers').doc(dossierId)
      .collection('documents')
      .add(docMeta);

    await adminDb.collection('dossiers').doc(dossierId).update({
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      { id: metaRef.id, ...docMeta, uploadedAt: new Date().toISOString() },
      { status: 201 },
    );
  } catch (error: any) {
    if (error.message?.includes('session') || error.message?.includes('client')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    console.error('POST /api/portail/dossiers/[id]/documents error:', error);
    return NextResponse.json({ error: 'Erreur lors du téléversement' }, { status: 500 });
  }
}

// ─── Helper Firebase Storage fall-back ───────────────────────────────────────

async function uploadToFirebase(
  dossierId: string,
  fileName: string,
  contentType: string,
  buffer: Buffer,
  clientId: string,
): Promise<{ url: string; storagePath: string }> {
  const storagePath = `dossiers/${dossierId}/client/${fileName}`;
  const bucket  = adminStorage.bucket();
  const fileRef = bucket.file(storagePath);
  await fileRef.save(buffer, {
    metadata: { contentType, metadata: { uploadedByClientId: clientId, dossierId } },
  });
  await fileRef.makePublic();
  const url = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  return { url, storagePath };
}
