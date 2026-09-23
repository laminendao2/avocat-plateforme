import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { verifyClientSession } from '@/lib/auth-firebase';

export async function POST(request: NextRequest) {
  try {
    const { clientId } = await verifyClientSession();

    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 });
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Format non supporté (JPG, PNG, WEBP, GIF)' }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop lourd (max 5 Mo)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
    const storagePath = `avatars/clients/${clientId}.${ext}`;

    const bucket = adminStorage.bucket();
    const fileRef = bucket.file(storagePath);
    await fileRef.save(buffer, {
      metadata: { contentType: file.type },
    });
    await fileRef.makePublic();

    const photoURL = `https://storage.googleapis.com/${bucket.name}/${storagePath}?t=${Date.now()}`;

    await adminDb.collection('clients').doc(clientId).set({ photoURL }, { merge: true });

    return NextResponse.json({ photoURL });
  } catch (error: any) {
    if (error.message?.includes('session') || error.message?.includes('token')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    console.error('Avatar upload error (client):', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
