import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-firebase';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const claims = await verifySession();
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 });

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type)) return NextResponse.json({ error: 'Format non supporté' }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Fichier trop lourd (max 5 Mo)' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'png';
    const storagePath = `logos/${claims.uid}/cabinet.${ext}`;

    const bucket = adminStorage.bucket();
    const fileRef = bucket.file(storagePath);
    await fileRef.save(buffer, { metadata: { contentType: file.type } });
    await fileRef.makePublic();

    const logoUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}?t=${Date.now()}`;
    await adminDb.collection('settings').doc(claims.uid).set(
      { cabinetLogoUrl: logoUrl, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );

    return NextResponse.json({ cabinetLogoUrl: logoUrl });
  } catch (error: any) {
    if (error.message?.includes('session')) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
