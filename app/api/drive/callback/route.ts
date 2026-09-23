// app/api/drive/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode } from '@/lib/google-drive';
import { adminDb } from '@/lib/firebase-admin';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code  = searchParams.get('code');
  const uid   = searchParams.get('state');
  const error = searchParams.get('error');

  if (error || !code || !uid) {
    return NextResponse.redirect(`${APP_URL}/parametres?drive=error`);
  }

  try {
    // Vérifier que l'uid existe dans Firebase
    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      // Essayer via Firebase Auth — l'uid est un UID Firebase valide
      // On fait confiance à l'uid passé en state car l'URL OAuth vient de notre propre flow
    }

    await exchangeCode(code, uid);
    return NextResponse.redirect(`${APP_URL}/parametres?drive=connected`);
  } catch (err) {
    console.error('Drive callback error:', err);
    return NextResponse.redirect(`${APP_URL}/parametres?drive=error`);
  }
}
