// app/api/drive/disconnect/route.ts
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth-firebase';
import { disconnectDrive } from '@/lib/google-drive';

export async function POST() {
  try {
    const claims = await verifySession();
    await disconnectDrive(claims.uid);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
}
