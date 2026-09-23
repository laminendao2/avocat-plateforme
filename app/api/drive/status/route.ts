// app/api/drive/status/route.ts
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth-firebase';
import { isDriveConnected } from '@/lib/google-drive';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const claims = await verifySession();
    const connected = await isDriveConnected(claims.uid);

    let connectedAt: string | null = null;
    if (connected) {
      const doc = await adminDb.collection('userDriveTokens').doc(claims.uid).get();
      const ts = doc.data()?.connectedAt;
      connectedAt = ts?.toDate?.()?.toISOString() ?? null;
    }

    return NextResponse.json({ connected, connectedAt });
  } catch {
    return NextResponse.json({ connected: false, connectedAt: null });
  }
}
