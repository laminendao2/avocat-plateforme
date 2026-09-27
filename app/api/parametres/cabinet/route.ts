import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-firebase';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET() {
  try {
    const claims = await verifySession();
    const doc = await adminDb.collection('settings').doc(claims.uid).get();
    const data = doc.data() || {};
    return NextResponse.json({
      cabinetNom: data.cabinetNom || 'Cabinet Juridique',
      cabinetLogoUrl: data.cabinetLogoUrl || null,
    });
  } catch {
    return NextResponse.json({ cabinetNom: 'Cabinet Juridique', cabinetLogoUrl: null });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const claims = await verifySession();
    const body = await request.json();
    const update: Record<string, any> = { updatedAt: FieldValue.serverTimestamp() };
    if (typeof body.cabinetNom === 'string') update.cabinetNom = body.cabinetNom.trim();
    if (typeof body.cabinetLogoUrl === 'string') update.cabinetLogoUrl = body.cabinetLogoUrl;
    await adminDb.collection('settings').doc(claims.uid).set(update, { merge: true });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes('session')) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
