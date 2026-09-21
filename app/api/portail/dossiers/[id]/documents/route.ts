import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { verifyClientSession } from '@/lib/auth-firebase';
import { FieldValue } from 'firebase-admin/firestore';

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
      // Client sees: docs marked visibleClient OR docs they uploaded themselves
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

    // Verify dossier belongs to this client
    const dossierDoc = await adminDb.collection('dossiers').doc(dossierId).get();
    if (!dossierDoc.exists || dossierDoc.data()?.clientId !== clientId) {
      return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const nom = formData.get('nom') as string | null;

    if (!file) return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `Taille maximale : ${MAX_SIZE_MB} Mo` }, { status: 413 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Type non autorisé. PDF, images et Word uniquement.' }, { status: 415 });
    }

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `dossiers/${dossierId}/client/${timestamp}_${sanitizedName}`;

    const bucket = adminStorage.bucket();
    const fileRef = bucket.file(storagePath);
    const buffer = Buffer.from(await file.arrayBuffer());

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: { uploadedByClientId: clientId, dossierId },
      },
    });

    await fileRef.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    const docMeta = {
      nom: nom ?? file.name,
      nomOriginal: file.name,
      storagePath,
      url: publicUrl,
      type: file.type,
      taille: file.size,
      uploadedByClient: true,
      uploadedByClientId: clientId,
      uploadedAt: FieldValue.serverTimestamp(),
      visibleClient: true,
      visibleAssocies: true,
    };

    const metaRef = await adminDb
      .collection('dossiers')
      .doc(dossierId)
      .collection('documents')
      .add(docMeta);

    await adminDb.collection('dossiers').doc(dossierId).update({
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      { id: metaRef.id, ...docMeta, uploadedAt: new Date().toISOString() },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message?.includes('session') || error.message?.includes('client')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    console.error('POST /api/portail/dossiers/[id]/documents error:', error);
    return NextResponse.json({ error: 'Erreur lors du téléversement' }, { status: 500 });
  }
}
