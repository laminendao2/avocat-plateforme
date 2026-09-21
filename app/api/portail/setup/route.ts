import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { adminDb } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-firebase';

export async function POST(req: NextRequest) {
  try {
    await verifySession();
    const { clientId, password } = await req.json();
    if (!clientId || !password) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: 'Mot de passe trop court (6 caractères minimum)' }, { status: 400 });

    const clientDoc = await adminDb.collection('clients').doc(clientId).get();
    if (!clientDoc.exists) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 });

    const client = clientDoc.data()!;
    if (!client.email) return NextResponse.json({ error: 'Le client doit avoir un email pour accéder au portail' }, { status: 400 });

    // Hash password and store it — no Firebase Auth account created.
    // This avoids any conflict when the same person is both a client and an avocat,
    // or when a client works with multiple avocats (multiple client documents).
    const portalPasswordHash = await bcrypt.hash(password, 12);
    await adminDb.collection('clients').doc(clientId).update({ portalPasswordHash });

    return NextResponse.json({ success: true, email: client.email });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await verifySession();
    const { clientId } = await req.json();
    if (!clientId) return NextResponse.json({ error: 'clientId requis' }, { status: 400 });

    const clientDoc = await adminDb.collection('clients').doc(clientId).get();
    if (!clientDoc.exists) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 });

    // Remove the hashed password — the client can no longer log in to the portal.
    // No Firebase Auth account is touched.
    await adminDb.collection('clients').doc(clientId).update({ portalPasswordHash: null });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}
