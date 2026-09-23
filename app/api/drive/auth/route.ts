// app/api/drive/auth/route.ts
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth-firebase';
import { getAuthUrl } from '@/lib/google-drive';

export async function GET() {
  try {
    const claims = await verifySession();
    const url = getAuthUrl(claims.uid);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect('/login');
  }
}
